/**
 * Page Generation Utilities
 * Shared logic for generating book pages (cover and interior)
 */

import { getOpenAI } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase/server";
import {
  loadBlueprintWithFormat,
  loadBlueprintPage,
  buildPromptFromBlueprint,
  buildPromptFromV2Blueprint,
  getOriginalImagePath,
  getV2OriginalImagePath,
  getV2Page,
  assignCharactersToV2Slots,
  resolveBookId,
  type CrewAssignment,
  type BookBlueprint,
  type BlueprintPage,
  type V2Blueprint,
  type V2Page,
  type V2Assignment,
  type NameMapping,
} from "@/lib/book-blueprints";
import {
  downloadImage,
  loadLocalImage,
  selectOutputSize,
  type ProcessedImage,
} from "@/lib/image-processing";
import type { PageStatus } from "@/lib/types";

// Character from database
export interface CharacterInput {
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

// Map customer character type to crew slot type
export function matchCharacterToSlotType(
  character: CharacterInput
): "adult" | "child" | "baby" | "dog" | "other" {
  const { character_type, pet_type, age } = character;

  if (character_type === "pet") {
    if (pet_type === "dog") return "dog";
    return "other";
  }
  if (character_type === "person") {
    if (age !== null && age !== undefined) {
      if (age < 2) return "baby";
      if (age < 18) return "child";
      return "adult";
    }
    return "child";
  }
  return "other";
}

// Assign customer characters to crew slots based on type matching
export function assignCharactersToSlots(
  characters: CharacterInput[],
  blueprint: BookBlueprint,
  page: BlueprintPage
): { assignments: CrewAssignment[]; debugLog: string[] } {
  const assignments: CrewAssignment[] = [];
  const usedSlots = new Set<string>();
  const usedCharacters = new Set<string>();
  const debugLog: string[] = [];

  debugLog.push("=== CHARACTER TO SLOT ASSIGNMENT ===");

  // Get available slots from the page's character placements
  const availableSlots = page.characterPlacements
    .map((placement) => {
      const slot = blueprint.characters.crewSlots.find(
        (s) => s.slotId === placement.slotId
      );
      return slot ? { placement, slot } : null;
    })
    .filter(Boolean) as { placement: typeof page.characterPlacements[0]; slot: typeof blueprint.characters.crewSlots[0] }[];

  // Sort slots by priority (required first)
  const sortedSlots = [...availableSlots].sort((a, b) => {
    if (a.slot.required && !b.slot.required) return -1;
    if (!a.slot.required && b.slot.required) return 1;
    return 0;
  });

  // First pass: exact type matching
  for (const character of characters) {
    if (usedCharacters.has(character.id)) continue;
    const charType = matchCharacterToSlotType(character);

    for (const { slot } of sortedSlots) {
      if (usedSlots.has(slot.slotId)) continue;
      if (slot.characterType === charType) {
        assignments.push({
          slotId: slot.slotId,
          characterId: character.id,
          characterName: character.name,
          imageIndex: assignments.length + 2,
        });
        usedSlots.add(slot.slotId);
        usedCharacters.add(character.id);
        debugLog.push(`Matched "${character.name}" (${charType}) -> ${slot.slotId}`);
        break;
      }
    }
  }

  // Second pass: fill remaining people into people slots
  for (const character of characters) {
    if (usedCharacters.has(character.id)) continue;
    const charType = matchCharacterToSlotType(character);
    const isPerson = charType === "adult" || charType === "child" || charType === "baby";
    if (!isPerson) continue;

    for (const { slot } of sortedSlots) {
      if (usedSlots.has(slot.slotId)) continue;
      const slotIsPeople = slot.characterType === "adult" || slot.characterType === "child" || slot.characterType === "baby";
      if (!slotIsPeople) continue;

      assignments.push({
        slotId: slot.slotId,
        characterId: character.id,
        characterName: character.name,
        imageIndex: assignments.length + 2,
      });
      usedSlots.add(slot.slotId);
      usedCharacters.add(character.id);
      debugLog.push(`Placed "${character.name}" (${charType}) -> ${slot.slotId}`);
      break;
    }
  }

  // Third pass: fill remaining pets into pet slots
  for (const character of characters) {
    if (usedCharacters.has(character.id)) continue;
    const charType = matchCharacterToSlotType(character);
    const isPet = charType === "dog" || charType === "other";
    if (!isPet) continue;

    for (const { slot } of sortedSlots) {
      if (usedSlots.has(slot.slotId)) continue;
      const slotIsPet = slot.characterType === "dog" || slot.characterType === "other";
      if (!slotIsPet) continue;

      assignments.push({
        slotId: slot.slotId,
        characterId: character.id,
        characterName: character.name,
        imageIndex: assignments.length + 2,
      });
      usedSlots.add(slot.slotId);
      usedCharacters.add(character.id);
      debugLog.push(`Placed pet "${character.name}" (${charType}) -> ${slot.slotId}`);
      break;
    }
  }

  // Enrich with identity profiles
  assignments.forEach((assignment) => {
    const char = characters.find((c) => c.id === assignment.characterId);
    if (char?.identity_profile && char?.identity_confirmed) {
      assignment.identityProfile = char.identity_profile as CrewAssignment["identityProfile"];
    }
  });

  return { assignments, debugLog };
}

// Result from generating a single page
export interface GeneratePageResult {
  success: boolean;
  pageId: string;
  pageNumber: number;
  url?: string;
  error?: string;
}

/**
 * Generate a single page (cover or interior) using the blueprint system
 * Supports both V1 and V2 blueprint formats
 */
export async function generateSinglePage(
  bookDbId: string,
  userId: string,
  pageId: string,
  blueprintBookId: string,
  characters: CharacterInput[],
  existingNameMapping?: NameMapping
): Promise<GeneratePageResult> {
  const resolvedBookId = resolveBookId(blueprintBookId);

  try {
    // Load blueprint with format detection
    const { blueprint: rawBlueprint, format, basePath } = await loadBlueprintWithFormat(resolvedBookId);

    // Handle V2 format
    if (format === "v2") {
      return await generateV2Page(
        rawBlueprint as V2Blueprint,
        resolvedBookId,
        bookDbId,
        userId,
        pageId,
        characters,
        existingNameMapping
      );
    }

    // V1 format
    const blueprint = rawBlueprint as BookBlueprint;
    const page = await loadBlueprintPage(resolvedBookId, pageId);

    // Check for original image
    if (!page.originalImage) {
      return {
        success: false,
        pageId,
        pageNumber: page.pageNumber,
        error: `Page "${pageId}" has no original image configured`,
      };
    }

    // Assign characters to slots
    const { assignments: crewAssignments, debugLog } = assignCharactersToSlots(
      characters,
      blueprint,
      page
    );
    console.log(debugLog.join("\n"));

    // Load master page image
    const masterImagePath = getOriginalImagePath(page);
    let masterPage: ProcessedImage;
    try {
      masterPage = await loadLocalImage(masterImagePath, `Master page (${pageId})`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        pageId,
        pageNumber: page.pageNumber,
        error: `Master image not found: ${msg}`,
      };
    }

    // Download character images
    const characterImages: ProcessedImage[] = [];
    for (const assignment of crewAssignments) {
      const character = characters.find((c) => c.id === assignment.characterId);
      if (character?.generated_image_url) {
        const image = await downloadImage(
          character.generated_image_url,
          `Character "${character.name}"`
        );
        characterImages.push(image);
      }
    }

    // Build prompt from blueprint
    const prompt = buildPromptFromBlueprint(blueprint, page, crewAssignments);
    console.log(`\n=== GENERATING ${pageId.toUpperCase()} ===`);
    console.log(`Prompt length: ${prompt.length} characters`);

    const openai = getOpenAI();

    // Build image array
    const allImageFiles: File[] = [];

    // IMAGE 1: Master page
    const masterBlob = new Blob([new Uint8Array(masterPage.buffer)], {
      type: "image/png",
    });
    const masterFile = new File([masterBlob], "1-master-page.png", {
      type: "image/png",
    });
    allImageFiles.push(masterFile);

    // IMAGES 2+: Character references
    characterImages.forEach((image, index) => {
      const assignment = crewAssignments[index];
      const imageNum = index + 2;
      const blob = new Blob([new Uint8Array(image.buffer)], { type: "image/png" });
      const charName = assignment.characterName.replace(/[^a-zA-Z0-9]/g, "-");
      const file = new File([blob], `${imageNum}-crew-${charName}.png`, {
        type: "image/png",
      });
      allImageFiles.push(file);
    });

    // Determine output size
    const outputSize = selectOutputSize(masterPage.dimensions);

    // Call OpenAI
    console.log(`Calling OpenAI images.edit for ${pageId}...`);
    const startTime = Date.now();

    const response = await openai.images.edit({
      model: "gpt-image-2.5-sunburst",
      image: allImageFiles,
      prompt,
      n: 1,
      size: outputSize as "1024x1024" | "1536x1024" | "1024x1536",
      quality: "high",
      output_format: "jpeg",
    });

    const elapsedTime = Date.now() - startTime;
    console.log(`OpenAI response in ${elapsedTime}ms for ${pageId}`);

    const imageData = response.data?.[0];
    let outputBuffer: Buffer | null = null;

    if (imageData?.b64_json) {
      outputBuffer = Buffer.from(imageData.b64_json, "base64");
    } else if (imageData?.url) {
      const imgResponse = await fetch(imageData.url);
      if (!imgResponse.ok) {
        throw new Error(`Failed to download generated image: ${imgResponse.status}`);
      }
      outputBuffer = Buffer.from(await imgResponse.arrayBuffer());
    }

    if (!outputBuffer) {
      throw new Error("OpenAI returned no image data");
    }

    // Upload to storage
    const serviceClient = createServiceClient();
    const fileName = `${userId}/${bookDbId}/${pageId}.jpg`;
    const { error: uploadError } = await serviceClient.storage
      .from("previews")
      .upload(fileName, outputBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = serviceClient.storage
      .from("previews")
      .getPublicUrl(fileName);

    console.log(`${pageId} uploaded: ${publicUrl}`);

    return {
      success: true,
      pageId,
      pageNumber: page.pageNumber,
      url: publicUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error generating ${pageId}:`, errorMessage);
    return {
      success: false,
      pageId,
      pageNumber: 0,
      error: errorMessage,
    };
  }
}

/**
 * Generate a single V2 page
 */
async function generateV2Page(
  blueprint: V2Blueprint,
  bookId: string,
  bookDbId: string,
  userId: string,
  pageId: string,
  characters: CharacterInput[],
  existingNameMapping?: NameMapping
): Promise<GeneratePageResult> {
  // V2 pageId format: "page-N" where N is the page number
  const pageNumber = parseInt(pageId.replace("page-", ""), 10);
  if (isNaN(pageNumber)) {
    return {
      success: false,
      pageId,
      pageNumber: 0,
      error: `Invalid V2 page ID format: ${pageId}. Expected "page-N".`,
    };
  }

  const page = getV2Page(blueprint, pageNumber);
  if (!page) {
    return {
      success: false,
      pageId,
      pageNumber,
      error: `V2 page ${pageNumber} not found in blueprint`,
    };
  }

  // Check for master image
  if (!page.master_image_filename) {
    return {
      success: false,
      pageId,
      pageNumber,
      error: `V2 page ${pageNumber} has no master_image_filename`,
    };
  }

  // Assign characters to slots for this page
  const { assignments, debugLog, nameMapping } = assignCharactersToV2Slots(
    characters,
    blueprint,
    page
  );

  // Use existing name mapping if provided (for consistency across pages)
  const finalNameMapping = existingNameMapping || nameMapping;

  console.log(`\n=== V2 PAGE ${pageNumber} GENERATION ===`);
  console.log(debugLog.join("\n"));

  // Load master page image
  const masterImagePath = getV2OriginalImagePath(bookId, page);
  let masterPage: ProcessedImage;
  try {
    masterPage = await loadLocalImage(masterImagePath, `V2 Master page ${pageNumber}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      pageId,
      pageNumber,
      error: `V2 Master image not found: ${msg}`,
    };
  }

  // Download character images for characters on this page
  const characterImages: ProcessedImage[] = [];
  for (const assignment of assignments) {
    const character = characters.find((c) => c.id === assignment.characterId);
    if (character?.generated_image_url) {
      const image = await downloadImage(
        character.generated_image_url,
        `Character "${character.name}"`
      );
      characterImages.push(image);
    }
  }

  // Build V2 prompt
  const prompt = buildPromptFromV2Blueprint(blueprint, page, assignments);
  console.log(`V2 Prompt length: ${prompt.length} characters`);

  const openai = getOpenAI();

  // Build image array
  const allImageFiles: File[] = [];

  // IMAGE 1: Master page
  const masterBlob = new Blob([new Uint8Array(masterPage.buffer)], {
    type: "image/png",
  });
  const masterFile = new File([masterBlob], "1-master-page.png", {
    type: "image/png",
  });
  allImageFiles.push(masterFile);

  // IMAGES 2+: Character references
  characterImages.forEach((image, index) => {
    const assignment = assignments[index];
    const imageNum = index + 2;
    const blob = new Blob([new Uint8Array(image.buffer)], { type: "image/png" });
    const charName = assignment.characterName.replace(/[^a-zA-Z0-9]/g, "-");
    const file = new File([blob], `${imageNum}-char-${charName}.png`, {
      type: "image/png",
    });
    allImageFiles.push(file);
  });

  // Determine output size
  const outputSize = selectOutputSize(masterPage.dimensions);

  // Call OpenAI
  console.log(`Calling OpenAI images.edit for V2 page ${pageNumber}...`);
  const startTime = Date.now();

  const response = await openai.images.edit({
    model: "gpt-image-2.5-sunburst",
    image: allImageFiles,
    prompt,
    n: 1,
    size: outputSize as "1024x1024" | "1536x1024" | "1024x1536",
    quality: "high",
    output_format: "jpeg",
  });

  const elapsedTime = Date.now() - startTime;
  console.log(`V2 OpenAI response in ${elapsedTime}ms for page ${pageNumber}`);

  const imageData = response.data?.[0];
  let outputBuffer: Buffer | null = null;

  if (imageData?.b64_json) {
    outputBuffer = Buffer.from(imageData.b64_json, "base64");
  } else if (imageData?.url) {
    const imgResponse = await fetch(imageData.url);
    if (!imgResponse.ok) {
      throw new Error(`Failed to download generated image: ${imgResponse.status}`);
    }
    outputBuffer = Buffer.from(await imgResponse.arrayBuffer());
  }

  if (!outputBuffer) {
    throw new Error("OpenAI returned no image data for V2 page");
  }

  // Upload to storage
  const serviceClient = createServiceClient();
  const fileName = `${userId}/${bookDbId}/${pageId}.jpg`;
  const { error: uploadError } = await serviceClient.storage
    .from("previews")
    .upload(fileName, outputBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`V2 Storage upload failed: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = serviceClient.storage
    .from("previews")
    .getPublicUrl(fileName);

  console.log(`V2 Page ${pageNumber} uploaded: ${publicUrl}`);

  return {
    success: true,
    pageId,
    pageNumber,
    url: publicUrl,
  };
}

/**
 * Get list of pages that can be generated for a book
 * Only returns pages that have originalImage defined
 * Supports both V1 and V2 blueprint formats
 */
export async function getGeneratablePages(
  blueprintBookId: string
): Promise<{ pageId: string; pageNumber: number; hasImage: boolean; title?: string }[]> {
  const resolvedBookId = resolveBookId(blueprintBookId);

  try {
    const { blueprint: rawBlueprint, format } = await loadBlueprintWithFormat(resolvedBookId);

    if (format === "v2") {
      const blueprint = rawBlueprint as V2Blueprint;
      return blueprint.pages.map((page) => ({
        pageId: `page-${page.page_number}`,
        pageNumber: page.page_number,
        hasImage: !!page.master_image_filename,
        title: page.title,
      }));
    }

    // V1 format
    const blueprint = rawBlueprint as BookBlueprint;
    return blueprint.pages.map((page) => ({
      pageId: page.pageId,
      pageNumber: page.pageNumber,
      hasImage: !!page.originalImage,
    }));
  } catch {
    return [];
  }
}

/**
 * Initialize page statuses for a book
 */
export function initializePageStatuses(
  pages: { pageId: string; pageNumber: number; hasImage: boolean }[],
  coverUrl?: string
): PageStatus[] {
  return pages.map((page) => ({
    pageId: page.pageId,
    pageNumber: page.pageNumber,
    status: page.pageId === "cover" && coverUrl ? "completed" : "pending",
    url: page.pageId === "cover" ? coverUrl : undefined,
    retryCount: 0,
  }));
}
