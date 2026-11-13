/**
 * Book Blueprint System
 * Loads and manages book blueprints for personalized storybook generation
 */

import fs from "fs/promises";
import path from "path";

// Schema version for validation
export const BLUEPRINT_SCHEMA_VERSION = "1.0";

// ============================================
// Slug to Book ID Mapping
// Maps old story-templates slugs to new blueprint book IDs
// ============================================

const SLUG_TO_BOOK_ID: Record<string, string> = {
  // Old slugs from story-templates.ts -> new blueprint book IDs
  "dragon-castle-valley": "the-dragon-of-castle-valley",
  "fairy-glade": "the-fairy-glade",
  "grand-final-day": "grand-final-day",
  "cloud-ship": "captain-of-the-cloud-ship",
  "super-squad": "the-super-squad-and-the-sorceress",
  "galaxy-road-trip": "the-great-galaxy-road-trip",
  // Additional books (use same ID)
  "the-crystal-asteroid": "the-crystal-asteroid",
  "the-dinosaur-egg-dig": "the-dinosaur-egg-dig",
  "the-dragon-of-castle-valley": "the-dragon-of-castle-valley",
  "the-fairy-glade": "the-fairy-glade",
  "the-great-backyard-expedition": "the-great-backyard-expedition",
  "the-great-galaxy-road-trip": "the-great-galaxy-road-trip",
  "the-great-lighthouse-rescue": "the-great-lighthouse-rescue",
  "the-lost-jungle-temple": "the-lost-jungle-temple",
  "the-snow-globe-kingdom": "the-snow-globe-kingdom",
  "the-super-squad-and-the-sorceress": "the-super-squad-and-the-sorceress",
  "under-the-kelp-forest": "under-the-kelp-forest",
  "captain-of-the-cloud-ship": "captain-of-the-cloud-ship",
  "dragon-day-at-school": "dragon-day-at-school",
  "the-birthday-that-wouldnt-end": "the-birthday-that-wouldnt-end",
  "the-brick-by-brick-kingdom": "the-brick-by-brick-kingdom",
};

/**
 * Convert a story slug to a blueprint book ID
 * Handles both old slugs (from story-templates.ts) and new book IDs
 */
export function resolveBookId(slugOrBookId: string): string {
  // Check if it's in the mapping
  if (SLUG_TO_BOOK_ID[slugOrBookId]) {
    return SLUG_TO_BOOK_ID[slugOrBookId];
  }
  // Otherwise, assume it's already a valid book ID
  return slugOrBookId;
}

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
// V2 Blueprint Format Types (Essendon Five style)
// ============================================

export interface HeadAnchor {
  x: number;  // 0-1 normalized from left
  y: number;  // 0-1 normalized from top
}

export interface V2CharacterDefinition {
  name: string;
  age?: number;
  features: string;
  slot_id: string;
  swappable: boolean;
  reference_key?: string;
  features_note?: string;
}

export interface V2CharacterPlacement {
  slot_id: string;
  swappable: boolean;
  priority_rank: number;           // 1 = highest priority for identity
  importance: "primary" | "secondary" | "background";
  head_anchor: HeadAnchor;
  depth: string;
  action_and_location: string;
  reference_image_index: number;   // IMAGE index for this page (2+)
}

export interface V2TextLayout {
  mode: string;
  alignment: string;
  background: string;
  color: string;
  render_title: boolean;
}

export interface V2Page {
  page_number: number;
  title: string;
  master_image_filename: string;
  master_image_size?: {
    width: number;
    height: number;
  };
  scene_description: string;
  story_text: string;
  story_text_template: string;     // {{leon}}, {{mum}}, etc.
  word_count?: number;
  characters: V2CharacterPlacement[];
  absent_character_ids: string[];
  protected_non_swappable_elements: string[];
  text_layout?: V2TextLayout;
}

export interface V2GenerationRules {
  image_input_order: string;
  edit_instruction: string;
  text_instruction: string;
  text_personalisation: string;
  missing_reference: string;
  anchor_note: string;
}

export interface V2Blueprint {
  schema_version: string;
  title: string;
  page_count: number;
  visual_style: string;
  characters: Record<string, V2CharacterDefinition>;
  generation_rules: V2GenerationRules;
  pages: V2Page[];
}

// Result from loading a blueprint (includes format detection)
export interface BlueprintLoadResult {
  blueprint: BookBlueprint | V2Blueprint;
  format: "v1" | "v2";
  basePath: string;  // For resolving image paths
  bookId: string;
}

// Name mapping for story text personalization
export interface NameMapping {
  [slotId: string]: string;  // { leon: "Tommy", mum: "Sarah" }
}

// ============================================
// Blueprint Loader
// ============================================

const blueprintCache = new Map<string, BlueprintLoadResult>();

/**
 * Get the path to the blueprints directory (V1)
 */
function getBlueprintsDir(): string {
  return path.join(process.cwd(), "book-blueprints");
}

/**
 * Get the path to the books directory (V2)
 */
function getBooksDir(): string {
  return path.join(process.cwd(), "books");
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect blueprint format from JSON structure
 */
export function detectBlueprintFormat(json: Record<string, unknown>): "v1" | "v2" {
  // V2 uses snake_case schema_version and has generation_rules
  if ("generation_rules" in json && "schema_version" in json) {
    return "v2";
  }
  // V1 uses camelCase schemaVersion and has characters.crewSlots
  return "v1";
}

/**
 * Load a book blueprint by book ID
 * Checks books/ folder first (V2), then book-blueprints/ (V1)
 */
export async function loadBlueprint(bookId: string): Promise<BookBlueprint> {
  const result = await loadBlueprintWithFormat(bookId);
  if (result.format === "v2") {
    throw new Error(`Blueprint "${bookId}" is V2 format. Use loadBlueprintWithFormat() instead.`);
  }
  return result.blueprint as BookBlueprint;
}

/**
 * Load a book blueprint with format detection
 * Returns both the blueprint and its format for proper handling
 */
export async function loadBlueprintWithFormat(bookId: string): Promise<BlueprintLoadResult> {
  // Check cache first
  const cached = blueprintCache.get(bookId);
  if (cached) {
    return cached;
  }

  // Check books/ folder first (V2 format)
  const v2Path = path.join(getBooksDir(), bookId, "blueprint.json");
  if (await fileExists(v2Path)) {
    const content = await fs.readFile(v2Path, "utf-8");
    const json = JSON.parse(content) as Record<string, unknown>;
    const format = detectBlueprintFormat(json);

    const result: BlueprintLoadResult = {
      blueprint: json as unknown as V2Blueprint,
      format,
      basePath: `/books/${bookId}`,
      bookId,
    };

    // Cache the result
    blueprintCache.set(bookId, result);
    return result;
  }

  // Fall back to book-blueprints/ (V1 format)
  const v1Path = path.join(getBlueprintsDir(), `${bookId}.json`);

  try {
    const content = await fs.readFile(v1Path, "utf-8");
    const blueprint = JSON.parse(content) as BookBlueprint;

    // Validate schema version
    if (blueprint.schemaVersion !== BLUEPRINT_SCHEMA_VERSION) {
      console.warn(
        `Blueprint ${bookId} has schema version ${blueprint.schemaVersion}, expected ${BLUEPRINT_SCHEMA_VERSION}`
      );
    }

    const result: BlueprintLoadResult = {
      blueprint,
      format: "v1",
      basePath: "/images",
      bookId,
    };

    // Cache the result
    blueprintCache.set(bookId, result);

    return result;
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
  identityProfile?: {
    hair: { color: string; style: string; length?: string };
    eyes: { color: string };
    skinTone: string;
    distinctiveFeatures?: string[];
  };
}

/**
 * Build the OpenAI image editing prompt from a blueprint page
 */
export function buildPromptFromBlueprint(
  blueprint: BookBlueprint,
  page: BlueprintPage,
  crewAssignments: CrewAssignment[]
): string {
  // Build crew replacement section with identity profiles
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

      // Build identity section if profile exists
      let identitySection = "";
      if (assignment.identityProfile) {
        const p = assignment.identityProfile;
        identitySection = `
  **LOCKED IDENTITY:**
  - Hair: ${p.hair.color}, ${p.hair.style}
  - Eyes: ${p.eyes.color}
  - Skin: ${p.skinTone}${p.distinctiveFeatures && p.distinctiveFeatures.length > 0 ? `
  - Features: ${p.distinctiveFeatures.join(", ")}` : ""}`;
      }

      return `- **${slot.archetype}** at ${placement.position} → Replace with **IMAGE ${assignment.imageIndex} "${assignment.characterName}"**
  Position: ${placement.position}
  Pose: ${placement.poseAction}
  Wardrobe: ${placement.wardrobe}
  Preserve guest's face, hair, eyes, skin tone. Match the pose and wardrobe exactly.${identitySection}`;
    })
    .filter(Boolean)
    .join("\n\n");

  // Build identity locking section for characters with confirmed profiles
  const charactersWithIdentity = crewAssignments.filter((a) => a.identityProfile);
  let identityLockingSection = "";
  if (charactersWithIdentity.length > 0) {
    const identityDetails = charactersWithIdentity
      .map((a) => {
        const p = a.identityProfile!;
        return `**${a.characterName} (IMAGE ${a.imageIndex})**
- Hair: ${p.hair.color}, ${p.hair.style}
- Eyes: ${p.eyes.color}
- Skin: ${p.skinTone}${p.distinctiveFeatures && p.distinctiveFeatures.length > 0 ? `
- Features: ${p.distinctiveFeatures.join(", ")}` : ""}`;
      })
      .join("\n\n");

    identityLockingSection = `

## LOCKED CUSTOMER CHARACTER IDENTITY — CRITICAL

Each customer character has an approved identity profile with locked physical attributes.

**CHARACTER IDENTITY DATA**

${identityDetails}

**HAIR COLOUR — LOCKED:** Reproduce exactly. No substitutions.
**EYE COLOUR — LOCKED:** Reproduce exactly. Do not match background/placeholder.
**SKIN TONE — LOCKED:** Maintain while allowing natural lighting.
**DISTINCTIVE FEATURES — LOCKED:** Preserve all listed features.

When references conflict, prioritize the identity profile over placeholder appearance.
`;
  }

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
${identityLockingSection}
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
 * Get the original image path for a blueprint page (V1)
 */
export function getOriginalImagePath(page: BlueprintPage): string {
  return `/images/${page.originalImage}`;
}

/**
 * Get the original image path for a V2 blueprint page
 */
export function getV2OriginalImagePath(bookId: string, page: V2Page): string {
  return `/books/${bookId}/${page.master_image_filename}`;
}

// ============================================
// V2 Blueprint Functions
// ============================================

/**
 * Get a specific page from a V2 blueprint by page number
 */
export function getV2Page(blueprint: V2Blueprint, pageNumber: number): V2Page | undefined {
  return blueprint.pages.find((p) => p.page_number === pageNumber);
}

/**
 * Get cover page from a V2 blueprint (page 1 is typically the cover/first page)
 */
export function getV2CoverPage(blueprint: V2Blueprint): V2Page | undefined {
  return blueprint.pages.find((p) => p.page_number === 1);
}

/**
 * List all available book IDs from both V1 and V2 directories
 */
export async function listAllAvailableBooks(): Promise<{ bookId: string; format: "v1" | "v2" }[]> {
  const results: { bookId: string; format: "v1" | "v2" }[] = [];

  // Get V1 books from book-blueprints/
  const blueprintsDir = getBlueprintsDir();
  try {
    const files = await fs.readdir(blueprintsDir);
    for (const f of files) {
      if (f.endsWith(".json")) {
        results.push({ bookId: f.replace(".json", ""), format: "v1" });
      }
    }
  } catch {
    // Directory doesn't exist, that's ok
  }

  // Get V2 books from books/
  const booksDir = getBooksDir();
  try {
    const folders = await fs.readdir(booksDir);
    for (const folder of folders) {
      const blueprintPath = path.join(booksDir, folder, "blueprint.json");
      if (await fileExists(blueprintPath)) {
        results.push({ bookId: folder, format: "v2" });
      }
    }
  } catch {
    // Directory doesn't exist, that's ok
  }

  return results;
}

// ============================================
// V2 Character Assignment
// ============================================

export interface V2Assignment {
  slotId: string;
  characterId: string;
  characterName: string;
  imageIndex: number;           // Reference image index in API call (2+)
  priority_rank: number;
  head_anchor: HeadAnchor;
  depth: string;
  action_and_location: string;
  importance: "primary" | "secondary" | "background";
  identityProfile?: {
    hair: { color: string; style: string; length?: string };
    eyes: { color: string };
    skinTone: string;
    distinctiveFeatures?: string[];
  };
}

interface V2CharacterInput {
  id: string;
  name: string;
  character_type?: string;
  pet_type?: string;
  age?: number | null;
  generated_image_url?: string;
  identity_profile?: {
    hair: { color: string; style: string; length?: string };
    eyes: { color: string };
    skinTone: string;
    distinctiveFeatures?: string[];
  } | null;
  identity_confirmed?: boolean;
}

/**
 * Categorize character by age for V2 slot matching
 */
function categorizeByAge(character: V2CharacterInput): "child" | "adult" | "unknown" {
  const { character_type, age } = character;

  // Pets are handled separately
  if (character_type === "pet") return "unknown";

  if (age !== null && age !== undefined) {
    return age < 18 ? "child" : "adult";
  }

  return "unknown";
}

/**
 * Assign customer characters to V2 slots based on age matching
 * Characters are assigned in the order provided by the customer
 */
export function assignCharactersToV2Slots(
  characters: V2CharacterInput[],
  blueprint: V2Blueprint,
  page: V2Page
): { assignments: V2Assignment[]; debugLog: string[]; nameMapping: NameMapping } {
  const assignments: V2Assignment[] = [];
  const usedSlots = new Set<string>();
  const usedCharacters = new Set<string>();
  const debugLog: string[] = [];
  const nameMapping: NameMapping = {};

  debugLog.push("=== V2 CHARACTER ASSIGNMENT ===");
  debugLog.push(`Page ${page.page_number}: "${page.title}"`);
  debugLog.push(`Characters on page: ${page.characters.length}`);
  debugLog.push(`Absent: ${page.absent_character_ids.join(", ") || "(none)"}`);

  // Get character definitions from blueprint
  const getSlotAge = (slotId: string): "child" | "adult" | "unknown" => {
    const def = blueprint.characters[slotId];
    if (!def) return "unknown";
    if (def.age !== undefined) {
      return def.age < 18 ? "child" : "adult";
    }
    // Infer from name
    if (slotId === "mum" || slotId === "dad") return "adult";
    return "unknown";
  };

  // Sort page characters by priority_rank (1 = most important)
  const sortedPageChars = [...page.characters].sort(
    (a, b) => a.priority_rank - b.priority_rank
  );

  // Build lists of child and adult slots on this page
  const childSlots: V2CharacterPlacement[] = [];
  const adultSlots: V2CharacterPlacement[] = [];

  for (const placement of sortedPageChars) {
    const slotAge = getSlotAge(placement.slot_id);
    if (slotAge === "child") {
      childSlots.push(placement);
    } else if (slotAge === "adult") {
      adultSlots.push(placement);
    }
  }

  // Categorize customer characters
  const childCustomers: V2CharacterInput[] = [];
  const adultCustomers: V2CharacterInput[] = [];
  const unknownCustomers: V2CharacterInput[] = [];

  for (const character of characters) {
    const category = categorizeByAge(character);
    if (category === "child") childCustomers.push(character);
    else if (category === "adult") adultCustomers.push(character);
    else unknownCustomers.push(character);
  }

  debugLog.push(`Child customers: ${childCustomers.map(c => c.name).join(", ") || "(none)"}`);
  debugLog.push(`Adult customers: ${adultCustomers.map(c => c.name).join(", ") || "(none)"}`);
  debugLog.push(`Child slots: ${childSlots.map(s => s.slot_id).join(", ") || "(none)"}`);
  debugLog.push(`Adult slots: ${adultSlots.map(s => s.slot_id).join(", ") || "(none)"}`);

  // Helper to create assignment
  const createAssignment = (
    character: V2CharacterInput,
    placement: V2CharacterPlacement,
    imageIndex: number
  ): V2Assignment => {
    const assignment: V2Assignment = {
      slotId: placement.slot_id,
      characterId: character.id,
      characterName: character.name,
      imageIndex,
      priority_rank: placement.priority_rank,
      head_anchor: placement.head_anchor,
      depth: placement.depth,
      action_and_location: placement.action_and_location,
      importance: placement.importance,
    };

    // Add identity profile if confirmed
    if (character.identity_profile && character.identity_confirmed) {
      assignment.identityProfile = character.identity_profile;
    }

    return assignment;
  };

  // Helper to get remaining slots (not yet used)
  const getRemainingSlots = () => sortedPageChars.filter(p => !usedSlots.has(p.slot_id));

  // Assign children to child slots first (in customer order)
  let imageIndex = 2; // Start at IMAGE 2 (IMAGE 1 is master page)
  for (let i = 0; i < childCustomers.length && i < childSlots.length; i++) {
    const character = childCustomers[i];
    const slot = childSlots[i];

    assignments.push(createAssignment(character, slot, imageIndex));
    usedSlots.add(slot.slot_id);
    usedCharacters.add(character.id);
    nameMapping[slot.slot_id] = character.name;
    debugLog.push(`Assigned child "${character.name}" -> ${slot.slot_id} (IMAGE ${imageIndex})`);
    imageIndex++;
  }

  // Assign adults to adult slots first (in customer order)
  for (let i = 0; i < adultCustomers.length && i < adultSlots.length; i++) {
    const character = adultCustomers[i];
    const slot = adultSlots[i];

    assignments.push(createAssignment(character, slot, imageIndex));
    usedSlots.add(slot.slot_id);
    usedCharacters.add(character.id);
    nameMapping[slot.slot_id] = character.name;
    debugLog.push(`Assigned adult "${character.name}" -> ${slot.slot_id} (IMAGE ${imageIndex})`);
    imageIndex++;
  }

  // OVERFLOW: Assign remaining children to any available slots
  for (const character of childCustomers) {
    if (usedCharacters.has(character.id)) continue;
    const slot = getRemainingSlots()[0];
    if (!slot) break;

    assignments.push(createAssignment(character, slot, imageIndex));
    usedSlots.add(slot.slot_id);
    usedCharacters.add(character.id);
    nameMapping[slot.slot_id] = character.name;
    debugLog.push(`Assigned child overflow "${character.name}" -> ${slot.slot_id} (IMAGE ${imageIndex})`);
    imageIndex++;
  }

  // OVERFLOW: Assign remaining adults to any available slots
  for (const character of adultCustomers) {
    if (usedCharacters.has(character.id)) continue;
    const slot = getRemainingSlots()[0];
    if (!slot) break;

    assignments.push(createAssignment(character, slot, imageIndex));
    usedSlots.add(slot.slot_id);
    usedCharacters.add(character.id);
    nameMapping[slot.slot_id] = character.name;
    debugLog.push(`Assigned adult overflow "${character.name}" -> ${slot.slot_id} (IMAGE ${imageIndex})`);
    imageIndex++;
  }

  // Fill remaining with unknown-age characters
  for (const character of unknownCustomers) {
    if (usedCharacters.has(character.id)) continue;
    const slot = getRemainingSlots()[0];
    if (!slot) break;

    assignments.push(createAssignment(character, slot, imageIndex));
    usedSlots.add(slot.slot_id);
    usedCharacters.add(character.id);
    nameMapping[slot.slot_id] = character.name;
    debugLog.push(`Assigned unknown "${character.name}" -> ${slot.slot_id} (IMAGE ${imageIndex})`);
    imageIndex++;
  }

  // Sort assignments by priority_rank for the prompt
  assignments.sort((a, b) => a.priority_rank - b.priority_rank);

  debugLog.push("--- FINAL ASSIGNMENTS ---");
  for (const a of assignments) {
    debugLog.push(`  IMAGE ${a.imageIndex}: "${a.characterName}" -> ${a.slotId} (priority ${a.priority_rank})`);
  }

  return { assignments, debugLog, nameMapping };
}

// ============================================
// V2 Prompt Builder
// ============================================

/**
 * Build the OpenAI image editing prompt from a V2 blueprint page
 * Includes enhanced details: head anchors, priority ranking, absent characters
 */
export function buildPromptFromV2Blueprint(
  blueprint: V2Blueprint,
  page: V2Page,
  assignments: V2Assignment[]
): string {
  // Sort by priority_rank for prompt order (1 = most important first)
  const sortedAssignments = [...assignments].sort((a, b) => a.priority_rank - b.priority_rank);

  // Build character replacement section with enhanced details
  const charReplacements = sortedAssignments
    .map((a) => {
      let identitySection = "";
      if (a.identityProfile) {
        const p = a.identityProfile;
        identitySection = `
  **LOCKED IDENTITY:**
  - Hair: ${p.hair.color}, ${p.hair.style}
  - Eyes: ${p.eyes.color}
  - Skin: ${p.skinTone}${p.distinctiveFeatures && p.distinctiveFeatures.length > 0 ? `
  - Features: ${p.distinctiveFeatures.join(", ")}` : ""}`;
      }

      return `**${a.slotId.toUpperCase()} (Priority ${a.priority_rank})**
- Replace with: **IMAGE ${a.imageIndex} "${a.characterName}"**
- Head anchor: (${a.head_anchor.x.toFixed(2)}, ${a.head_anchor.y.toFixed(2)})
- Depth: ${a.depth}
- Action: ${a.action_and_location}
- Importance: ${a.importance}${identitySection}`;
    })
    .join("\n\n");

  // Build identity locking section
  const charactersWithIdentity = sortedAssignments.filter((a) => a.identityProfile);
  let identityLockingSection = "";
  if (charactersWithIdentity.length > 0) {
    const identityDetails = charactersWithIdentity
      .map((a) => {
        const p = a.identityProfile!;
        return `**${a.characterName} (IMAGE ${a.imageIndex})**
- Hair: ${p.hair.color}, ${p.hair.style}
- Eyes: ${p.eyes.color}
- Skin: ${p.skinTone}${p.distinctiveFeatures && p.distinctiveFeatures.length > 0 ? `
- Features: ${p.distinctiveFeatures.join(", ")}` : ""}`;
      })
      .join("\n\n");

    identityLockingSection = `
## LOCKED CHARACTER IDENTITY — CRITICAL

Each customer character has an approved identity profile with locked physical attributes.

**CHARACTER IDENTITY DATA**

${identityDetails}

**HAIR COLOUR — LOCKED:** Reproduce exactly. No substitutions.
**EYE COLOUR — LOCKED:** Reproduce exactly. Do not match placeholder.
**SKIN TONE — LOCKED:** Maintain while allowing natural lighting.
**DISTINCTIVE FEATURES — LOCKED:** Preserve all listed features.

When references conflict, prioritize the identity profile over placeholder appearance.
`;
  }

  // Build absent characters warning
  let absentSection = "";
  if (page.absent_character_ids.length > 0) {
    absentSection = `
## ABSENT CHARACTERS — DO NOT ADD

The following characters do NOT appear in this scene:
${page.absent_character_ids.map((id) => `- ${id}`).join("\n")}

Do not add these characters to the image. They are intentionally absent from this page.
`;
  }

  // Build protected elements section
  const protectedSection = page.protected_non_swappable_elements.length > 0
    ? page.protected_non_swappable_elements.map((el) => `- ${el}`).join("\n")
    : "- Standard background and scenery";

  // Build unassigned slots section
  const assignedSlotIds = new Set(assignments.map((a) => a.slotId));
  const unassignedSlots = page.characters.filter(
    (c) => !assignedSlotIds.has(c.slot_id) && c.swappable
  );
  const unassignedSection = unassignedSlots.length > 0
    ? unassignedSlots
        .map((slot) => `- ${slot.slot_id} at (${slot.head_anchor.x.toFixed(2)}, ${slot.head_anchor.y.toFixed(2)}): ${slot.action_and_location}`)
        .join("\n")
    : "- None. All swappable positions have been assigned.";

  // Get page dimensions
  const dimensions = page.master_image_size || { width: 1536, height: 1024 };

  return `# STORYME V2 — PRECISION CHARACTER REPLACEMENT

You are editing an existing children's storybook illustration, NOT creating a new illustration.

## IMAGE INPUTS

- **IMAGE 1 — MASTER PAGE:** The original "${blueprint.title}" page ${page.page_number} illustration.
- **IMAGES 2+ — CUSTOMER CHARACTERS:** The personalised character references that must replace designated placeholder characters.

## VISUAL STYLE

${blueprint.visual_style}

Match all replacements to this exact visual style. The customer characters should look like they belong in this artwork.

## SCENE DESCRIPTION

${page.scene_description}

## PRIMARY OBJECTIVE

Produce a minimally modified version of IMAGE 1.

Change ONLY the designated swappable characters. Preserve everything else as closely as possible.

The finished illustration must look like the original page was carefully edited, not regenerated.

## CHARACTER REPLACEMENTS (by priority)

${charReplacements}

**HEAD ANCHOR REFERENCE:** The (x, y) coordinates indicate the approximate normalized head center position (0-1 range, origin top-left). Use this to locate and replace the correct character.

**PRIORITY GUIDANCE:** Priority 1 characters require the highest identity fidelity. Lower priority characters may have slightly more flexibility but must still preserve key features.

For every assigned character:

- Replace the placeholder character with the corresponding customer character reference.
- Preserve the customer's recognisable facial identity, hairstyle, eye colour, skin tone and distinctive features.
- Preserve the original character's position, scale, pose, action, body orientation and interaction with objects.
- Adapt the customer to the original page's illustration style, lighting and perspective.
- Do not duplicate characters or create additional versions of them.
${identityLockingSection}${absentSection}
## REMOVE UNASSIGNED POSITIONS

${unassignedSection}

Remove every placeholder character that is not assigned to a customer character.

Reconstruct the original scenery naturally behind removed characters.

## PROTECTED SCENE ELEMENTS

${protectedSection}

Do not modify, remove or redesign any of these elements.

## LOCKED MASTER COMPOSITION

Treat IMAGE 1 as the authoritative visual reference.

Preserve:

- Original canvas dimensions (${dimensions.width}x${dimensions.height})
- Aspect ratio (${(dimensions.width / dimensions.height).toFixed(2)})
- Camera angle, framing and perspective
- Background, scenery, architecture and landscape
- Props, uniforms, and environmental details
- Lighting, shadows, colours and textures
- Original illustration style and rendering technique
- All non-swappable people and objects

Do not redesign, reimagine, enhance, crop, zoom or rearrange the page.

## EDITING PRIORITY

1. Correct customer character identities matching their reference images (priority 1 first).
2. Correct replacement of assigned placeholder positions.
3. Complete removal of unassigned placeholder characters.
4. Preservation of protected elements and composition.

## FINAL REQUIREMENT

The result should appear nearly identical to IMAGE 1, except for the designated character replacements, removal of unassigned characters and necessary reconstruction of the areas they occupied.

Make the smallest possible visual changes needed to complete the task.`;
}
