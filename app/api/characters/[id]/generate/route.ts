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
    // Determine age-based proportions and context
    const age = character.age as number | null;
    const ageGroup = character.age_group as string | null;

    let characterTypeContext: string;
    let proportionGuidance: string;

    if (character.character_type === "pet") {
      characterTypeContext = `This is a ${character.pet_type || "pet"}.`;
      proportionGuidance = "Use appropriate animal proportions for this pet type.";
    } else if (character.character_type === "other") {
      characterTypeContext = "This is a unique character.";
      proportionGuidance = "Use creative fantasy proportions appropriate for this character type.";
    } else {
      // Person - use age for proportions
      if (age !== null && age > 0) {
        if (age <= 3) {
          characterTypeContext = `This is a toddler (${age} year${age === 1 ? '' : 's'} old).`;
          proportionGuidance = `
TODDLER PROPORTIONS (age ${age}):
- Very large head relative to body (about 1/4 of total height)
- Short, chubby limbs with baby fat
- Round, soft facial features
- Big expressive eyes relative to face
- Small nose and mouth
- Chubby cheeks
- Short neck or almost no visible neck
- Tiny hands and feet
- Overall very small stature`;
        } else if (age <= 6) {
          characterTypeContext = `This is a young child (${age} years old).`;
          proportionGuidance = `
YOUNG CHILD PROPORTIONS (age ${age}):
- Large head relative to body (about 1/5 of total height)
- Short limbs with some baby roundness remaining
- Round, soft facial features
- Large expressive eyes
- Small nose
- Round cheeks
- Short torso
- Small hands and feet
- Overall small stature, noticeably shorter than adults`;
        } else if (age <= 12) {
          characterTypeContext = `This is a child (${age} years old).`;
          proportionGuidance = `
CHILD PROPORTIONS (age ${age}):
- Head slightly large relative to body (about 1/6 of total height)
- Developing limbs, still somewhat short
- Youthful facial features
- Bright, expressive eyes
- Medium-sized but still youthful features
- Less round cheeks than toddlers
- Growing but still compact stature
- Medium stature, about 2/3 adult height`;
        } else if (age <= 17) {
          characterTypeContext = `This is a teenager (${age} years old).`;
          proportionGuidance = `
TEEN PROPORTIONS (age ${age}):
- Head proportional to body (about 1/7 of total height)
- Longer limbs, approaching adult proportions
- More defined facial features
- Adult-like eyes
- Developing adult features
- Face shape becoming more defined
- Taller stature, approaching adult height
- Lanky or gangly appearance typical of teens`;
        } else if (age <= 64) {
          characterTypeContext = `This is an adult (${age} years old).`;
          proportionGuidance = `
ADULT PROPORTIONS (age ${age}):
- Standard adult head-to-body ratio (about 1/7.5 of total height)
- Full adult limb proportions
- Mature facial features
- Normal adult stature`;
        } else {
          characterTypeContext = `This is a senior (${age} years old).`;
          proportionGuidance = `
SENIOR PROPORTIONS (age ${age}):
- Standard adult head-to-body ratio
- May show slight posture changes appropriate for age
- Mature, wise facial features
- Silver/grey hair if natural hair color
- Kind, experienced expression
- Gentle smile lines and character appropriate for age`;
        }
      } else if (ageGroup) {
        // Fallback to age_group if no specific age
        characterTypeContext = ageGroup === "child" ? "This is a child."
                            : ageGroup === "toddler" ? "This is a toddler."
                            : ageGroup === "teen" ? "This is a teenager."
                            : ageGroup === "senior" ? "This is an elderly person."
                            : "This is a person.";
        proportionGuidance = ageGroup === "child" || ageGroup === "toddler"
          ? "Use child-appropriate proportions with larger head relative to body."
          : "Use standard adult proportions.";
      } else {
        characterTypeContext = "This is a person.";
        proportionGuidance = "Use proportions appropriate for the apparent age in the photograph.";
      }
    }

    // Build feedback section if provided
    const feedbackSection = userFeedback
      ? `\n\n## 10. USER REQUESTED CHANGES\n${userFeedback}`
      : "";

    // Adjust prompt for pets vs people
    const isPet = character.character_type === "pet";
    const subjectType = isPet ? (character.pet_type || "pet") : "person";

    const prompt = `# STORYME — CHARACTER GENERATION PROMPT

Transform the ${subjectType} in the uploaded reference photograph into a premium, highly stylised 3D animated children's storybook character.

Use the uploaded photograph as the primary reference for the ${subjectType}'s identity, while transforming their appearance into a charming, exaggerated, beautifully polished animated character.

## 1. ART STYLE — CRITICAL

Create a vibrant, highly stylised 3D animated character with the visual quality of a premium animated family adventure film.

The character must look unmistakably cartoonish, NOT photorealistic or semi-realistic.

**Character proportions:**
- Noticeably oversized head relative to the shoulders and body.
- Large, rounded, expressive cartoon eyes.
- Soft, rounded cheeks with exaggerated youthful proportions.
- Small, simplified, softly sculpted nose.
- Wide, expressive mouth with a joyful, natural smile.
- Slightly exaggerated ears where appropriate.
- Smooth, rounded jawline and simplified facial structure.
- Rich, voluminous, sculpted hair with playful flowing strands.
- Appealing, slightly exaggerated facial proportions that feel intentionally designed rather than anatomically realistic.

The character should resemble a lovable animated storybook hero, not a realistic adult with enlarged eyes.

## 1B. AGE-APPROPRIATE PROPORTIONS — CRITICAL

${characterTypeContext}
${proportionGuidance}

**IMPORTANT:** When creating story scenes with multiple characters, these proportions must be maintained so that children appear noticeably smaller than adults, toddlers smaller than children, etc. Character heights should be proportionate to their age.

## 2. EYE ALIGNMENT — EXTREMELY IMPORTANT

**Both eyes must be perfectly coordinated and looking in exactly the same direction.**

Follow these anatomical and visual requirements:

- Both eyes must be positioned naturally and evenly on the face.
- Both pupils must look straight ahead, directly towards the viewer.
- Both pupils must be centred consistently within their respective irises.
- Both irises must have matching horizontal and vertical gaze directions.
- The eyes must focus on the same distant point, not converge towards the nose.
- Maintain parallel, coordinated gaze direction between both eyes.
- Ensure both pupils sit at equivalent relative positions within their respective eye openings.
- Both eyes should have consistent iris size, pupil size and overall proportions.
- Eye highlights and reflections should appear consistent with the same lighting source.
- Do not position either pupil noticeably closer to the nose than the other.
- Do not allow one eye to look upwards, downwards, inwards or sideways independently.
- Avoid excessive inward rotation of the eyeballs.
- The eyes must look naturally aligned, balanced, expressive and visually comfortable.

**FINAL EYE VALIDATION:**

Before completing the image, visually check both eyes.

Imagine drawing a straight horizontal line through the centre of both pupils. Both pupils should sit at the same vertical level when the face is directly facing forward.

The character must appear to be looking at the viewer with two naturally coordinated eyes.

**ABSOLUTELY NO:**
- Crossed eyes
- Wall-eyed appearance
- Misaligned pupils
- Uneven gaze directions
- Inward-pointing pupils
- Asymmetrical iris placement
- One eye looking at a different target
- Unnatural eye convergence

Eye alignment takes priority over exaggerated eye size. If necessary, slightly reduce eye exaggeration to maintain correct alignment.

## 3. IDENTITY PRESERVATION

Preserve the recognisable identity of the ${subjectType} in the uploaded photograph.

Maintain their:
- Hair colour, hairstyle and general hairline.
- Eye colour.
- Distinctive eyebrow shape.
- Recognisable nose and mouth characteristics.
- General face shape, translated into cartoon proportions.
${isPet ? "" : "- Facial hair, freckles and distinctive features where present.\n"}- Approximate age and recognisable appearance.

Do not copy realistic facial geometry exactly.

Instead, reinterpret the ${subjectType}'s distinctive features into a cohesive animated character design.

The final character should be recognisable as the ${subjectType} in the photograph while looking substantially more cartoonish.

Do not introduce freckles, facial hair or other distinctive features that are not present in the reference photograph.

## 4. FACIAL EXPRESSION

Give the character a joyful, charming and adventurous personality.

- Bright, expressive eyes.
- Naturally raised, animated eyebrows.
- A large, warm, enthusiastic smile.
- Softly rounded, slightly rosy cheeks.
- An energetic, friendly and lovable expression.
- A subtle playful head tilt, provided eye alignment remains correct.

The expression should feel full of life, wonder and personality.

## 5. LIGHTING, COLOUR AND HIGHLIGHTS

Use beautiful, premium cinematic animated-film lighting.

**Lighting requirements:**
- Warm golden key lighting illuminating the face.
- Soft, luminous highlights across the cheeks, forehead and nose.
- Beautiful golden rim lighting around the hair and shoulders.
- Rich, glowing highlights along individual sculpted hair strands.
- Bright, clean catchlights in both eyes, consistent with the lighting direction.
- Soft, realistic-looking 3D depth without photographic skin detail.
- Gentle subsurface scattering for a smooth, luminous cartoon appearance.
- Warm, vibrant colours with rich contrast and depth.
- Subtle magical warmth and an inviting storybook atmosphere.

The character should feel bright, colourful, beautifully illuminated and visually striking.

Avoid dull, flat lighting or muted photographic colours.

## 6. HAIR AND MATERIAL DETAIL

Hair should be highly stylised, voluminous and beautifully sculpted.

- Use exaggerated flowing locks and playful shapes.
- Create dimensional strands with soft golden highlights.
- Maintain the original hairstyle and colour.
- Avoid overly realistic individual hair fibres.

Skin should be smooth, soft and stylised, with simplified textures.

Clothing should have rich, appealing colours, softly sculpted folds and polished animated materials.

## 7. COMPOSITION

- Portrait orientation.
- Head and upper body visible.
- Character centred in the frame.
- Face directed towards the camera.
- Both eyes clearly visible.
- Entire hairstyle visible without cropping.
- Pure white background (#FFFFFF).
- No scenery, text or additional characters.
- Clean character presentation suitable for use as a reusable reference in future storybook illustrations.

Clothing should generally resemble the reference photograph unless alternative clothing is specifically requested.

## 8. STYLE RESTRICTIONS

**AVOID:**
- Photorealism or semi-realism.
- Realistic adult facial anatomy.
- Photographic skin pores and wrinkles.
- Uncanny-valley facial features.
- Crossed or misaligned eyes.
- Excessively realistic facial hair.
- Flat 2D cartoon illustrations.
- Anime or comic-book styles.
- Watercolour or pencil sketch effects.
- Generic AI portrait aesthetics.
- Dull lighting or washed-out colours.
- Overly exaggerated features that make the ${subjectType} unrecognisable.

## 9. FINAL QUALITY CHECK

Before finalising, ensure:

1. The ${subjectType} is recognisable from the original photograph.
2. The character looks clearly and substantially cartoonish.
3. Both eyes are aligned and focused in exactly the same direction.
4. The lighting is warm, vibrant and cinematic.
5. The composition is clean with a pure white background.${feedbackSection}`;

    // Step 3: Use images.edit to transform the photo
    // StoryMe character generation settings
    console.log("Transforming photo into illustration...");
    const openai = getOpenAI();
    const response = await openai.images.edit({
      model: "gpt-image-2",
      image: photoFile,
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "low",
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
