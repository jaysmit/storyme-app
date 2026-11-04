import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getOpenAI, artStylePrompts } from "@/lib/openai";
import { checkTokens, deductTokens } from "@/lib/tokens";
import { TOKEN_COSTS } from "@/lib/types";

// Cover scene templates for each story
const storyCoverScenes: Record<string, { title: string; scene: string; setting: string }> = {
  "dragon-castle-valley": {
    title: "The Dragon of Castle Valley",
    scene: "Standing at the edge of a mystical valley, gazing at a magnificent glowing castle on a distant hilltop. A friendly golden dragon soars overhead against a sunset sky.",
    setting: "magical valley with rolling hills, ancient trees, and a luminous castle in the distance",
  },
  "fairy-glade": {
    title: "The Fairy Glade",
    scene: "Entering an enchanted forest glade filled with glowing fireflies and tiny fairy houses nestled in giant mushrooms. Sparkles of magic dust float in the moonlit air.",
    setting: "moonlit forest clearing with bioluminescent plants, oversized mushrooms, and floating lights",
  },
  "grand-final-day": {
    title: "Grand Final Day",
    scene: "Standing proudly on a sunlit sports field, championship trophy gleaming nearby, colorful confetti falling from a bright blue sky. The stadium crowd cheers in the background.",
    setting: "bright sports stadium with green grass field, cheering crowds, and celebratory atmosphere",
  },
  "cloud-ship": {
    title: "Captain of the Cloud Ship",
    scene: "At the helm of a magnificent flying galleon sailing through fluffy white clouds. Rainbows arc in the distance and golden sunlight bathes everything in warmth.",
    setting: "sky above the clouds with a fantastical flying ship, billowing sails, and endless blue sky",
  },
  "super-squad": {
    title: "The Super Squad",
    scene: "Standing heroically on a rooftop overlooking a colorful city skyline at golden hour. Capes flutter in the breeze as they prepare to save the day.",
    setting: "vibrant city skyline at sunset, rooftop vantage point with dramatic lighting",
  },
  "galaxy-road-trip": {
    title: "The Great Galaxy Road Trip",
    scene: "Inside a retro-futuristic rocket ship cockpit, looking out at a dazzling galaxy filled with colorful planets, sparkling stars, and swirling nebulae.",
    setting: "outer space with colorful planets, stars, and a cozy spacecraft interior",
  },
};

// Default cover for unknown stories
const defaultCoverScene = {
  title: "A Magical Adventure",
  scene: "Standing at the beginning of an exciting adventure, surrounded by wonder and possibility.",
  setting: "magical landscape with warm, inviting atmosphere",
};

// Character type for generation
interface CharacterInput {
  id: string;
  name: string;
  physical_description?: string;
  character_type?: string;
  pet_type?: string;
  generated_image_url?: string;
  original_photo_url?: string;
}

// Build character description for prompt based on count
function buildCharacterSection(characters: CharacterInput[]): string {
  if (characters.length === 0) {
    return "Show friendly, diverse children as the main characters.";
  }

  const descriptions = characters.map((c, index) => {
    const role = index === 0 ? "the main hero" : index === 1 ? "the loyal companion" : "a supporting friend";

    if (c.physical_description) {
      return `- ${c.name} (${role}): ${c.physical_description}`;
    }

    if (c.character_type === "pet") {
      return `- ${c.name} (${role}): A friendly, adorable ${c.pet_type || "pet"} companion`;
    }

    return `- ${c.name} (${role}): A warm, friendly character`;
  });

  const names = characters.map(c => c.name);
  const nameList = names.length === 1
    ? names[0]
    : names.length === 2
      ? `${names[0]} and ${names[1]}`
      : `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;

  return `**CHARACTERS (must appear in this exact order of prominence):**
${descriptions.join("\n")}

Feature ${nameList} prominently in the center of the image, posed heroically and ready for adventure.
${characters.length === 1 ? "The single character should be the clear focal point." : ""}
${characters.length === 2 ? "Both characters should be side by side, equally featured." : ""}
${characters.length >= 3 ? "Arrange characters in a dynamic group composition with the main hero slightly forward." : ""}`;
}

// POST /api/books/[id]/generate - Generate cover page
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

    // Check if already generating
    if (book.status === "generating") {
      return NextResponse.json(
        { error: "Generation already in progress" },
        { status: 400 }
      );
    }

    // Check if user has enough tokens (1 token for cover)
    const tokenCost = TOKEN_COSTS.BOOK_COVER;
    const { hasEnough, balance } = await checkTokens(supabase, user.id, tokenCost);

    if (!hasEnough) {
      return NextResponse.json(
        {
          error: "Insufficient tokens",
          required: tokenCost,
          balance,
          message: `You need ${tokenCost} token for a book cover but only have ${balance}. Purchase more tokens to continue.`
        },
        { status: 402 }
      );
    }

    // Get generation params from request or book metadata
    const body = await request.json().catch(() => ({}));
    const storySlug = body.storySlug || book.metadata?.storySlug;
    const artStyle = body.artStyle || book.metadata?.artStyle || "glow";
    const characterIds: string[] = body.characterIds || book.metadata?.characterIds || [];

    if (!storySlug) {
      return NextResponse.json(
        { error: "Missing story selection" },
        { status: 400 }
      );
    }

    // Fetch full character data including generated images
    let characters: CharacterInput[] = [];
    if (characterIds.length > 0) {
      const { data: charData } = await supabase
        .from("characters")
        .select("id, name, physical_description, character_type, pet_type, generated_image_url, original_photo_url")
        .in("id", characterIds);
      characters = charData || [];
    }

    // Update status to generating
    await supabase
      .from("books")
      .update({ status: "generating" })
      .eq("id", id);

    // Get cover scene for this story
    const coverScene = storyCoverScenes[storySlug] || defaultCoverScene;
    const styleModifier = artStylePrompts[artStyle] || artStylePrompts.glow;

    // Build the cover prompt
    const characterSection = buildCharacterSection(characters);

    const coverPrompt = `# STORYBOOK COVER ILLUSTRATION

Create a stunning children's book cover illustration for "${coverScene.title}".

## SCENE
${coverScene.scene}

## SETTING
${coverScene.setting}

## CHARACTERS
${characterSection}

## ART STYLE
${styleModifier}

## COMPOSITION REQUIREMENTS
- **Format**: Book cover composition (portrait-friendly framing)
- **Focal point**: Characters should be the clear heroes of the image
- **Background**: Rich, detailed ${coverScene.setting}
- **Lighting**: Warm, magical, cinematic quality
- **Mood**: Exciting, adventurous, and inviting for children ages 4-10
- **Quality**: Premium children's book illustration, professional publishing quality

## IMPORTANT
- Characters must match their physical descriptions exactly
- Maintain consistent art style throughout
- Create a sense of wonder and adventure
- Make it feel like the opening to an amazing story
- No text or titles in the image`;

    const openai = getOpenAI();
    const serviceClient = createServiceClient();

    console.log(`Generating cover for book ${id}, story: ${storySlug}, style: ${artStyle}`);
    console.log(`Characters: ${characters.map(c => c.name).join(", ") || "none"}`);

    // Check if we have a character with a generated image to use as reference
    const characterWithImage = characters.find(c => c.generated_image_url);

    let imageBuffer: Buffer | null = null;

    if (characterWithImage?.generated_image_url) {
      // Use images.edit with character image as reference for consistency
      console.log(`Using ${characterWithImage.name}'s image as reference`);

      try {
        // Download the character's generated image
        const charImageResponse = await fetch(characterWithImage.generated_image_url);
        if (charImageResponse.ok) {
          const charImageBuffer = Buffer.from(await charImageResponse.arrayBuffer());
          const charImageBlob = new Blob([charImageBuffer], { type: "image/png" });
          const charImageFile = new File([charImageBlob], "character.png", { type: "image/png" });

          // Use images.edit to maintain character consistency
          const response = await openai.images.edit({
            model: "gpt-image-2",
            image: charImageFile,
            prompt: coverPrompt,
            n: 1,
            size: "1024x1024", // Square for cover
            quality: "high",
          });

          const imageData = response.data?.[0];
          if (imageData?.b64_json) {
            imageBuffer = Buffer.from(imageData.b64_json, "base64");
          } else if (imageData?.url) {
            const imgResponse = await fetch(imageData.url);
            imageBuffer = Buffer.from(await imgResponse.arrayBuffer());
          }
        }
      } catch (editError) {
        console.error("images.edit failed, falling back to generate:", editError);
      }
    }

    // Fallback to images.generate if edit didn't work or no character image
    if (!imageBuffer) {
      console.log("Using images.generate (no character reference)");

      const response = await openai.images.generate({
        model: "gpt-image-1.5",
        prompt: coverPrompt,
        n: 1,
        size: "1024x1024",
        quality: "high",
      });

      const imageData = response.data?.[0];
      if (imageData?.b64_json) {
        imageBuffer = Buffer.from(imageData.b64_json, "base64");
      } else if (imageData?.url) {
        const imgResponse = await fetch(imageData.url);
        imageBuffer = Buffer.from(await imgResponse.arrayBuffer());
      }
    }

    if (!imageBuffer) {
      throw new Error("Failed to generate cover image");
    }

    // Upload to storage
    const fileName = `${user.id}/${id}/cover.png`;
    const { error: uploadError } = await serviceClient.storage
      .from("previews")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to save cover image");
    }

    const { data: { publicUrl } } = serviceClient.storage
      .from("previews")
      .getPublicUrl(fileName);

    console.log("Cover generated successfully:", publicUrl);

    const generatedPages = [{
      page_number: 0,
      url: publicUrl,
      title: coverScene.title,
    }];

    // Update book with generated cover
    const { data: updatedBook, error: updateError } = await supabase
      .from("books")
      .update({
        preview_pages: generatedPages,
        status: "preview_ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Deduct tokens
    const deductResult = await deductTokens(
      supabase,
      user.id,
      tokenCost,
      "book_cover",
      id,
      `Generated cover for "${coverScene.title}"`
    );

    return NextResponse.json({
      book: updatedBook,
      pages: generatedPages,
      tokensUsed: tokenCost,
      tokensRemaining: deductResult.newBalance,
    });
  } catch (error) {
    console.error("Generation error:", error);

    // Update status to failed
    await supabase
      .from("books")
      .update({ status: "failed" })
      .eq("id", id);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate cover" },
      { status: 500 }
    );
  }
}
