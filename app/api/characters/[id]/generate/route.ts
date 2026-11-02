import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getOpenAI, artStylePrompts, analyzePhotoForCharacter } from "@/lib/openai";
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

    // Step 1: Analyze the original photo using GPT-4 Vision
    console.log("Analyzing photo for character:", character.name);
    let physicalDescription = "";

    if (character.original_photo_url) {
      try {
        physicalDescription = await analyzePhotoForCharacter(
          character.original_photo_url,
          character.character_type || "person",
          character.pet_type
        );
        console.log("Photo analysis complete:", physicalDescription.substring(0, 100) + "...");
      } catch (visionError) {
        console.error("Vision analysis failed, using fallback:", visionError);
        // Fallback to basic description if vision fails
        physicalDescription = character.character_type === "pet"
          ? `A friendly ${character.pet_type || "pet"}`
          : character.age_group === "child"
          ? "A cheerful young child with a bright smile"
          : character.age_group === "senior"
          ? "A kind elderly person with warm eyes"
          : "A friendly person with a warm expression";
      }
    }

    // Step 2: Build the DALL-E prompt using the physical description
    const characterTypeContext =
      character.character_type === "pet"
        ? `This is a ${character.pet_type || "pet"} character.`
        : character.character_type === "other"
        ? "This is a unique character."
        : character.age_group === "child"
        ? "This is a child character."
        : character.age_group === "senior"
        ? "This is an elderly character."
        : "This is an adult character.";

    const prompt = `Create a children's storybook character illustration.

Character name: ${character.name}
${characterTypeContext}

Physical appearance (MUST match exactly): ${physicalDescription}

Art style: ${styleModifier}

Requirements:
- The character MUST match the physical description provided
- Warm, friendly expression suitable for ages 4-10
- High quality children's picture book illustration
- Clean, simple background with soft colors
- Full body or upper body portrait
- Looking at the viewer with a welcoming smile
- Cartoon/illustrated style but keeping the likeness recognizable`;

    // Step 3: Generate with DALL-E 3
    console.log("Generating character illustration...");
    const openai = getOpenAI();
    const response = await openai.images.generate({
      model: "gpt-image-1.5",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "auto",
    });

    const generatedUrl = response.data?.[0]?.url;

    if (!generatedUrl) {
      throw new Error("No image URL returned from DALL-E");
    }

    // Step 4: Download and upload to Supabase Storage
    const imageResponse = await fetch(generatedUrl);
    const imageBlob = await imageResponse.blob();

    const fileName = `${user.id}/${id}_${artStyle}.png`;

    // Use service client for storage operations to bypass RLS
    const serviceClient = createServiceClient();

    const { error: uploadError } = await serviceClient.storage
      .from("characters")
      .upload(fileName, imageBlob, {
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
