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
    .map(c => {
      const ageDesc = getAgeDescription(c.age, c.characterType);
      const sizeNote = ageDesc ? ` [${ageDesc}]` : "";
      return `- SLOT ${c.slot} → "${c.name}" (${c.role})${sizeNote}: ${c.action}`;
    })
    .join("\n");

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

  return `# PAGE ${pageNumber} OF ${totalPages} - RECREATION WITH CHARACTER REPLACEMENT

## TASK
Recreate this exact scene, replacing the original template characters with the specific characters shown in the reference portraits below the main image.

## SCENE TO RECREATE
${sceneDescription}

## SETTING (maintain exactly)
${setting}

## CHARACTER MAPPING (reference portraits shown below main image, left to right)
${characterMapping}
${proportionInstructions}
## CRITICAL INSTRUCTIONS
1. The MAIN IMAGE (top) shows the exact scene composition, poses, and layout to recreate
2. The CHARACTER PORTRAITS (bottom row) show the exact appearance of each character
3. Replace template characters with the referenced characters while maintaining:
   - Same poses and positions
   - Same actions and expressions
   - Same scene composition
   - Same lighting and atmosphere

## STYLE REQUIREMENTS (must match exactly)
${styleDetails}

## QUALITY REQUIREMENTS
- Professional children's book illustration quality
- Consistent with other pages in this book
- Age-appropriate for children 4-10
- No text, logos, or watermarks
- Landscape format matching the original scene

## DO NOT
- Change the scene composition
- Alter character positions
- Modify the setting or background elements
- Add or remove scene elements
- Change the art style`;
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
