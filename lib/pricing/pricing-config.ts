/**
 * Pricing Configuration Types and Constants
 *
 * Centralized pricing configuration for OpenAI API cost tracking.
 * These values should match the pricing_config database table.
 */

// Current pricing version
export const CURRENT_PRICING_VERSION = "2026-11";

// Model identifiers used in the application
export type ModelId = "gpt-4o" | "gpt-image-2" | "gpt-image-2.5-sunburst";

// Image sizes supported by OpenAI
export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";

// Image quality levels
export type ImageQuality = "high" | "low";

// Pricing type for different models
export type PricingType = "per_token" | "flat_rate";

// Generation event types (matches generation_logs.event_type)
export type GenerationEventType =
  | "cover_generate"
  | "cover_regenerate"
  | "page_generate"
  | "page_regenerate"
  | "caricature_generate"
  | "caricature_regenerate";

// Token-based pricing configuration
export interface TokenPricing {
  pricingType: "per_token";
  inputCostPer1MTokens: number;
  outputCostPer1MTokens: number;
}

// Flat-rate image pricing configuration
export interface ImagePricing {
  pricingType: "flat_rate";
  baseCost: number;
  sizeCosts: {
    "1024x1024": number;
    "1536x1024": number;
    "1024x1536": number;
  };
  qualityMultipliers: {
    high: number;
    low: number;
  };
}

export type ModelPricing = TokenPricing | ImagePricing;

// Hardcoded fallback pricing (used if database lookup fails)
// Keep in sync with 019_pricing_config.sql seed data
export const FALLBACK_PRICING: Record<ModelId, ModelPricing> = {
  // GPT-4o - used for photo analysis
  "gpt-4o": {
    pricingType: "per_token",
    inputCostPer1MTokens: 2.50,
    outputCostPer1MTokens: 10.00,
  },

  // GPT-Image-2 - used for character caricatures
  "gpt-image-2": {
    pricingType: "flat_rate",
    baseCost: 0.040,
    sizeCosts: {
      "1024x1024": 0.040,
      "1536x1024": 0.050,
      "1024x1536": 0.050,
    },
    qualityMultipliers: {
      high: 1.0,
      low: 0.5,
    },
  },

  // GPT-Image-2.5-Sunburst - used for book pages
  "gpt-image-2.5-sunburst": {
    pricingType: "flat_rate",
    baseCost: 0.080,
    sizeCosts: {
      "1024x1024": 0.080,
      "1536x1024": 0.100,
      "1024x1536": 0.100,
    },
    qualityMultipliers: {
      high: 1.0,
      low: 0.5,
    },
  },
};

// Estimated token counts for common operations
// These are rough estimates for cost calculation
export const ESTIMATED_TOKENS = {
  // Photo analysis (GPT-4o Vision)
  photoAnalysis: {
    // Image tokens depend on size, ~765 for 512x512
    inputImageTokens: 800,
    // Prompt tokens (the analysis request)
    inputPromptTokens: 500,
    // Response tokens (JSON output)
    outputTokens: 300,
  },

  // Character generation prompt (doesn't directly use tokens for image models)
  // But we track prompt length for analytics
  characterGeneration: {
    promptCharacters: 4000,
  },

  // Book page generation prompt
  pageGeneration: {
    promptCharacters: 6000,
  },
};

// Map event types to their typical model and configuration
export const EVENT_TYPE_CONFIG: Record<GenerationEventType, {
  model: ModelId;
  defaultSize: ImageSize;
  defaultQuality: ImageQuality;
}> = {
  cover_generate: {
    model: "gpt-image-2.5-sunburst",
    defaultSize: "1536x1024",
    defaultQuality: "high",
  },
  cover_regenerate: {
    model: "gpt-image-2.5-sunburst",
    defaultSize: "1536x1024",
    defaultQuality: "high",
  },
  page_generate: {
    model: "gpt-image-2.5-sunburst",
    defaultSize: "1536x1024",
    defaultQuality: "high",
  },
  page_regenerate: {
    model: "gpt-image-2.5-sunburst",
    defaultSize: "1536x1024",
    defaultQuality: "high",
  },
  caricature_generate: {
    model: "gpt-image-2",
    defaultSize: "1024x1024",
    defaultQuality: "low",
  },
  caricature_regenerate: {
    model: "gpt-image-2",
    defaultSize: "1024x1024",
    defaultQuality: "low",
  },
};

// Cost calculation result
export interface CostCalculation {
  estimatedCostUsd: number;
  pricingVersion: string;
  calculationMethod: "estimated" | "actual" | "flat_rate";
  model: ModelId;
  inputTokens?: number;
  outputTokens?: number;
  imageSize?: ImageSize;
  imageQuality?: ImageQuality;
}
