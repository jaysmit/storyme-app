import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOpenAI } from "@/lib/openai";
import type { IdentityProfile } from "@/lib/types";

// POST /api/characters/[id]/analyze - Extract identity profile from photo using GPT-4 Vision
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

  if (!character.original_photo_url) {
    return NextResponse.json({ error: "No photo available" }, { status: 400 });
  }

  try {
    const openai = getOpenAI();

    // Build the analysis prompt based on character type
    const isPet = character.character_type === "pet";
    const isOther = character.character_type === "other";

    let analysisPrompt: string;

    if (isPet) {
      analysisPrompt = `Analyze this photo of a ${character.pet_type || "pet"} and extract physical attributes for a children's book character.

Return ONLY a valid JSON object with these exact fields:
{
  "hair": {
    "color": "fur/coat color (e.g., 'golden', 'black and white spotted', 'tabby orange')",
    "style": "fur style (e.g., 'short and smooth', 'long and fluffy', 'curly')",
    "texture": "optional fur texture",
    "length": "short/medium/long"
  },
  "eyes": {
    "color": "eye color (e.g., 'warm brown', 'bright blue', 'golden amber')",
    "shape": "optional eye shape"
  },
  "skinTone": "skin/nose color if visible (e.g., 'pink nose', 'black nose')",
  "faceShape": "face shape (e.g., 'round', 'pointed snout', 'flat face')",
  "distinctiveFeatures": ["array of unique markings, patterns, or features"],
  "uncertainAttributes": ["array of features you cannot determine clearly"]
}

Use descriptive terms a children's book illustrator would understand. List any features you cannot determine clearly in uncertainAttributes.`;
    } else if (isOther) {
      analysisPrompt = `Analyze this image and extract visual attributes for a children's book character.

Return ONLY a valid JSON object with these exact fields:
{
  "hair": {
    "color": "primary color",
    "style": "overall appearance style"
  },
  "eyes": {
    "color": "eye color if visible",
    "shape": "eye shape if visible"
  },
  "skinTone": "primary surface color/material",
  "distinctiveFeatures": ["array of unique visual characteristics"],
  "uncertainAttributes": ["array of features you cannot determine clearly"]
}

Be descriptive for a children's book illustrator. List unclear features in uncertainAttributes.`;
    } else {
      // Person
      analysisPrompt = `Analyze this photo and extract physical attributes for a children's book character.

Return ONLY a valid JSON object with these exact fields:
{
  "hair": {
    "color": "specific hair color (e.g., 'dark brown', 'sandy blonde', 'auburn red', 'jet black', 'silver gray')",
    "style": "hairstyle (e.g., 'short and neat', 'long and wavy', 'curly bob', 'braided')",
    "texture": "hair texture if visible (e.g., 'straight', 'wavy', 'curly', 'coily')",
    "length": "short/medium/long"
  },
  "eyes": {
    "color": "specific eye color (e.g., 'bright blue', 'warm brown', 'hazel green', 'dark brown')",
    "shape": "eye shape if noticeable (e.g., 'round', 'almond', 'wide-set')"
  },
  "eyebrows": {
    "color": "eyebrow color if different from hair",
    "shape": "eyebrow shape (e.g., 'arched', 'straight', 'bushy', 'thin')"
  },
  "facialHair": {
    "type": "none/stubble/beard/mustache/goatee if applicable",
    "color": "facial hair color if present"
  },
  "skinTone": "skin tone (e.g., 'fair', 'light', 'medium', 'olive', 'tan', 'brown', 'deep brown')",
  "faceShape": "face shape (e.g., 'oval', 'round', 'square', 'heart-shaped')",
  "distinctiveFeatures": ["array of unique features like 'freckles across nose', 'dimples', 'beauty mark on left cheek', 'glasses'"],
  "uncertainAttributes": ["array of features you cannot determine due to lighting, angle, or resolution"]
}

Be specific with colors - use descriptive terms like "dark brown" not just "brown". This is for a children's book illustrator who needs to preserve the person's likeness across multiple illustrations. List any features you cannot determine clearly in uncertainAttributes.`;
    }

    // Call GPT-4 Vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: analysisPrompt },
            {
              type: "image_url",
              image_url: { url: character.original_photo_url },
            },
          ],
        },
      ],
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from vision analysis");
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);

    // Build the identity profile
    const identityProfile: IdentityProfile = {
      version: 1,
      extractedAt: new Date().toISOString(),
      hair: {
        color: parsed.hair?.color || "unknown",
        style: parsed.hair?.style || "unknown",
        texture: parsed.hair?.texture,
        length: parsed.hair?.length,
      },
      eyes: {
        color: parsed.eyes?.color || "unknown",
        shape: parsed.eyes?.shape,
      },
      eyebrows: parsed.eyebrows,
      facialHair: parsed.facialHair,
      skinTone: parsed.skinTone || "unknown",
      faceShape: parsed.faceShape,
      distinctiveFeatures: Array.isArray(parsed.distinctiveFeatures)
        ? parsed.distinctiveFeatures
        : [],
      uncertainAttributes: Array.isArray(parsed.uncertainAttributes)
        ? parsed.uncertainAttributes
        : [],
    };

    // Save to database (not confirmed yet)
    const { data: updatedCharacter, error: updateError } = await supabase
      .from("characters")
      .update({
        identity_profile: identityProfile,
        identity_confirmed: false,
        identity_version: 1,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      // If columns don't exist yet, return the profile without saving
      if (updateError.message?.includes("identity_profile")) {
        console.warn("identity_profile column not found, returning profile without saving");
        return NextResponse.json({
          identityProfile,
          saved: false,
          message: "Database migration needed for identity_profile column",
        });
      }
      throw updateError;
    }

    return NextResponse.json({
      character: updatedCharacter,
      identityProfile,
      saved: true,
    });
  } catch (error) {
    console.error("Identity analysis error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Analysis failed",
      },
      { status: 500 }
    );
  }
}
