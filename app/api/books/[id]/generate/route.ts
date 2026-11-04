import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getOpenAI } from "@/lib/openai";
import { checkTokens, deductTokens } from "@/lib/tokens";
import { TOKEN_COSTS } from "@/lib/types";
import { getStoryTemplate, type PageDefinition } from "@/lib/story-templates";
import { PRECISE_STYLE_DEFINITIONS, buildPagePrompt } from "@/lib/image-composite";

// Character from database
interface CharacterInput {
  id: string;
  name: string;
  character_type?: string;
  pet_type?: string;
  age?: number | null;
  generated_image_url?: string;
}

// Download image as buffer
async function downloadImage(url: string, label: string): Promise<Buffer> {
  console.log(`Downloading ${label}...`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`DEBUG: Failed to download ${label}. Status: ${response.status}, URL: ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length < 1000) {
    throw new Error(`DEBUG: ${label} is too small (${buffer.length} bytes). URL: ${url}`);
  }

  console.log(`${label}: ${buffer.length} bytes`);
  return buffer;
}

// Build character mapping for this page
function mapCharactersToSlots(
  characters: CharacterInput[],
  pageDefinition: PageDefinition
): { name: string; slot: number; role: string; action: string; age?: number | null; characterType?: string }[] {
  return pageDefinition.characters
    .slice(0, characters.length)
    .map((slot, index) => ({
      name: characters[index].name,
      slot: slot.slot,
      role: slot.role,
      action: slot.action,
      age: characters[index].age,
      characterType: characters[index].character_type,
    }));
}

// POST /api/books/[id]/generate - Generate cover page using image references
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the book
    const { data: book, error: fetchError } = await supabase
      .from("books")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    if (book.status === "generating") {
      return NextResponse.json(
        { error: "Generation already in progress" },
        { status: 400 }
      );
    }

    // Check tokens
    const tokenCost = TOKEN_COSTS.BOOK_COVER;
    const { hasEnough, balance } = await checkTokens(supabase, user.id, tokenCost);

    if (!hasEnough) {
      return NextResponse.json(
        {
          error: "Insufficient tokens",
          required: tokenCost,
          balance,
          message: `You need ${tokenCost} token for a book cover but only have ${balance}.`
        },
        { status: 402 }
      );
    }

    // Get generation params
    const body = await request.json().catch(() => ({}));
    const storySlug = body.storySlug || book.metadata?.storySlug;
    const artStyle = body.artStyle || book.metadata?.artStyle || "glow";
    const characterIds: string[] = body.characterIds || book.metadata?.characterIds || [];

    if (!storySlug) {
      return NextResponse.json({ error: "Missing story selection" }, { status: 400 });
    }

    // Get story template
    const template = getStoryTemplate(storySlug);
    if (!template) {
      return NextResponse.json({ error: `DEBUG: Unknown story template: ${storySlug}` }, { status: 400 });
    }

    // Get style definition
    const styleDetails = PRECISE_STYLE_DEFINITIONS[artStyle];
    if (!styleDetails) {
      return NextResponse.json({ error: `DEBUG: Unknown art style: ${artStyle}` }, { status: 400 });
    }

    // Enforce max 5 characters
    if (characterIds.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 characters allowed per book" },
        { status: 400 }
      );
    }

    if (characterIds.length === 0) {
      return NextResponse.json(
        { error: "At least one character is required" },
        { status: 400 }
      );
    }

    // Fetch characters - try with age column, fallback without if it doesn't exist
    let charData: CharacterInput[] | null = null;
    let charError: { message: string } | null = null;

    const { data: data1, error: error1 } = await supabase
      .from("characters")
      .select("id, name, character_type, pet_type, age, generated_image_url")
      .in("id", characterIds);

    if (error1?.message?.includes("age")) {
      // age column doesn't exist, try without it
      console.log("age column not found, fetching without it");
      const { data: data2, error: error2 } = await supabase
        .from("characters")
        .select("id, name, character_type, pet_type, generated_image_url")
        .in("id", characterIds);
      charData = data2;
      charError = error2;
    } else {
      charData = data1;
      charError = error1;
    }

    if (charError) {
      return NextResponse.json(
        { error: `DEBUG: Failed to fetch characters: ${charError.message}` },
        { status: 500 }
      );
    }

    const characters: CharacterInput[] = charData || [];

    // STRICT: All characters MUST have generated images
    const missingImages = characters.filter(c => !c.generated_image_url);
    if (missingImages.length > 0) {
      const names = missingImages.map(c => c.name).join(", ");
      return NextResponse.json(
        {
          error: `Character illustrations required: ${names}`,
          missingCharacters: missingImages.map(c => ({ id: c.id, name: c.name }))
        },
        { status: 400 }
      );
    }

    // Update status to generating
    await supabase
      .from("books")
      .update({ status: "generating" })
      .eq("id", id);

    const coverPage = template.coverPage;
    const characterMapping = mapCharactersToSlots(characters, coverPage);

    console.log("=== BOOK COVER GENERATION ===");
    console.log(`Story: ${template.title} (${storySlug})`);
    console.log(`Style: ${artStyle}`);
    console.log(`Protected characters: ${template.protectedCharacters?.join(", ") || "none"}`);
    console.log(`Characters (${characters.length}):`);
    characters.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name} -> Slot ${characterMapping[i]?.slot} (${characterMapping[i]?.role})`);
    });

    // Download master page (cover template) if available
    let masterPageBuffer: Buffer | null = null;
    if (coverPage.originalImageUrl) {
      masterPageBuffer = await downloadImage(
        coverPage.originalImageUrl,
        "Master page (cover template)"
      );
      console.log("Master page downloaded:", masterPageBuffer.length, "bytes");
    } else {
      console.log("No master page template - will generate scene from scratch");
    }

    // Download ALL character images (guest references)
    const characterImageBuffers: Buffer[] = [];
    for (const char of characters) {
      const buffer = await downloadImage(
        char.generated_image_url!,
        `Character "${char.name}"`
      );
      characterImageBuffers.push(buffer);
    }

    // Build the precision character replacement prompt
    const prompt = buildPagePrompt({
      sceneDescription: coverPage.sceneDescription,
      setting: coverPage.setting,
      characters: characterMapping,
      styleDetails,
      pageNumber: 0,
      totalPages: template.totalPages,
      protectedCharacters: template.protectedCharacters,
      maxSlots: 5,
    });

    console.log("\n=== PROMPT ===");
    console.log(prompt);
    console.log("=== END PROMPT ===\n");

    const openai = getOpenAI();
    const serviceClient = createServiceClient();

    // Build image array: IMAGE 1 = master page, IMAGES 2+ = guest characters
    const allImageFiles: File[] = [];

    // IMAGE 1: Master page (cover template) - if available
    if (masterPageBuffer) {
      const masterBlob = new Blob([new Uint8Array(masterPageBuffer)], { type: "image/png" });
      const masterFile = new File([masterBlob], "1-master-page.png", { type: "image/png" });
      allImageFiles.push(masterFile);
      console.log("IMAGE 1: Master page template");
    }

    // IMAGES 2+: Guest character references
    characterImageBuffers.forEach((buffer, index) => {
      const imageNum = masterPageBuffer ? index + 2 : index + 1;
      const blob = new Blob([new Uint8Array(buffer)], { type: "image/png" });
      const charName = characters[index].name.replace(/[^a-zA-Z0-9]/g, "-");
      const file = new File([blob], `${imageNum}-guest-${charName}.png`, { type: "image/png" });
      allImageFiles.push(file);
      console.log(`IMAGE ${imageNum}: Guest "${characters[index].name}"`);
    });

    // Call OpenAI images.edit
    // Using gpt-image-2.5-sunburst (best model) with high quality
    // Low resolution, JPEG output format
    console.log("\nCalling OpenAI images.edit...");
    console.log("Settings: model=gpt-image-2.5-sunburst, size=1024x1024, quality=high, output=jpeg");
    console.log(`Total images: ${allImageFiles.length}`);

    const response = await openai.images.edit({
      model: "gpt-image-2.5-sunburst",
      image: allImageFiles.length === 1 ? allImageFiles[0] : allImageFiles,
      prompt,
      n: 1,
      size: "1024x1024", // Low res
      quality: "high", // Best quality
      output_format: "jpeg", // JPEG format
    });

    const imageData = response.data?.[0];
    let outputBuffer: Buffer | null = null;

    if (imageData?.b64_json) {
      outputBuffer = Buffer.from(imageData.b64_json, "base64");
    } else if (imageData?.url) {
      const imgResponse = await fetch(imageData.url);
      if (!imgResponse.ok) {
        throw new Error(`DEBUG: Failed to download generated image. Status: ${imgResponse.status}`);
      }
      outputBuffer = Buffer.from(await imgResponse.arrayBuffer());
    }

    if (!outputBuffer) {
      throw new Error("DEBUG: OpenAI returned no image data");
    }

    console.log(`Cover generated: ${outputBuffer.length} bytes`);

    // Upload to storage (JPEG format)
    const fileName = `${user.id}/${id}/cover.jpg`;
    const { error: uploadError } = await serviceClient.storage
      .from("previews")
      .upload(fileName, outputBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`DEBUG: Storage upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = serviceClient.storage
      .from("previews")
      .getPublicUrl(fileName);

    console.log("Cover uploaded:", publicUrl);

    const generatedPages = [{
      page_number: 0,
      url: publicUrl,
      title: coverPage.title,
    }];

    // Update book
    const { data: updatedBook, error: updateError } = await supabase
      .from("books")
      .update({
        preview_pages: generatedPages,
        status: "preview_ready",
        metadata: {
          ...book.metadata,
          storySlug,
          artStyle,
          characterIds,
          characterCount: characters.length,
          characterMapping,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`DEBUG: Book update failed: ${updateError.message}`);
    }

    // Deduct tokens
    const deductResult = await deductTokens(
      supabase,
      user.id,
      tokenCost,
      "book_cover",
      id,
      `Cover: "${template.title}" (${characters.length} characters)`
    );

    return NextResponse.json({
      book: updatedBook,
      pages: generatedPages,
      tokensUsed: tokenCost,
      tokensRemaining: deductResult.newBalance,
    });
  } catch (error) {
    console.error("=== GENERATION ERROR ===");
    console.error(error);

    // Update status to failed
    await supabase
      .from("books")
      .update({ status: "failed" })
      .eq("id", id);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
