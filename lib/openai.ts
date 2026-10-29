import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Art style prompt modifiers for DALL-E
export const artStylePrompts: Record<string, string> = {
  glow: "rich painted light with golden sparkles and starry skies, warm enchanted atmosphere, magical glow effects",
  watercolour: "soft watercolor washes and pastel skies, gentle dreamy atmosphere, delicate brush strokes",
  sketch: "hand-drawn graphite pencil on cream paper, detailed sketch style, illustrator's sketchbook feel",
  papercut: "layered paper-cut collage with felt textures, 3D depth and shadows, handmade craft aesthetic",
  anim: "3D animated Pixar-style, glossy cinematic rendering, vibrant colors and smooth surfaces",
  silhouette: "bold black silhouettes against glowing sunset sky, shadow-puppet style, dramatic contrast",
  bricks: "LEGO toy brick world, everything built from colorful plastic bricks, playful and geometric",
};

// Generate a character image from a photo
export async function generateCharacterImage(
  photoBase64: string,
  artStyle: keyof typeof artStylePrompts,
  characterDescription?: string
): Promise<string> {
  const styleModifier = artStylePrompts[artStyle] || artStylePrompts.glow;

  const prompt = `Transform this photo into a children's storybook character illustration.
Keep the person's likeness, facial features, and expression recognizable.
Style: ${styleModifier}
${characterDescription ? `Character details: ${characterDescription}` : ""}
The character should look warm, friendly, and suitable for ages 4-10.
High quality children's picture book illustration.`;

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "standard",
  });

  return response.data?.[0]?.url || "";
}

// Generate a book page image
export async function generatePageImage(
  sceneDescription: string,
  characters: { name: string; description: string }[],
  artStyle: keyof typeof artStylePrompts
): Promise<string> {
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
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1792x1024", // Landscape for book pages
    quality: "hd",
  });

  return response.data?.[0]?.url || "";
}
