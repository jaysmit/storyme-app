import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getOpenAI } from "@/lib/openai";
import { checkTokens, deductTokens } from "@/lib/tokens";
import { TOKEN_COSTS } from "@/lib/types";
import {
  loadBlueprint,
  loadBlueprintCover,
  buildPromptFromBlueprint,
  getOriginalImagePath,
  resolveBookId,
  type CrewAssignment,
  type BookBlueprint,
  type BlueprintPage,
} from "@/lib/book-blueprints";
import {
  downloadImage,
  loadLocalImage,
  selectOutputSize,
  type ProcessedImage,
} from "@/lib/image-processing";

// Character from database
interface CharacterInput {
  id: string;
  name: string;
  character_type?: string;
  pet_type?: string;
  age?: number | null;
  generated_image_url?: string;
}

// Map customer character type to crew slot type
function matchCharacterToSlotType(
  characterType: string | undefined,
  petType: string | undefined
): "adult" | "child" | "baby" | "dog" | "other" {
  if (characterType === "pet") {
    if (petType === "dog") return "dog";
    return "other";
  }
  if (characterType === "person") {
    // Default to child unless we have age info
    return "child";
  }
  return "other";
}

// Assign customer characters to crew slots based on type matching
function assignCharactersToSlots(
  characters: CharacterInput[],
  blueprint: BookBlueprint,
  page: BlueprintPage
): CrewAssignment[] {
  const assignments: CrewAssignment[] = [];
  const usedSlots = new Set<string>();
  const usedCharacters = new Set<string>();

  // Get available slots from the page's character placements
  const availableSlots = page.characterPlacements
    .map((placement) => {
      const slot = blueprint.characters.crewSlots.find(
        (s) => s.slotId === placement.slotId
      );
      return slot ? { placement, slot } : null;
    })
    .filter(Boolean) as { placement: typeof page.characterPlacements[0]; slot: typeof blueprint.characters.crewSlots[0] }[];

  // Sort slots by priority (required first, then by type preference)
  const sortedSlots = [...availableSlots].sort((a, b) => {
    if (a.slot.required && !b.slot.required) return -1;
    if (!a.slot.required && b.slot.required) return 1;
    return 0;
  });

  // First pass: exact type matching
  for (const character of characters) {
    if (usedCharacters.has(character.id)) continue;

    const charType = matchCharacterToSlotType(
      character.character_type,
      character.pet_type
    );

    // Find best matching slot
    for (const { slot } of sortedSlots) {
      if (usedSlots.has(slot.slotId)) continue;

      // Exact type match
      if (slot.characterType === charType) {
        assignments.push({
          slotId: slot.slotId,
          characterId: character.id,
          characterName: character.name,
          imageIndex: assignments.length + 2, // IMAGE 2, 3, 4...
        });
        usedSlots.add(slot.slotId);
        usedCharacters.add(character.id);
        break;
      }
    }
  }

  // Second pass: fill remaining characters into any available slot
  for (const character of characters) {
    if (usedCharacters.has(character.id)) continue;

    for (const { slot } of sortedSlots) {
      if (usedSlots.has(slot.slotId)) continue;

      assignments.push({
        slotId: slot.slotId,
        characterId: character.id,
        characterName: character.name,
        imageIndex: assignments.length + 2,
      });
      usedSlots.add(slot.slotId);
      usedCharacters.add(character.id);
      break;
    }
  }

  return assignments;
}

// POST /api/books/[id]/generate - Generate cover page using blueprint system
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
          message: `You need ${tokenCost} token for a book cover but only have ${balance}.`,
        },
        { status: 402 }
      );
    }

    // Get generation params
    const body = await request.json().catch(() => ({}));
    const rawBookId = body.bookId || book.metadata?.bookId || book.metadata?.storySlug;
    const characterIds: string[] =
      body.characterIds || book.metadata?.characterIds || [];

    if (!rawBookId) {
      return NextResponse.json(
        { error: "Missing book selection" },
        { status: 400 }
      );
    }

    // Resolve the book ID (handles old slugs like "dragon-castle-valley" -> "the-dragon-of-castle-valley")
    const bookId = resolveBookId(rawBookId);
    console.log(`Book ID resolved: "${rawBookId}" -> "${bookId}"`);

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

    // ============================================
    // Load book blueprint
    // ============================================
    let blueprint: BookBlueprint;
    let coverPage: BlueprintPage;

    try {
      blueprint = await loadBlueprint(bookId);
      coverPage = await loadBlueprintCover(bookId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      if (msg.includes("BLUEPRINT_NOT_FOUND")) {
        return NextResponse.json(
          {
            error: "BLUEPRINT_NOT_FOUND",
            message: `No blueprint found for book "${bookId}". Please ensure the book blueprint JSON exists.`,
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Validate cover has original image
    if (!coverPage.originalImage) {
      return NextResponse.json(
        {
          error: "MASTER_IMAGE_REQUIRED",
          message: `Book "${blueprint.title}" cover page has no original image configured.`,
        },
        { status: 400 }
      );
    }

    // Fetch characters from database
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
        { error: `Failed to fetch characters: ${charError.message}` },
        { status: 500 }
      );
    }

    const characters: CharacterInput[] = charData || [];

    // Validate all characters have generated images
    const missingImages = characters.filter((c) => !c.generated_image_url);
    if (missingImages.length > 0) {
      const names = missingImages.map((c) => c.name).join(", ");
      return NextResponse.json(
        {
          error: `Character illustrations required: ${names}`,
          missingCharacters: missingImages.map((c) => ({ id: c.id, name: c.name })),
        },
        { status: 400 }
      );
    }

    // Update status to generating
    await supabase.from("books").update({ status: "generating" }).eq("id", id);

    // ============================================
    // Assign characters to crew slots
    // ============================================
    const crewAssignments = assignCharactersToSlots(characters, blueprint, coverPage);

    console.log("=== BOOK COVER GENERATION (Blueprint System) ===");
    console.log(`Book: ${blueprint.title} (${bookId})`);
    console.log(`Visual Style: ${blueprint.visualStyle.substring(0, 50)}...`);
    console.log(`Original Image: ${coverPage.originalImage}`);
    console.log(`Dimensions: ${coverPage.composition.dimensions.width}x${coverPage.composition.dimensions.height}`);
    console.log(`\nCrew Assignments (${crewAssignments.length}):`);
    crewAssignments.forEach((a) => {
      console.log(`  ${a.slotId} -> "${a.characterName}" (IMAGE ${a.imageIndex})`);
    });
    console.log(`\nBook Characters (protected): ${blueprint.characters.bookCharacters.length}`);
    blueprint.characters.bookCharacters.forEach((c) => {
      console.log(`  - ${c.name}: ${c.description.substring(0, 50)}...`);
    });

    // ============================================
    // Load master page from local files
    // ============================================
    const masterImagePath = getOriginalImagePath(coverPage);
    let masterPage: ProcessedImage;

    try {
      masterPage = await loadLocalImage(masterImagePath, "Master page (cover)");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      if (msg.includes("MASTER_IMAGE_MISSING")) {
        await supabase.from("books").update({ status: "failed" }).eq("id", id);
        return NextResponse.json(
          {
            error: "MASTER_IMAGE_NOT_FOUND",
            message: `The master illustration for "${blueprint.title}" could not be loaded. File: ${masterImagePath}`,
          },
          { status: 500 }
        );
      }
      throw error;
    }

    // Download customer character images
    const characterImages: ProcessedImage[] = [];
    for (const assignment of crewAssignments) {
      const character = characters.find((c) => c.id === assignment.characterId);
      if (character?.generated_image_url) {
        const image = await downloadImage(
          character.generated_image_url,
          `Character "${character.name}"`
        );
        characterImages.push(image);
      }
    }

    // ============================================
    // Build prompt from blueprint
    // ============================================
    const prompt = buildPromptFromBlueprint(blueprint, coverPage, crewAssignments);

    console.log("\n=== PROMPT (first 500 chars) ===");
    console.log(prompt.substring(0, 500));
    console.log("...[truncated]");
    console.log("=== END PROMPT ===\n");

    const openai = getOpenAI();
    const serviceClient = createServiceClient();

    // ============================================
    // Build image array: IMAGE 1 = master, IMAGES 2+ = crew
    // ============================================
    const allImageFiles: File[] = [];

    // IMAGE 1: Master page (REQUIRED)
    const masterBlob = new Blob([new Uint8Array(masterPage.buffer)], {
      type: "image/png",
    });
    const masterFile = new File([masterBlob], "1-master-page.png", {
      type: "image/png",
    });
    allImageFiles.push(masterFile);
    console.log(
      `IMAGE 1: Master page (${masterPage.dimensions.width}x${masterPage.dimensions.height})`
    );

    // IMAGES 2+: Customer character references
    characterImages.forEach((image, index) => {
      const assignment = crewAssignments[index];
      const imageNum = index + 2;
      const blob = new Blob([new Uint8Array(image.buffer)], { type: "image/png" });
      const charName = assignment.characterName.replace(/[^a-zA-Z0-9]/g, "-");
      const file = new File([blob], `${imageNum}-crew-${charName}.png`, {
        type: "image/png",
      });
      allImageFiles.push(file);
      console.log(
        `IMAGE ${imageNum}: "${assignment.characterName}" -> ${assignment.slotId}`
      );
    });

    // ============================================
    // Determine output size based on original image
    // ============================================
    const outputSize = selectOutputSize(masterPage.dimensions);
    console.log(
      `\nOutput size: ${outputSize} (original: ${masterPage.dimensions.orientation})`
    );

    // ============================================
    // Call OpenAI images.edit
    // ============================================
    console.log("\nCalling OpenAI images.edit...");
    console.log(
      `Settings: model=gpt-image-2.5-sunburst, size=${outputSize}, quality=high, output=jpeg`
    );
    console.log(`Total images: ${allImageFiles.length}`);

    const response = await openai.images.edit({
      model: "gpt-image-2.5-sunburst",
      image: allImageFiles,
      prompt,
      n: 1,
      size: outputSize as "1024x1024" | "1536x1024" | "1024x1536",
      quality: "high",
      output_format: "jpeg",
    });

    const imageData = response.data?.[0];
    let outputBuffer: Buffer | null = null;

    if (imageData?.b64_json) {
      outputBuffer = Buffer.from(imageData.b64_json, "base64");
    } else if (imageData?.url) {
      const imgResponse = await fetch(imageData.url);
      if (!imgResponse.ok) {
        throw new Error(
          `Failed to download generated image. Status: ${imgResponse.status}`
        );
      }
      outputBuffer = Buffer.from(await imgResponse.arrayBuffer());
    }

    if (!outputBuffer) {
      throw new Error("OpenAI returned no image data");
    }

    console.log(`Cover generated: ${outputBuffer.length} bytes`);

    // Upload to storage
    const fileName = `${user.id}/${id}/cover.jpg`;
    const { error: uploadError } = await serviceClient.storage
      .from("previews")
      .upload(fileName, outputBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = serviceClient.storage.from("previews").getPublicUrl(fileName);

    console.log("Cover uploaded:", publicUrl);

    const generatedPages = [
      {
        page_number: 0,
        url: publicUrl,
        title: blueprint.title,
      },
    ];

    // ============================================
    // Update book with generation metadata
    // ============================================
    const { data: updatedBook, error: updateError } = await supabase
      .from("books")
      .update({
        preview_pages: generatedPages,
        status: "preview_ready",
        metadata: {
          ...book.metadata,
          bookId,
          blueprintVersion: blueprint.blueprintVersion,
          characterCount: characters.length,
          crewAssignments,
          outputSize,
          masterImageUrl: masterImagePath,
          generatedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Book update failed: ${updateError.message}`);
    }

    // Deduct tokens
    const deductResult = await deductTokens(
      supabase,
      user.id,
      tokenCost,
      "book_cover",
      id,
      `Cover: "${blueprint.title}" (${characters.length} characters)`
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
    await supabase.from("books").update({ status: "failed" }).eq("id", id);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
