/**
 * Book Blueprint System
 * Loads and manages book blueprints for personalized storybook generation
 */

import fs from "fs/promises";
import path from "path";

// Schema version for validation
export const BLUEPRINT_SCHEMA_VERSION = "1.0";

// ============================================
// Type Definitions
// ============================================

export interface BoundingBox {
  x: number;      // 0-1 normalized
  y: number;      // 0-1 normalized
  width: number;  // 0-1 normalized
  height: number; // 0-1 normalized
}

export interface BookCharacter {
  characterId: string;
  name: string;
  description: string;
  preserve: boolean;
  role: string;
}

export interface CrewSlot {
  slotId: string;
  characterType: "adult" | "child" | "baby" | "dog" | "other";
  archetype: string;
  position: string;
  poseAction: string;
  wardrobe: string;
  replaceEntireCharacter: boolean;
  required: boolean;
  boundingBox: BoundingBox | null;
  assignedCharacterId: string | null;
}

export interface CharacterPlacement {
  slotId: string;
  position: string;
  poseAction: string;
  wardrobe: string;
}

export interface PageScene {
  description: string;
  visualStyle: string;
}

export interface PageComposition {
  aspectRatio: number;
  dimensions: {
    width: number;
    height: number;
  };
  notes: string;
}

export interface GenerationInstructions {
  editStrategy: string;
  preserveBackground: boolean;
  preserveBookCharacters: boolean;
  maskStatus: string;
  reviewStatus: string;
}

export interface BlueprintPage {
  pageId: string;
  pageNumber: number;
  pageType: "cover" | "interior";
  originalImage: string;
  scene: PageScene;
  composition: PageComposition;
  characterPlacements: CharacterPlacement[];
  protectedElements: string[];
  generationInstructions: GenerationInstructions;
}

export interface BookBlueprint {
  schemaVersion: string;
  bookId: string;
  title: string;
  blueprintVersion: number;
  globalRules: string[];
  visualStyle: string;
  characters: {
    bookCharacters: BookCharacter[];
    crewSlots: CrewSlot[];
  };
  pages: BlueprintPage[];
  metadata: {
    crewCount: number;
    bookCharacterCount: number;
    coordinateSystem: string;
    classificationNote: string;
  };
}

// ============================================
// Blueprint Loader
// ============================================

const blueprintCache = new Map<string, BookBlueprint>();

/**
 * Get the path to the blueprints directory
 */
function getBlueprintsDir(): string {
  return path.join(process.cwd(), "book-blueprints");
}

/**
 * Load a book blueprint by book ID
 */
export async function loadBlueprint(bookId: string): Promise<BookBlueprint> {
  // Check cache first
  const cached = blueprintCache.get(bookId);
  if (cached) {
    return cached;
  }

  const blueprintPath = path.join(getBlueprintsDir(), `${bookId}.json`);

  try {
    const content = await fs.readFile(blueprintPath, "utf-8");
    const blueprint = JSON.parse(content) as BookBlueprint;

    // Validate schema version
    if (blueprint.schemaVersion !== BLUEPRINT_SCHEMA_VERSION) {
      console.warn(
        `Blueprint ${bookId} has schema version ${blueprint.schemaVersion}, expected ${BLUEPRINT_SCHEMA_VERSION}`
      );
    }

    // Cache the blueprint
    blueprintCache.set(bookId, blueprint);

    return blueprint;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`BLUEPRINT_NOT_FOUND: No blueprint found for book "${bookId}"`);
    }
    throw error;
  }
}

/**
 * Get a specific page from a blueprint
 */
export async function loadBlueprintPage(
  bookId: string,
  pageId: string
): Promise<BlueprintPage> {
  const blueprint = await loadBlueprint(bookId);

  const page = blueprint.pages.find((p) => p.pageId === pageId);
  if (!page) {
    throw new Error(
      `PAGE_NOT_FOUND: Blueprint "${bookId}" has no page with ID "${pageId}"`
    );
  }

  return page;
}

/**
 * Get cover page from a blueprint
 */
export async function loadBlueprintCover(bookId: string): Promise<BlueprintPage> {
  return loadBlueprintPage(bookId, "cover");
}

/**
 * List all available book IDs
 */
export async function listAvailableBooks(): Promise<string[]> {
  const blueprintsDir = getBlueprintsDir();

  try {
    const files = await fs.readdir(blueprintsDir);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  } catch {
    return [];
  }
}

/**
 * Clear the blueprint cache
 */
export function clearBlueprintCache(): void {
  blueprintCache.clear();
}

// ============================================
// Blueprint Validation
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate a blueprint for required fields and consistency
 */
export function validateBlueprint(blueprint: BookBlueprint): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!blueprint.bookId) {
    errors.push("Missing bookId");
  }
  if (!blueprint.title) {
    errors.push("Missing title");
  }
  if (!blueprint.pages || blueprint.pages.length === 0) {
    errors.push("No pages defined");
  }

  // Check cover page
  const coverPage = blueprint.pages?.find((p) => p.pageType === "cover");
  if (!coverPage) {
    errors.push("No cover page defined");
  } else {
    if (!coverPage.originalImage) {
      errors.push("Cover page missing originalImage");
    }
    if (!coverPage.scene?.description) {
      warnings.push("Cover page missing scene description");
    }
  }

  // Check crew slots
  if (!blueprint.characters?.crewSlots || blueprint.characters.crewSlots.length === 0) {
    warnings.push("No crew slots defined");
  } else {
    const slotIds = new Set<string>();
    for (const slot of blueprint.characters.crewSlots) {
      if (slotIds.has(slot.slotId)) {
        errors.push(`Duplicate slot ID: ${slot.slotId}`);
      }
      slotIds.add(slot.slotId);
    }
  }

  // Check book characters
  if (blueprint.characters?.bookCharacters) {
    const charIds = new Set<string>();
    for (const char of blueprint.characters.bookCharacters) {
      if (charIds.has(char.characterId)) {
        errors.push(`Duplicate book character ID: ${char.characterId}`);
      }
      charIds.add(char.characterId);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// Prompt Builder from Blueprint
// ============================================

export interface CrewAssignment {
  slotId: string;
  characterId: string;
  characterName: string;
  imageIndex: number; // IMAGE 2, 3, 4...
}

/**
 * Build the OpenAI image editing prompt from a blueprint page
 */
export function buildPromptFromBlueprint(
  blueprint: BookBlueprint,
  page: BlueprintPage,
  crewAssignments: CrewAssignment[]
): string {
  // Build crew replacement section
  const crewReplacements = crewAssignments
    .map((assignment) => {
      const placement = page.characterPlacements.find(
        (p) => p.slotId === assignment.slotId
      );
      const slot = blueprint.characters.crewSlots.find(
        (s) => s.slotId === assignment.slotId
      );

      if (!placement || !slot) {
        return null;
      }

      return `- **${slot.archetype}** at ${placement.position} → Replace with **IMAGE ${assignment.imageIndex} "${assignment.characterName}"**
  Position: ${placement.position}
  Pose: ${placement.poseAction}
  Wardrobe: ${placement.wardrobe}
  Preserve guest's face, hair, eyes, skin tone. Match the pose and wardrobe exactly.`;
    })
    .filter(Boolean)
    .join("\n\n");

  // Build book characters section (protected)
  const bookCharactersSection =
    blueprint.characters.bookCharacters.length > 0
      ? blueprint.characters.bookCharacters
          .map((char) => `- **${char.name}**: ${char.description}`)
          .join("\n")
      : "- None in this scene";

  // Build protected elements section
  const protectedElementsSection =
    page.protectedElements.length > 0
      ? page.protectedElements.map((el) => `- ${el}`).join("\n")
      : "- Standard background and scenery";

  // Build unassigned slots section (to remove)
  const assignedSlotIds = new Set(crewAssignments.map((a) => a.slotId));
  const unassignedSlots = blueprint.characters.crewSlots.filter(
    (slot) => !assignedSlotIds.has(slot.slotId)
  );
  const unassignedSection =
    unassignedSlots.length > 0
      ? unassignedSlots
          .map(
            (slot) =>
              `- ${slot.archetype} at ${slot.position} (not assigned to any customer character)`
          )
          .join("\n")
      : "- None. All crew positions have been assigned.";

  return `# STORYME — PRECISION CHARACTER REPLACEMENT

You are editing an existing children's storybook illustration, NOT creating a new illustration.

## IMAGE INPUTS

- **IMAGE 1 — MASTER PAGE:** The original "${blueprint.title}" cover illustration. This is the authoritative reference for the entire composition.
- **IMAGES 2+ — CUSTOMER CREW:** The personalised character illustrations that must replace designated placeholder characters.

## VISUAL STYLE

${blueprint.visualStyle}

Match all replacements to this exact visual style. The customer characters should look like they belong in this artwork.

## SCENE DESCRIPTION

${page.scene.description}

## PRIMARY OBJECTIVE

Produce a minimally modified version of IMAGE 1.

Change ONLY the designated crew characters. Preserve everything else as closely as possible.

The finished illustration must look like the original page was carefully edited, not regenerated.

## CREW CHARACTER REPLACEMENTS

${crewReplacements}

For every assigned crew member:

- Replace the placeholder character with the corresponding customer character.
- Preserve the customer's recognisable facial identity, hairstyle, eye colour, skin tone and distinctive features.
- Preserve the original character's position, scale, pose, action, body orientation and interaction with objects.
- Adapt the customer to the original page's illustration style, lighting and perspective.
- Use the exact wardrobe and accessories described above.
- Do not duplicate characters or create additional versions of them.

## PROTECTED BOOK CHARACTERS

${bookCharactersSection}

These characters are part of the original story.

Preserve their original appearance, size, position, expression and actions exactly.

Never replace, remove or redesign protected book characters.

## REMOVE UNASSIGNED CREW POSITIONS

${unassignedSection}

Remove every placeholder character that is not assigned to a customer character.

Reconstruct the original scenery naturally behind removed characters.

Do not replace removed characters with new characters.

## PROTECTED SCENE ELEMENTS

${protectedElementsSection}

Do not modify, remove or redesign any of these elements.

## LOCKED MASTER COMPOSITION

Treat IMAGE 1 as the authoritative visual reference.

Preserve:

- Original canvas dimensions (${page.composition.dimensions.width}x${page.composition.dimensions.height})
- Aspect ratio (${page.composition.aspectRatio})
- Camera angle, framing and perspective
- Background, scenery, architecture and landscape
- Props, vehicles, magical effects and environmental details
- Lighting, shadows, colours and textures
- Original illustration style and rendering technique
- All non-character objects and their positions

${page.composition.notes}

Do not redesign, reimagine, enhance, crop, zoom or rearrange the page.

## EDITING PRIORITY

1. Correct customer character identities matching their reference images.
2. Correct replacement of assigned placeholder positions.
3. Preservation of protected book characters.
4. Complete removal of unassigned placeholder characters.
5. Preservation of the original composition and background.

## FINAL REQUIREMENT

The result should appear nearly identical to IMAGE 1, except for the designated character replacements, removal of unassigned characters and necessary reconstruction of the areas they occupied.

Make the smallest possible visual changes needed to complete the task.`;
}

/**
 * Resolve book ID from image filename
 * e.g., "the-crystal-asteroid.jpg" -> "the-crystal-asteroid"
 */
export function resolveBookIdFromFilename(filename: string): string {
  return filename.replace(/\.(jpg|jpeg|png|webp)$/i, "");
}

/**
 * Get the original image path for a blueprint page
 */
export function getOriginalImagePath(page: BlueprintPage): string {
  return `/images/${page.originalImage}`;
}
