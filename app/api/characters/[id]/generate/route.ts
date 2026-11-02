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
    // Get art style and optional feedback from request body
    const body = await request.json().catch(() => ({}));
    const artStyle = (body.artStyle as keyof typeof artStylePrompts) || "glow";
    const styleModifier = artStylePrompts[artStyle] || artStylePrompts.glow;
    const userFeedback = body.feedback as string | undefined;

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

    // Build feedback section if provided
    const feedbackSection = userFeedback
      ? `

**USER REQUESTED CHANGES**

${userFeedback}

Apply the requested changes while preserving all unrelated facial features, character identity and established illustration style.`
      : "";

    const prompt = `Transform the person or pet in the uploaded reference photograph into a charming, professionally illustrated children's storybook caricature.

**SUBJECT**
- Subject type: ${characterTypeContext}
- Character name: ${character.name}
- Art style: ${styleModifier}

**PRIMARY OBJECTIVE — IDENTITY PRESERVATION**

The finished illustration must be immediately recognisable as the same individual shown in the uploaded photograph.

Treat the reference photograph as the definitive source of the character's identity, not merely inspiration.

Study the subject's unique facial characteristics and preserve the relationships between them.

Prioritise recognisability over conventional cartoon attractiveness, symmetry or stylisation.

**FACIAL IDENTITY — HIGHEST PRIORITY**

Preserve the following characteristics:

- Overall face shape, proportions and natural facial asymmetry
- Eye shape, size relative to the face, spacing, angle and colour
- Nose bridge, width, tip shape and proportions
- Mouth shape, lip proportions, smile and natural expression
- Chin, jawline, cheek shape and forehead proportions
- Eyebrow shape, thickness and positioning
- Hairline, hairstyle, hair colour, texture and volume
- Skin tone and visible distinctive features
- Freckles, dimples, moles, glasses, facial hair and other recognisable details where present

Do not replace these features with generic animated character features.

Do not artificially beautify, slim, age, de-age or symmetrise the subject.

**CARICATURE STYLISATION**

Create a gentle, appealing caricature suitable for a premium children's picture book.

- Apply subtle, intentional exaggeration to the subject's existing distinctive features.
- Slightly enlarge the eyes where appropriate, while retaining their original shape, spacing and angle.
- Use softly rounded, expressive illustrated proportions.
- Simplify fine photographic details without removing identifying characteristics.
- Retain the person's unique smile, facial structure and personality.
- Avoid oversized generic cartoon eyes, tiny button noses, identical rounded faces or exaggerated head shapes unless specifically requested.

The result should feel like an illustrated version of this exact person, not a newly invented character who looks vaguely similar.

**ILLUSTRATION STYLE**

${styleModifier}

Maintain a cohesive, professional children's storybook aesthetic with clean forms, appealing colours and controlled shading.

The selected art style should affect rendering, textures, lighting and colour treatment without overriding the subject's facial identity.

**COMPOSITION**

- Pure white background (#FFFFFF)
- Head and upper torso visible
- Character centred in the frame
- Facing forward or at a slight three-quarter angle
- Entire hairstyle and head visible, with comfortable margins
- Natural, welcoming expression
- Soft, even lighting
- No props, text, scenery, borders or decorative effects

**IMPORTANT RESTRICTIONS**

- Do not invent facial features that are not visible in the reference.
- Do not change the subject's apparent age.
- Do not change their ethnicity, skin tone or distinctive physical characteristics.
- Do not make the face more conventionally attractive at the expense of recognisability.
- Do not introduce additional people or animals.
- Do not sacrifice identity preservation to achieve a more dramatic cartoon style.

**SUCCESS CRITERION**

Someone who personally knows the subject should immediately recognise them from the illustration, even without seeing the original photograph.

The final result should balance three priorities, in this order:

1. Recognisable facial identity
2. Appealing children's storybook caricature
3. Consistent illustration style${feedbackSection}`;

    // Step 3: Use images.edit to transform the photo
    console.log("Transforming photo into illustration...");
    const openai = getOpenAI();
    const response = await openai.images.edit({
      model: "gpt-image-1.5",
      image: photoFile,
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "low", // Use low quality for cost efficiency
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
