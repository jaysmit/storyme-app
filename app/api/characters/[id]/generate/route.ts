import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getOpenAI, artStylePrompts } from "@/lib/openai";
import { checkTokens, deductTokens } from "@/lib/tokens";
import { TOKEN_COSTS } from "@/lib/types";

// POST /api/characters/[id]/generate - Generate AI character image from photo
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

  // Get the character
  const { data: character, error: fetchError } = await supabase
    .from("characters")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !character) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  // Check if already generating
  if (character.generation_status === "generating") {
    return NextResponse.json(
      { error: "Generation already in progress" },
      { status: 400 }
    );
  }

  // Check if user has enough tokens
  const tokenCost = TOKEN_COSTS.CHARACTER_ILLUSTRATION;
  const { hasEnough, balance } = await checkTokens(supabase, user.id, tokenCost);

  if (!hasEnough) {
    return NextResponse.json(
      {
        error: "Insufficient tokens",
        required: tokenCost,
        balance,
        message: `You need ${tokenCost} token${tokenCost > 1 ? 's' : ''} but only have ${balance}. Purchase more tokens to continue.`
      },
      { status: 402 } // Payment Required
    );
  }

  try {
    // Get art style from request body (default to 'glow')
    const body = await request.json().catch(() => ({}));
    const artStyle = (body.artStyle as keyof typeof artStylePrompts) || "glow";
    const styleModifier = artStylePrompts[artStyle] || artStylePrompts.glow;

    // Update status to generating
    await supabase
      .from("characters")
      .update({ generation_status: "generating" })
      .eq("id", id);

    // Step 1: Download the original photo
    console.log("Downloading original photo for character:", character.name);

    if (!character.original_photo_url) {
      throw new Error("No original photo URL found");
    }

    const photoResponse = await fetch(character.original_photo_url);
    if (!photoResponse.ok) {
      throw new Error(`Failed to download original photo: ${photoResponse.status}`);
    }

    const photoArrayBuffer = await photoResponse.arrayBuffer();
    const photoBuffer = Buffer.from(photoArrayBuffer);
    console.log("Photo downloaded, size:", photoBuffer.length, "bytes");

    // Determine the image type from URL or content
    const contentType = photoResponse.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpeg";

    // Create a File object for the OpenAI API
    const photoBlob = new Blob([photoBuffer], { type: contentType });
    const photoFile = new File([photoBlob], `photo.${ext}`, { type: contentType });

    // Step 2: Build the prompt for image transformation
    const characterTypeContext =
      character.character_type === "pet"
        ? `This is a ${character.pet_type || "pet"}.`
        : character.character_type === "other"
        ? "This is a unique character."
        : character.age_group === "child"
        ? "This is a child."
        : character.age_group === "senior"
        ? "This is an elderly person."
        : "This is a person.";

    const prompt = `Transform this photo into a children's storybook character illustration.

${characterTypeContext} Their name is ${character.name}.

Art style: ${styleModifier}

FRAMING (CRITICAL):
- Pure white background (#FFFFFF), no patterns or gradients
- Portrait framing: head and upper body/shoulders visible (like a passport photo but showing down to chest/upper torso)
- Character centered in frame, facing forward or slightly angled
- Consistent medium distance - not too close (just face) and not too far (full body)
- Leave some white space around the character

STYLE REQUIREMENTS:
- ANIMATED CARTOON STYLE - like Pixar, Disney, or DreamWorks animated characters
- Smooth, clean lines with bold colors and soft shading
- Stylized but expressive features with large, bright eyes
- KEEP THE EXACT SAME facial features, face shape, eye color, hair color, skin tone, and likeness
- Suitable for a children's picture book (ages 4-10)
- Warm, welcoming expression with a gentle smile
- The illustrated character must be clearly recognizable as the same person/pet in the photo`;

    // Step 3: Use images.edit to transform the photo
    console.log("Transforming photo into illustration...");
    const openai = getOpenAI();
    const response = await openai.images.edit({
      model: "gpt-image-1.5",
      image: photoFile,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    // Handle the response (base64 or URL)
    const imageData = response.data?.[0];
    let imageBuffer: Buffer;

    if (imageData?.b64_json) {
      imageBuffer = Buffer.from(imageData.b64_json, "base64");
    } else if (imageData?.url) {
      const imageResponse = await fetch(imageData.url);
      const arrayBuffer = await imageResponse.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error("No image data returned from OpenAI");
    }

    // Store a simple description for use in story scenes
    const physicalDescription = `${character.name}, ${characterTypeContext.toLowerCase()}`;

    const fileName = `${user.id}/${id}_${artStyle}.png`;

    // Use service client for storage operations to bypass RLS
    const serviceClient = createServiceClient();

    const { error: uploadError } = await serviceClient.storage
      .from("characters")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to save generated image");
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = serviceClient.storage.from("characters").getPublicUrl(fileName);

    // Step 5: Update character with generated image URL and store the physical description
    const { data: updatedCharacter, error: updateError } = await supabase
      .from("characters")
      .update({
        generated_image_url: publicUrl,
        generation_status: "completed",
        physical_description: physicalDescription, // Store for use in story scenes
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      // Try without physical_description if column doesn't exist
      if (updateError.message?.includes("physical_description")) {
        const { data: retryCharacter, error: retryError } = await supabase
          .from("characters")
          .update({
            generated_image_url: publicUrl,
            generation_status: "completed",
          })
          .eq("id", id)
          .select()
          .single();

        if (retryError) throw retryError;

        // Deduct tokens after successful generation
        const deductResult = await deductTokens(
          supabase,
          user.id,
          tokenCost,
          "character_generation",
          id,
          `Generated illustration for ${character.name}`
        );

        return NextResponse.json({
          character: { ...retryCharacter, physical_description: physicalDescription },
          tokensUsed: tokenCost,
          tokensRemaining: deductResult.newBalance,
        });
      }
      throw updateError;
    }

    // Deduct tokens after successful generation
    const deductResult = await deductTokens(
      supabase,
      user.id,
      tokenCost,
      "character_generation",
      id,
      `Generated illustration for ${character.name}`
    );

    return NextResponse.json({
      character: updatedCharacter,
      tokensUsed: tokenCost,
      tokensRemaining: deductResult.newBalance,
    });
  } catch (error) {
    console.error("Generation error:", error);

    // Update status to failed
    await supabase
      .from("characters")
      .update({ generation_status: "failed" })
      .eq("id", id);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate image",
      },
      { status: 500 }
    );
  }
}
