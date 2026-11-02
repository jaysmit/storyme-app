import OpenAI from "openai";

// Lazy-load OpenAI client to avoid build-time initialization errors
let _openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

// Analyze a photo using GPT-4 Vision and get detailed physical description
export async function analyzePhotoForCharacter(
  photoBase64OrUrl: string,
  characterType: "person" | "pet" | "other" = "person",
  petType?: string
): Promise<string> {
  const openai = getOpenAI();

  // Determine if it's a URL or base64
  const imageContent = photoBase64OrUrl.startsWith("data:")
    ? { type: "image_url" as const, image_url: { url: photoBase64OrUrl } }
    : { type: "image_url" as const, image_url: { url: photoBase64OrUrl } };

  const typePrompt =
    characterType === "pet"
      ? `This is a pet (${petType || "unknown type"}). Describe the animal's breed, size, coloring, fur texture, eye color, distinctive markings, and any unique features.`
      : characterType === "other"
      ? "Describe this character/object in detail including its appearance, colors, and distinctive features."
      : "Describe this person's physical features in detail: approximate age, hair color and style, eye color, face shape, skin tone, any distinctive features like glasses, freckles, dimples, or facial hair.";

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are helping create a children's storybook character. ${typePrompt}

Be specific and detailed so an illustrator could recreate the likeness. Focus on physical appearance only, not clothing. Keep the description under 150 words. Do not include any commentary, just the description.`,
          },
          imageContent,
        ],
      },
    ],
    max_tokens: 300,
  });

  return response.choices[0]?.message?.content || "";
}

// Art style prompt modifiers for DALL-E (optimized - no sparkle effects)
export const artStylePrompts: Record<string, string> = {
  glow: "warm painted illustration with soft lighting, cozy children's book atmosphere, gentle color palette",
  watercolour: "soft watercolor washes and pastel tones, gentle dreamy atmosphere, delicate brush strokes",
  sketch: "hand-drawn graphite pencil on cream paper, detailed sketch style, illustrator's sketchbook feel",
  papercut: "layered paper-cut collage with felt textures, 3D depth and shadows, handmade craft aesthetic",
  anim: "3D animated Pixar-style, smooth cinematic rendering, vibrant colors and clean surfaces",
  silhouette: "bold black silhouettes against soft gradient sky, shadow-puppet style, dramatic contrast",
  bricks: "LEGO toy brick world, everything built from colorful plastic bricks, playful and geometric",
};

// Generate a character image from a photo
export async function generateCharacterImage(
  photoBase64: string,
  artStyle: keyof typeof artStylePrompts,
  characterDescription?: string
): Promise<string> {
  const openai = getOpenAI();
  const styleModifier = artStylePrompts[artStyle] || artStylePrompts.glow;

  const prompt = `Transform this photo into a children's storybook character illustration.
Keep the person's likeness, facial features, and expression recognizable.
Style: ${styleModifier}
${characterDescription ? `Character details: ${characterDescription}` : ""}
The character should look warm, friendly, and suitable for ages 4-10.
High quality children's picture book illustration.`;

  const response = await openai.images.generate({
    model: "gpt-image-1.5",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "auto",
  });

  return response.data?.[0]?.url || "";
}

// Generate a book page image
export async function generatePageImage(
  sceneDescription: string,
  characters: { name: string; description: string }[],
  artStyle: keyof typeof artStylePrompts
): Promise<string> {
  const openai = getOpenAI();
  const styleModifier = artStylePrompts[artStyle] || artStylePrompts.glow;
  const characterList = characters
    .map((c) => `${c.name}: ${c.description}`)
    .join("; ");

  const prompt = `${sceneDescription}
Characters in scene: ${characterList}
Art style: ${styleModifier}
Children's picture book illustration, warm and friendly, suitable for ages 4-10.
High quality, vibrant, engaging storytelling illustration.`;

  const response = await openai.images.generate({
    model: "gpt-image-1.5",
    prompt,
    n: 1,
    size: "1792x1024", // Landscape for book pages
    quality: "high",
  });

  return response.data?.[0]?.url || "";
}
