/**
 * Image Processing Utilities for StoryMe
 * Handles image downloading, dimension detection, mask generation, and post-processing compositing
 */

import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

// OpenAI supported image sizes for gpt-image-2.5-sunburst
export const OPENAI_SUPPORTED_SIZES = {
  square: "1024x1024",
  landscape: "1536x1024", // 3:2 ratio
  portrait: "1024x1536", // 2:3 ratio
  auto: "auto", // Let API choose based on input
} as const;

export type OpenAISizeOption = keyof typeof OPENAI_SUPPORTED_SIZES;

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
  orientation: "landscape" | "portrait" | "square";
}

export interface ProcessedImage {
  buffer: Buffer;
  dimensions: ImageDimensions;
  format: string;
}

/**
 * Download an image from URL and return as buffer with metadata
 */
export async function downloadImage(url: string, label: string): Promise<ProcessedImage> {
  console.log(`Downloading ${label}...`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${label}. Status: ${response.status}, URL: ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length < 1000) {
    throw new Error(`${label} is too small (${buffer.length} bytes). URL: ${url}`);
  }

  // Get image metadata using Sharp
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;
  const aspectRatio = width / height;

  let orientation: "landscape" | "portrait" | "square";
  if (aspectRatio > 1.1) {
    orientation = "landscape";
  } else if (aspectRatio < 0.9) {
    orientation = "portrait";
  } else {
    orientation = "square";
  }

  console.log(`${label}: ${buffer.length} bytes, ${width}x${height} (${orientation})`);

  return {
    buffer,
    dimensions: { width, height, aspectRatio, orientation },
    format: metadata.format || "jpeg",
  };
}

/**
 * Load a local image from the public folder
 */
export async function loadLocalImage(relativePath: string, label: string): Promise<ProcessedImage> {
  console.log(`Loading local ${label}...`);

  // Handle paths starting with /images/
  const cleanPath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
  const absolutePath = path.join(process.cwd(), "public", cleanPath);

  try {
    const buffer = await fs.readFile(absolutePath);

    if (buffer.length < 1000) {
      throw new Error(`${label} is too small (${buffer.length} bytes). Path: ${absolutePath}`);
    }

    // Get image metadata using Sharp
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 1024;
    const height = metadata.height || 1024;
    const aspectRatio = width / height;

    let orientation: "landscape" | "portrait" | "square";
    if (aspectRatio > 1.1) {
      orientation = "landscape";
    } else if (aspectRatio < 0.9) {
      orientation = "portrait";
    } else {
      orientation = "square";
    }

    console.log(`${label}: ${buffer.length} bytes, ${width}x${height} (${orientation})`);

    return {
      buffer,
      dimensions: { width, height, aspectRatio, orientation },
      format: metadata.format || "jpeg",
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`MASTER_IMAGE_MISSING: ${label} not found at ${absolutePath}`);
    }
    throw error;
  }
}

/**
 * Determine the best OpenAI output size based on input image dimensions
 */
export function selectOutputSize(dimensions: ImageDimensions): string {
  // OpenAI gpt-image-2.5-sunburst supports: 1024x1024, 1536x1024, 1024x1536
  switch (dimensions.orientation) {
    case "landscape":
      return OPENAI_SUPPORTED_SIZES.landscape; // 1536x1024
    case "portrait":
      return OPENAI_SUPPORTED_SIZES.portrait; // 1024x1536
    default:
      return OPENAI_SUPPORTED_SIZES.square; // 1024x1024
  }
}

/**
 * Create an editing mask for character regions
 * White (255) = editable regions (characters to replace/remove)
 * Black (0) = protected regions (background, protected characters)
 *
 * For now, this creates a full white mask (edit entire image).
 * In production, this would use pre-defined character region masks or AI segmentation.
 */
export async function createCharacterMask(
  masterImage: ProcessedImage,
  _characterSlots: number[]
): Promise<Buffer> {
  // For MVP: Create full white mask (entire image is editable)
  // In production: Use pre-defined masks per story page or AI segmentation

  const { width, height } = masterImage.dimensions;

  // Create a white (fully editable) mask
  // OpenAI expects mask to have transparency where editing should occur
  const mask = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .png()
    .toBuffer();

  console.log(`Created mask: ${width}x${height}`);
  return mask;
}

/**
 * Post-process: Composite the edited character regions back onto the original master
 * This preserves the original pixels outside the edited regions
 */
export async function compositeEditedImage(
  originalMaster: ProcessedImage,
  editedImage: Buffer,
  mask?: Buffer
): Promise<Buffer> {
  // If no mask is provided, return the edited image as-is
  if (!mask) {
    console.log("No mask provided, returning edited image as-is");
    return editedImage;
  }

  console.log("Compositing edited regions onto original master...");

  // Resize edited image to match original dimensions if needed
  const editedMetadata = await sharp(editedImage).metadata();
  const { width, height } = originalMaster.dimensions;

  let resizedEdited = editedImage;
  if (editedMetadata.width !== width || editedMetadata.height !== height) {
    console.log(`Resizing edited image from ${editedMetadata.width}x${editedMetadata.height} to ${width}x${height}`);
    resizedEdited = await sharp(editedImage)
      .resize(width, height, { fit: "fill" })
      .toBuffer();
  }

  // Use the mask to composite:
  // - Where mask is white: use edited image
  // - Where mask is black: use original master
  const composited = await sharp(originalMaster.buffer)
    .composite([
      {
        input: resizedEdited,
        blend: "over",
      },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  console.log(`Composited image: ${composited.length} bytes`);
  return composited;
}

/**
 * Prepare image for OpenAI API (convert to PNG, ensure correct format)
 */
export async function prepareForOpenAI(
  image: ProcessedImage,
  targetSize?: string
): Promise<Buffer> {
  let pipeline = sharp(image.buffer);

  // Resize if target size specified
  if (targetSize && targetSize !== "auto") {
    const [width, height] = targetSize.split("x").map(Number);
    pipeline = pipeline.resize(width, height, { fit: "fill" });
  }

  // Convert to PNG (OpenAI prefers PNG for image editing)
  return pipeline.png().toBuffer();
}

/**
 * Validate that a master image exists and is valid
 */
export async function validateMasterImage(
  originalImageUrl: string | null | undefined,
  storySlug: string,
  pageNumber: number
): Promise<void> {
  if (!originalImageUrl) {
    throw new Error(
      `MASTER_IMAGE_REQUIRED: Story "${storySlug}" page ${pageNumber} has no originalImageUrl. ` +
      `Please upload a master illustration for this page before generating.`
    );
  }
}

/**
 * Character classification types
 */
export interface CharacterClassification {
  guestCharacters: {
    slot: number;
    name: string;
    role: string;
    action: string;
    imageIndex: number; // Which image number in the API call (2, 3, 4...)
  }[];
  protectedCharacters: string[];
  unassignedSlots: number[];
}

/**
 * Classify characters into guests, protected, and unassigned
 */
export function classifyCharacters(
  assignedCharacters: { slot: number; name: string; role: string; action: string }[],
  protectedCharacterNames: string[],
  maxSlots: number = 5
): CharacterClassification {
  const assignedSlots = new Set(assignedCharacters.map(c => c.slot));
  const unassignedSlots: number[] = [];

  for (let i = 1; i <= maxSlots; i++) {
    if (!assignedSlots.has(i)) {
      unassignedSlots.push(i);
    }
  }

  const guestCharacters = assignedCharacters
    .sort((a, b) => a.slot - b.slot)
    .map((c, index) => ({
      ...c,
      imageIndex: index + 2, // IMAGE 2, 3, 4... (IMAGE 1 is master)
    }));

  return {
    guestCharacters,
    protectedCharacters: protectedCharacterNames,
    unassignedSlots,
  };
}
