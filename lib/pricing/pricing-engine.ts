/**
 * Pricing Engine
 *
 * Core logic for calculating API costs based on model, size, and quality.
 */

import {
  CURRENT_PRICING_VERSION,
  FALLBACK_PRICING,
  EVENT_TYPE_CONFIG,
  ESTIMATED_TOKENS,
  type ModelId,
  type ImageSize,
  type ImageQuality,
  type GenerationEventType,
  type CostCalculation,
  type ModelPricing,
  type TokenPricing,
  type ImagePricing,
} from "./pricing-config";

/**
 * Calculate cost for a token-based model (e.g., GPT-4o)
 */
export function calculateTokenCost(
  pricing: TokenPricing,
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = (inputTokens / 1_000_000) * pricing.inputCostPer1MTokens;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputCostPer1MTokens;
  return inputCost + outputCost;
}

/**
 * Calculate cost for an image-based model
 */
export function calculateImageCost(
  pricing: ImagePricing,
  size: ImageSize,
  quality: ImageQuality
): number {
  const baseCost = pricing.sizeCosts[size] || pricing.baseCost;
  const multiplier = pricing.qualityMultipliers[quality] || 1.0;
  return baseCost * multiplier;
}

/**
 * Get pricing for a model (uses fallback if not found in database)
 */
export function getModelPricing(model: ModelId): ModelPricing {
  return FALLBACK_PRICING[model];
}

/**
 * Calculate cost for a generation event
 *
 * @param eventType - The type of generation event
 * @param options - Optional overrides for model, size, quality, tokens
 * @returns CostCalculation with estimated cost and metadata
 */
export function calculateCost(
  eventType: GenerationEventType,
  options?: {
    model?: ModelId;
    imageSize?: ImageSize;
    imageQuality?: ImageQuality;
    inputTokens?: number;
    outputTokens?: number;
  }
): CostCalculation {
  const config = EVENT_TYPE_CONFIG[eventType];
  const model = options?.model || config.model;
  const pricing = getModelPricing(model);

  if (pricing.pricingType === "per_token") {
    // Token-based model (GPT-4o for photo analysis)
    const inputTokens = options?.inputTokens ?? (
      ESTIMATED_TOKENS.photoAnalysis.inputImageTokens +
      ESTIMATED_TOKENS.photoAnalysis.inputPromptTokens
    );
    const outputTokens = options?.outputTokens ?? ESTIMATED_TOKENS.photoAnalysis.outputTokens;

    const cost = calculateTokenCost(pricing, inputTokens, outputTokens);

    return {
      estimatedCostUsd: Math.round(cost * 1_000_000) / 1_000_000, // Round to 6 decimal places
      pricingVersion: CURRENT_PRICING_VERSION,
      calculationMethod: options?.inputTokens ? "actual" : "estimated",
      model,
      inputTokens,
      outputTokens,
    };
  } else {
    // Flat-rate image model
    const imageSize = options?.imageSize || config.defaultSize;
    const imageQuality = options?.imageQuality || config.defaultQuality;

    const cost = calculateImageCost(pricing, imageSize, imageQuality);

    return {
      estimatedCostUsd: Math.round(cost * 1_000_000) / 1_000_000,
      pricingVersion: CURRENT_PRICING_VERSION,
      calculationMethod: "flat_rate",
      model,
      imageSize,
      imageQuality,
    };
  }
}

/**
 * Calculate cost for photo analysis (GPT-4o Vision)
 * This is called separately from image generation
 */
export function calculatePhotoAnalysisCost(options?: {
  inputTokens?: number;
  outputTokens?: number;
}): CostCalculation {
  const pricing = getModelPricing("gpt-4o") as TokenPricing;

  const inputTokens = options?.inputTokens ?? (
    ESTIMATED_TOKENS.photoAnalysis.inputImageTokens +
    ESTIMATED_TOKENS.photoAnalysis.inputPromptTokens
  );
  const outputTokens = options?.outputTokens ?? ESTIMATED_TOKENS.photoAnalysis.outputTokens;

  const cost = calculateTokenCost(pricing, inputTokens, outputTokens);

  return {
    estimatedCostUsd: Math.round(cost * 1_000_000) / 1_000_000,
    pricingVersion: CURRENT_PRICING_VERSION,
    calculationMethod: options?.inputTokens ? "actual" : "estimated",
    model: "gpt-4o",
    inputTokens,
    outputTokens,
  };
}

/**
 * Calculate cost for character caricature generation
 */
export function calculateCaricatureCost(options?: {
  imageSize?: ImageSize;
  imageQuality?: ImageQuality;
}): CostCalculation {
  return calculateCost("caricature_generate", {
    imageSize: options?.imageSize || "1024x1024",
    imageQuality: options?.imageQuality || "low",
  });
}

/**
 * Calculate cost for book page generation (cover or interior)
 */
export function calculateBookPageCost(
  isCover: boolean,
  options?: {
    imageSize?: ImageSize;
    imageQuality?: ImageQuality;
  }
): CostCalculation {
  const eventType = isCover ? "cover_generate" : "page_generate";
  return calculateCost(eventType, {
    imageSize: options?.imageSize || "1536x1024",
    imageQuality: options?.imageQuality || "high",
  });
}

/**
 * Estimate total cost for generating a full book
 */
export function estimateBookCost(
  pageCount: number,
  options?: {
    imageSize?: ImageSize;
    imageQuality?: ImageQuality;
  }
): {
  coverCost: CostCalculation;
  interiorPagesCost: CostCalculation;
  totalCostUsd: number;
} {
  const coverCost = calculateBookPageCost(true, options);
  const singlePageCost = calculateBookPageCost(false, options);

  // Interior pages = total pages - 1 cover
  const interiorPageCount = Math.max(0, pageCount - 1);
  const interiorTotalCost = singlePageCost.estimatedCostUsd * interiorPageCount;

  return {
    coverCost,
    interiorPagesCost: {
      ...singlePageCost,
      estimatedCostUsd: interiorTotalCost,
    },
    totalCostUsd: coverCost.estimatedCostUsd + interiorTotalCost,
  };
}

/**
 * Parse image size string to typed value
 */
export function parseImageSize(sizeString?: string): ImageSize {
  if (sizeString === "1024x1024" || sizeString === "1536x1024" || sizeString === "1024x1536") {
    return sizeString;
  }
  return "1024x1024"; // Default
}

/**
 * Parse image quality string to typed value
 */
export function parseImageQuality(qualityString?: string): ImageQuality {
  if (qualityString === "high" || qualityString === "low") {
    return qualityString;
  }
  return "high"; // Default
}
