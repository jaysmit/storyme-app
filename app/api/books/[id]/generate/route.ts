import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getOpenAI, artStylePrompts } from "@/lib/openai";
import { checkTokens, deductTokens } from "@/lib/tokens";
import { TOKEN_COSTS } from "@/lib/types";

// Character slot definition for each scene
interface CharacterSlot {
  slot: number; // 1-5, order of prominence (1 = main hero)
  role: string; // "Hero", "Sidekick", "Companion", etc.
  action: string; // What they're doing in this scene
  required: boolean; // If false, can be omitted with fewer crew members
}

// Page/Scene definition
interface SceneDefinition {
  page_number: number;
  title: string;
  scene: string;
  setting: string;
  characters: CharacterSlot[];
}

// Story template with all pages
interface StoryTemplate {
  slug: string;
  title: string;
  cover: SceneDefinition;
  pages: SceneDefinition[];
}

// All story templates with 5 character slots
const storyTemplates: Record<string, StoryTemplate> = {
  "dragon-castle-valley": {
    slug: "dragon-castle-valley",
    title: "The Dragon of Castle Valley",
    cover: {
      page_number: 0,
      title: "The Dragon of Castle Valley",
      scene: "The heroes stand at the edge of a mystical valley, gazing at a magnificent glowing castle on a distant hilltop. A friendly golden dragon soars overhead against a sunset sky.",
      setting: "magical valley with rolling hills, ancient trees, luminous castle in the distance, dramatic sunset sky",
      characters: [
        { slot: 1, role: "Hero", action: "standing boldly in front, pointing toward the castle", required: true },
        { slot: 2, role: "Brave Companion", action: "standing beside the hero, looking excited", required: false },
        { slot: 3, role: "Wise Guide", action: "holding a magical map, standing slightly behind", required: false },
        { slot: 4, role: "Loyal Friend", action: "carrying supplies, looking determined", required: false },
        { slot: 5, role: "Young Adventurer", action: "gazing up at the dragon in wonder", required: false },
      ],
    },
    pages: [], // To be filled when building full book
  },
  "fairy-glade": {
    slug: "fairy-glade",
    title: "The Fairy Glade",
    cover: {
      page_number: 0,
      title: "The Fairy Glade",
      scene: "The adventurers enter an enchanted forest glade filled with glowing fireflies and tiny fairy houses nestled in giant mushrooms. Sparkles of magic dust float in the moonlit air.",
      setting: "moonlit forest clearing with bioluminescent plants, oversized mushrooms, floating fairy lights, magical atmosphere",
      characters: [
        { slot: 1, role: "Curious Explorer", action: "reaching out to touch a glowing firefly", required: true },
        { slot: 2, role: "Wonder-Struck Friend", action: "looking up at floating fairies with amazement", required: false },
        { slot: 3, role: "Gentle Companion", action: "kneeling to look at a tiny fairy house", required: false },
        { slot: 4, role: "Excited Adventurer", action: "holding a jar to catch fairy dust", required: false },
        { slot: 5, role: "Quiet Observer", action: "standing back, taking in the magical scene", required: false },
      ],
    },
    pages: [],
  },
  "grand-final-day": {
    slug: "grand-final-day",
    title: "Grand Final Day",
    cover: {
      page_number: 0,
      title: "Grand Final Day",
      scene: "The team stands proudly on a sunlit sports field, championship trophy gleaming nearby, colorful confetti falling from a bright blue sky. The stadium crowd cheers in the background.",
      setting: "bright sports stadium with green grass field, cheering crowds, confetti, celebratory golden hour lighting",
      characters: [
        { slot: 1, role: "Team Captain", action: "holding the trophy high above their head", required: true },
        { slot: 2, role: "Star Player", action: "arms raised in victory, huge smile", required: false },
        { slot: 3, role: "Team Mate", action: "cheering with fists pumped", required: false },
        { slot: 4, role: "Supportive Player", action: "hugging a teammate in celebration", required: false },
        { slot: 5, role: "Youngest Player", action: "jumping with joy, covered in confetti", required: false },
      ],
    },
    pages: [],
  },
  "cloud-ship": {
    slug: "cloud-ship",
    title: "Captain of the Cloud Ship",
    cover: {
      page_number: 0,
      title: "Captain of the Cloud Ship",
      scene: "The crew stands on the deck of a magnificent flying galleon sailing through fluffy white clouds. Rainbows arc in the distance and golden sunlight bathes everything in warmth.",
      setting: "sky above the clouds, fantastical flying ship with billowing sails, endless blue sky, rainbows, golden sunlight",
      characters: [
        { slot: 1, role: "Ship Captain", action: "at the helm, hands on the wheel, looking heroic", required: true },
        { slot: 2, role: "First Mate", action: "standing beside the captain, telescope in hand", required: false },
        { slot: 3, role: "Navigator", action: "reading a magical floating map", required: false },
        { slot: 4, role: "Lookout", action: "pointing excitedly at a rainbow", required: false },
        { slot: 5, role: "Deckhand", action: "adjusting the sails with a rope", required: false },
      ],
    },
    pages: [],
  },
  "super-squad": {
    slug: "super-squad",
    title: "The Super Squad",
    cover: {
      page_number: 0,
      title: "The Super Squad",
      scene: "The superhero team stands heroically on a rooftop overlooking a colorful city skyline at golden hour. Capes flutter in the breeze as they prepare to save the day.",
      setting: "vibrant city skyline at sunset, rooftop vantage point, dramatic superhero lighting, dynamic atmosphere",
      characters: [
        { slot: 1, role: "Team Leader", action: "standing front and center, hands on hips, cape flowing", required: true },
        { slot: 2, role: "Flying Hero", action: "hovering slightly above, ready for action", required: false },
        { slot: 3, role: "Strong Hero", action: "flexing muscles, looking powerful", required: false },
        { slot: 4, role: "Speed Hero", action: "in a running pose, motion blur effect", required: false },
        { slot: 5, role: "Tech Hero", action: "holding a glowing gadget, looking smart", required: false },
      ],
    },
    pages: [],
  },
  "galaxy-road-trip": {
    slug: "galaxy-road-trip",
    title: "The Great Galaxy Road Trip",
    cover: {
      page_number: 0,
      title: "The Great Galaxy Road Trip",
      scene: "The crew looks out from inside a retro-futuristic rocket ship cockpit at a dazzling galaxy filled with colorful planets, sparkling stars, and swirling nebulae.",
      setting: "outer space with colorful planets, stars, nebulae, cozy spacecraft interior with glowing controls",
      characters: [
        { slot: 1, role: "Pilot", action: "at the controls, piloting through space", required: true },
        { slot: 2, role: "Co-Pilot", action: "pointing excitedly at a colorful planet", required: false },
        { slot: 3, role: "Navigator", action: "reading a holographic star map", required: false },
        { slot: 4, role: "Scientist", action: "looking through a telescope at stars", required: false },
        { slot: 5, role: "Space Tourist", action: "pressing face against the window in wonder", required: false },
      ],
    },
    pages: [],
  },
};

// Character from database
interface CharacterInput {
  id: string;
  name: string;
  character_type?: string;
  pet_type?: string;
  generated_image_url?: string;
}

// Build character mapping for the prompt
function buildCharacterPromptSection(
  characters: CharacterInput[],
  slots: CharacterSlot[]
): string {
  const activeSlots = slots.slice(0, Math.max(characters.length, 1));

  const characterMappings = activeSlots.map((slot, index) => {
    const char = characters[index];
    if (!char) return null;

    const charType = char.character_type === "pet"
      ? `(a ${char.pet_type || "pet"})`
      : "";

    return `- SLOT ${slot.slot} (${slot.role}): "${char.name}" ${charType} - ${slot.action}`;
  }).filter(Boolean);

  if (characterMappings.length === 0) {
    return "No characters assigned.";
  }

  return `**CHARACTERS IN THIS SCENE (in order of prominence):**
${characterMappings.join("\n")}

IMPORTANT: Each character MUST match their reference image exactly.
The characters are listed in order of visual prominence (Slot 1 = most prominent/foreground).
${characters.length < 5 ? `\nNote: Only ${characters.length} character(s) in this scene. Other character slots are not used.` : ""}`;
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
    const template = storyTemplates[storySlug];
    if (!template) {
      return NextResponse.json({ error: `Unknown story: ${storySlug}` }, { status: 400 });
    }

    // Enforce max 5 characters
    if (characterIds.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 characters allowed per book" },
        { status: 400 }
      );
    }

    // Fetch characters with their generated images
    let characters: CharacterInput[] = [];
    if (characterIds.length > 0) {
      const { data: charData, error: charError } = await supabase
        .from("characters")
        .select("id, name, character_type, pet_type, generated_image_url")
        .in("id", characterIds);

      if (charError) {
        return NextResponse.json(
          { error: `Failed to fetch characters: ${charError.message}` },
          { status: 500 }
        );
      }

      characters = charData || [];
    }

    // STRICT: All characters MUST have generated images
    const charactersWithoutImages = characters.filter(c => !c.generated_image_url);
    if (charactersWithoutImages.length > 0) {
      const names = charactersWithoutImages.map(c => c.name).join(", ");
      return NextResponse.json(
        {
          error: "Character images required",
          message: `The following characters need illustrations generated first: ${names}`,
          missingCharacters: charactersWithoutImages.map(c => ({ id: c.id, name: c.name }))
        },
        { status: 400 }
      );
    }

    // At least one character required
    if (characters.length === 0) {
      return NextResponse.json(
        { error: "At least one character is required to generate a book" },
        { status: 400 }
      );
    }

    // Update status to generating
    await supabase
      .from("books")
      .update({ status: "generating" })
      .eq("id", id);

    const coverScene = template.cover;
    const styleModifier = artStylePrompts[artStyle] || artStylePrompts.glow;
    const characterSection = buildCharacterPromptSection(characters, coverScene.characters);

    // Build the cover prompt
    const coverPrompt = `# STORYBOOK COVER ILLUSTRATION

Create a children's book cover for "${coverScene.title}".

## SCENE DESCRIPTION
${coverScene.scene}

## SETTING
${coverScene.setting}

## ${characterSection}

## ART STYLE
${styleModifier}

## REQUIREMENTS
- Book cover composition (portrait-friendly)
- Characters positioned according to their slot prominence
- Slot 1 character is the focal point in the foreground
- Rich, detailed background matching the setting
- Warm, magical, cinematic lighting
- Professional children's book quality
- No text or titles in the image

## CRITICAL
- Each character MUST look exactly like their reference image
- Maintain the same facial features, hair, and identifying characteristics
- Only include the ${characters.length} character(s) specified above`;

    const openai = getOpenAI();
    const serviceClient = createServiceClient();

    console.log(`Generating cover for book ${id}`);
    console.log(`Story: ${storySlug}, Style: ${artStyle}`);
    console.log(`Characters (${characters.length}): ${characters.map(c => c.name).join(", ")}`);

    // Use the first (main) character's image as reference
    const mainCharacter = characters[0];

    if (!mainCharacter.generated_image_url) {
      // This shouldn't happen due to earlier check, but safety first
      throw new Error(`DEBUG: Main character "${mainCharacter.name}" has no generated image URL`);
    }

    // Download the main character's image
    console.log(`Downloading reference image for ${mainCharacter.name}...`);
    const charImageResponse = await fetch(mainCharacter.generated_image_url);

    if (!charImageResponse.ok) {
      throw new Error(`DEBUG: Failed to download character image for "${mainCharacter.name}". Status: ${charImageResponse.status}, URL: ${mainCharacter.generated_image_url}`);
    }

    const charImageBuffer = Buffer.from(await charImageResponse.arrayBuffer());

    if (charImageBuffer.length < 1000) {
      throw new Error(`DEBUG: Character image for "${mainCharacter.name}" is too small (${charImageBuffer.length} bytes). URL: ${mainCharacter.generated_image_url}`);
    }

    console.log(`Reference image downloaded: ${charImageBuffer.length} bytes`);

    const charImageBlob = new Blob([charImageBuffer], { type: "image/png" });
    const charImageFile = new File([charImageBlob], "character.png", { type: "image/png" });

    // Use images.edit with character reference
    console.log("Calling OpenAI images.edit...");
    const response = await openai.images.edit({
      model: "gpt-image-2",
      image: charImageFile,
      prompt: coverPrompt,
      n: 1,
      size: "1024x1024",
      quality: "high",
    });

    const imageData = response.data?.[0];
    let imageBuffer: Buffer | null = null;

    if (imageData?.b64_json) {
      imageBuffer = Buffer.from(imageData.b64_json, "base64");
    } else if (imageData?.url) {
      const imgResponse = await fetch(imageData.url);
      if (!imgResponse.ok) {
        throw new Error(`DEBUG: Failed to download generated image. Status: ${imgResponse.status}`);
      }
      imageBuffer = Buffer.from(await imgResponse.arrayBuffer());
    }

    if (!imageBuffer) {
      throw new Error("DEBUG: OpenAI returned no image data. Response: " + JSON.stringify(response));
    }

    console.log(`Cover image generated: ${imageBuffer.length} bytes`);

    // Upload to storage
    const fileName = `${user.id}/${id}/cover.png`;
    const { error: uploadError } = await serviceClient.storage
      .from("previews")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`DEBUG: Failed to upload cover to storage: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = serviceClient.storage
      .from("previews")
      .getPublicUrl(fileName);

    console.log("Cover uploaded successfully:", publicUrl);

    const generatedPages = [{
      page_number: 0,
      url: publicUrl,
      title: coverScene.title,
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
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`DEBUG: Failed to update book: ${updateError.message}`);
    }

    // Deduct tokens
    const deductResult = await deductTokens(
      supabase,
      user.id,
      tokenCost,
      "book_cover",
      id,
      `Generated cover for "${coverScene.title}" with ${characters.length} character(s)`
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

    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
