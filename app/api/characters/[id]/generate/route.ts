import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { openai, artStylePrompts } from "@/lib/openai";

// POST /api/characters/[id]/generate - Generate AI character image
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

    // Build the prompt
    const characterDetails =
      character.character_type === "pet"
        ? "This is a pet. Keep the animal's breed, coloring, and distinctive features recognizable."
        : character.age_group === "child"
        ? "This is a child. Keep their youthful appearance and expression."
        : character.age_group === "senior"
        ? "This is an older adult. Keep their mature features and expression."
        : "Keep their facial features and expression recognizable.";

    const prompt = `Create a children's storybook character illustration based on this description:
A friendly, warm character named ${character.name}.
${characterDetails}
Style: ${styleModifier}
The character should look warm, friendly, and suitable for ages 4-10.
High quality children's picture book illustration with a clean background.
Full body or upper body portrait, looking at the viewer with a friendly expression.`;

    // Call DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const generatedUrl = response.data?.[0]?.url;

    if (!generatedUrl) {
      throw new Error("No image URL returned from DALL-E");
    }

    // Download the image and upload to Supabase Storage
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

    // Update character with generated image URL
    const { data: updatedCharacter, error: updateError } = await supabase
      .from("characters")
      .update({
        generated_image_url: publicUrl,
        generation_status: "completed",
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ character: updatedCharacter });
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
