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
 * Builds the precision character replacement prompt for page generation
 * IMAGE 1 = Master page (original cover template)
 * IMAGES 2+ = Guest character references
 */
export function buildPagePrompt(options: {
  sceneDescription: string;
  setting: string;
  characters: { name: string; slot: number; role: string; action: string; age?: number | null; characterType?: string }[];
  styleDetails: string;
  pageNumber: number;
  totalPages: number;
  protectedCharacters?: string[]; // Story characters to keep (e.g., "Golden Dragon", "Fairy Queen")
  maxSlots?: number; // Total character slots in template (default 5)
}): string {
  const { characters, protectedCharacters = [], maxSlots = 5 } = options;

  // Build character mapping section
  // Maps guest characters to original template slots
  const characterMapping = characters
    .sort((a, b) => a.slot - b.slot)
    .map((c, index) => {
      const imageNum = index + 2; // IMAGE 2, 3, 4... (IMAGE 1 is master page)
      const ageNote = c.age ? ` (age ${c.age})` : "";
      return `- **Original Slot ${c.slot} "${c.role}"** → Replace with **IMAGE ${imageNum} "${c.name}"**${ageNote}
  Preserve guest's face, hair, eyes, skin tone. Adopt original character's pose, position, costume.`;
    })
    .join("\n");

  // Build protected characters section
  const protectedSection = protectedCharacters.length > 0
    ? protectedCharacters.map(name => `- ${name}`).join("\n")
    : "- None specified. Preserve any magical creatures, dragons, fairies, or story-specific characters visible in the master page.";

  // Determine which slots should be removed (slots not assigned to guests)
  const assignedSlots = new Set(characters.map(c => c.slot));
  const unassignedSlots: number[] = [];
  for (let i = 1; i <= maxSlots; i++) {
    if (!assignedSlots.has(i)) {
      unassignedSlots.push(i);
    }
  }

  const removeSection = unassignedSlots.length > 0
    ? unassignedSlots.map(slot => `- Original character in Slot ${slot} (not assigned to any guest)`).join("\n")
    : "- None. All template character slots have been assigned to guests.";

  return `# STORYME — PRECISION CHARACTER REPLACEMENT

You are editing an existing children's storybook illustration, NOT creating a new illustration.

## IMAGE INPUTS

- **IMAGE 1 — MASTER PAGE:** The original storybook illustration. This is the authoritative reference for the entire composition.
- **IMAGES 2+ — GUEST REFERENCES:** The personalised characters that must replace designated characters in the master page.

## PRIMARY OBJECTIVE

Produce a minimally modified version of IMAGE 1.

Change ONLY the designated characters. Preserve everything else as closely as possible.

The finished illustration must look like the original page was carefully edited, not regenerated.

## CHARACTER REPLACEMENT MAP

${characterMapping}

For every assigned guest:

- Replace the designated original character with the corresponding guest.
- Preserve the guest's recognisable facial identity, hairstyle, eye colour, skin tone and distinctive features.
- Preserve the original character's position, scale, pose, action, body orientation and interaction with objects.
- Adapt the guest to the original page's illustration style, lighting and perspective.
- Retain the original character's story-appropriate costume and equipment unless explicitly instructed otherwise.
- Do not duplicate guests or create additional versions of them.

## PROTECTED STORY CHARACTERS

${protectedSection}

These characters are part of the original fictional story.

Preserve their original appearance, size, position, expression and actions.

Never replace, remove or redesign protected story characters.

## REMOVE UNASSIGNED CHARACTERS

${removeSection}

Remove every original character that is not assigned to a guest or explicitly protected.

This includes unwanted people, animals, pets and sidekicks.

Reconstruct the original scenery naturally behind removed characters.

Do not replace removed characters with new characters.

## LOCKED MASTER COMPOSITION

Treat IMAGE 1 as the authoritative visual reference.

Preserve:

- Original canvas dimensions and aspect ratio
- Camera angle, framing and perspective
- Background, scenery, architecture and landscape
- Props, weapons, magical effects and environmental details
- Lighting, shadows, colours and textures
- Original illustration style and rendering technique
- Text and typography, where present
- All non-character objects and their positions

Do not redesign, reimagine, enhance, crop, zoom or rearrange the page.

## EDITING PRIORITY

1. Correct guest identities and number of guests.
2. Correct replacement of assigned original characters.
3. Preservation of protected story characters.
4. Complete removal of unassigned characters.
5. Preservation of the original composition and background.

## FINAL REQUIREMENT

The result should appear nearly identical to IMAGE 1, except for the designated character replacements, removal of unwanted characters and necessary reconstruction of the areas they occupied.

Make the smallest possible visual changes needed to complete the task.`;
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
