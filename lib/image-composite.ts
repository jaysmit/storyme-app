/**
 * Image Composite Utility
 * Creates a single reference image from multiple sources for AI generation
 */

interface CompositeOptions {
  originalPageUrl: string;
  characterImages: { url: string; name: string; slot: number }[];
  outputWidth?: number;
}

/**
 * Downloads an image and returns as Buffer
 */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image from ${url}: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Creates a composite reference image with:
 * - Original page at the top (main reference)
 * - Character portraits in a row at the bottom (character references)
 *
 * This allows the AI to see both the scene to recreate AND the exact characters to use.
 */
export async function createCompositeReference(
  options: CompositeOptions
): Promise<Buffer> {
  const { originalPageUrl, characterImages, outputWidth = 1024 } = options;

  // For now, we'll create a simple vertical composite using canvas
  // In production, you might use Sharp or another image processing library

  // Download all images
  const [originalBuffer, ...characterBuffers] = await Promise.all([
    downloadImage(originalPageUrl),
    ...characterImages.map(c => downloadImage(c.url))
  ]);

  // For MVP: Return just the original page if we can't composite
  // TODO: Implement actual compositing with Sharp or similar
  console.log(`Composite: Original page + ${characterImages.length} characters`);
  console.log(`Characters: ${characterImages.map(c => `${c.name} (Slot ${c.slot})`).join(", ")}`);

  return originalBuffer;
}

/**
 * Builds the detailed prompt for page generation with character mapping
 */
export function buildPagePrompt(options: {
  sceneDescription: string;
  setting: string;
  characters: { name: string; slot: number; role: string; action: string; age?: number | null; characterType?: string }[];
  styleDetails: string;
  pageNumber: number;
  totalPages: number;
}): string {
  const { sceneDescription, setting, characters, styleDetails, pageNumber, totalPages } = options;

  // Helper to describe character size based on age
  const getAgeDescription = (age: number | null | undefined, charType?: string): string => {
    if (charType === "pet") return "pet-sized";
    if (!age || age <= 0) return "";
    if (age <= 3) return "toddler-sized (very small, about 1/3 adult height)";
    if (age <= 6) return "young child-sized (small, about 1/2 adult height)";
    if (age <= 12) return "child-sized (medium, about 2/3 adult height)";
    if (age <= 17) return "teen-sized (near adult height)";
    return "adult-sized";
  };

  const characterMapping = characters
    .sort((a, b) => a.slot - b.slot)
    .map((c, index) => {
      const ageDesc = getAgeDescription(c.age, c.characterType);
      const sizeNote = ageDesc ? ` [${ageDesc}]` : "";
      const refNote = `(Reference Image #${index + 1})`;
      return `- CHARACTER ${index + 1}: "${c.name}" ${refNote}
    Role: ${c.role}${sizeNote}
    Action: ${c.action}
    MUST MATCH: Use the EXACT appearance from Reference Image #${index + 1} - same face, hair, skin tone, features`;
    })
    .join("\n\n");

  // Build proportional sizing instructions
  const hasMultipleAges = characters.some(c => c.age && c.age <= 12) && characters.some(c => !c.age || c.age > 17);
  const proportionInstructions = hasMultipleAges ? `
## CHARACTER PROPORTIONS - CRITICAL
Characters must be drawn at proportionate sizes based on their ages:
${characters
  .filter(c => c.age)
  .sort((a, b) => (a.age || 0) - (b.age || 0))
  .map(c => `- "${c.name}" (age ${c.age}): ${getAgeDescription(c.age, c.characterType)}`)
  .join("\n")}

Ensure children appear noticeably SMALLER than adults in the same scene.
Toddlers should be about 1/3 the height of adults.
Children (6-12) should be about 2/3 the height of adults.
` : "";

  return `# STORYBOOK PAGE GENERATION — CHARACTER REPLACEMENT ONLY

## PRIMARY DIRECTIVE — READ CAREFULLY
You are given reference images of characters. Create a storybook illustration featuring THESE EXACT CHARACTERS in the scene described below.

**YOUR TASK:** Generate a scene with the provided character(s) while preserving their EXACT appearance from the reference images.

## SCENE DESCRIPTION
${sceneDescription}

## SETTING
${setting}

## CHARACTERS IN THIS SCENE
${characterMapping}
${proportionInstructions}
## CHARACTER APPEARANCE — CRITICAL
For each character, you MUST preserve from their reference image:
- **Face**: Exact facial features, face shape, expression style
- **Hair**: Exact color, style, length, texture
- **Skin tone**: Exact skin color and complexion
- **Eyes**: Exact eye color, shape, and style
- **Clothing style**: Similar outfit style/colors if visible
- **Overall character design**: The same art style and proportions

The characters in your output MUST be immediately recognizable as the same characters from the reference images. A person should be able to look at your output and the reference images and say "yes, that's the same character."

## ART STYLE — MATCH EXACTLY
${styleDetails}

## COMPOSITION REQUIREMENTS
- Create a cohesive storybook illustration
- Characters should be positioned naturally in the scene
- Maintain consistent lighting across all elements
- Background and setting should complement the characters
- Professional children's book illustration quality

## ABSOLUTE REQUIREMENTS
1. Characters MUST look identical to their reference images
2. Art style MUST be consistent throughout
3. Scene MUST match the description above
4. Output MUST be child-appropriate (ages 4-10)
5. NO text, watermarks, or logos

## DO NOT
- Change character appearances (hair color, face shape, skin tone, etc.)
- Create generic/different looking characters
- Ignore the reference images
- Add characters not in the character list
- Include any text or writing in the image`;
}

/**
 * Detailed style definitions - very precise to avoid tangents
 */
export const PRECISE_STYLE_DEFINITIONS: Record<string, string> = {
  glow: `STYLE: Warm Painted Glow
- Rendering: Digital painting with soft brush strokes, slight texture visible
- Lighting: Warm golden key light from upper-left, soft ambient fill, gentle rim lighting
- Colors: Rich saturated palette with warm undertones, golden highlights, deep purple/blue shadows
- Atmosphere: Cozy storybook warmth, slight magical luminosity on focal elements
- Edges: Soft but defined edges, no harsh outlines, gentle transitions
- Texture: Smooth skin, soft fabric folds, painterly background details
- Mood: Comforting, enchanting, bedtime-story quality
- Reference: Classic picture book illustration, Pixar-adjacent painted look`,

  watercolour: `STYLE: Soft Watercolor Dream
- Rendering: Traditional watercolor wash appearance, visible paper texture
- Lighting: Diffused natural light, no harsh shadows, soft ambient illumination
- Colors: Pastel palette with gentle color bleeds, wet-on-wet transitions
- Atmosphere: Dreamy, ethereal, slightly washed-out edges
- Edges: Deliberately soft and bleeding, organic watercolor boundaries
- Texture: Paper grain visible, pigment pooling in shadows, granulation effects
- Mood: Gentle, calming, nursery-appropriate
- Reference: Classic watercolor picture books, Beatrix Potter adjacent`,

  sketch: `STYLE: Graphite Pencil Illustration
- Rendering: Hand-drawn graphite pencil on cream/warm white paper
- Lighting: Tonal shading through pencil density, cross-hatching for shadows
- Colors: Monochrome graphite with warm paper undertone, occasional sepia tint
- Atmosphere: Intimate sketchbook quality, illustrator's study feel
- Edges: Defined linework with varied line weight, deliberate pencil strokes
- Texture: Paper tooth visible, pencil grain, occasional smudge effects
- Mood: Thoughtful, artistic, nostalgic
- Reference: Classic book illustrations, Quentin Blake / E.H. Shepard style`,

  papercut: `STYLE: Layered Paper-Cut Collage
- Rendering: 3D paper craft appearance with visible layers and shadows
- Lighting: Dramatic directional light creating layer shadows, depth through offset
- Colors: Flat color paper with felt/fabric textures, bold saturated hues
- Atmosphere: Handmade craft aesthetic, tactile and dimensional
- Edges: Clean cut paper edges, slight shadow beneath each layer
- Texture: Paper fiber visible, felt texture on characters, cardboard elements
- Mood: Playful, crafty, pop-up book quality
- Reference: Paper theater, shadow box art, Oliver Jeffers collage style`,

  anim: `STYLE: 3D Animated Film
- Rendering: High-quality 3D CGI render, Pixar/DreamWorks production quality
- Lighting: Professional three-point lighting, cinematic color grading, subsurface scattering on skin
- Colors: Vibrant saturated palette, rich color depth, careful color harmony
- Atmosphere: Polished cinematic quality, theatrical staging
- Edges: Clean smooth geometry, anti-aliased perfection
- Texture: Smooth stylized surfaces, subtle material definition, no photorealism
- Mood: Exciting, dynamic, blockbuster animated film quality
- Reference: Pixar, DreamWorks, Illumination production aesthetic`,

  silhouette: `STYLE: Shadow Puppet Silhouette
- Rendering: Bold black silhouettes against gradient sky backgrounds
- Lighting: Strong backlight creating pure silhouette, glowing sky/background
- Colors: Pure black figures against warm sunset/cool twilight gradient skies
- Atmosphere: Dramatic theatrical staging, shadow puppet theater feel
- Edges: Crisp silhouette edges, recognizable profile shapes
- Texture: Flat black silhouettes, textured atmospheric gradients behind
- Mood: Mysterious, dramatic, fairy-tale quality
- Reference: Lotte Reiniger animation, traditional shadow puppetry`,

  bricks: `STYLE: Toy Brick Construction
- Rendering: LEGO/building block world, everything constructed from plastic bricks
- Lighting: Bright even lighting, slight plastic sheen, minimal harsh shadows
- Colors: Primary and secondary brick colors, classic toy palette
- Atmosphere: Playful construction toy world, everything is buildable
- Edges: Geometric brick edges, stud patterns visible, modular construction
- Texture: Smooth plastic surface, visible brick connections, minifigure aesthetic
- Mood: Fun, playful, imaginative construction
- Reference: LEGO promotional art, brick-built dioramas`,
};
