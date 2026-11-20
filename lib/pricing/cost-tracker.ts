/**
 * Cost Tracker
 *
 * Integration between the pricing engine and generation logs.
 * Provides utilities for tracking and updating costs in the database.
 */

import { createServiceClient } from "@/lib/supabase/server";
import {
  calculateCost,
  calculatePhotoAnalysisCost,
  parseImageSize,
  parseImageQuality,
} from "./pricing-engine";
import type {
  GenerationEventType,
  CostCalculation,
  ImageSize,
  ImageQuality,
} from "./pricing-config";

/**
 * Calculate and return cost data for a generation event
 * This can be used when starting a generation log
 */
export function getCostDataForEvent(
  eventType: GenerationEventType,
  options?: {
    imageSize?: string;
    imageQuality?: string;
    inputTokens?: number;
    outputTokens?: number;
  }
): {
  estimated_cost_usd: number;
  pricing_version: string;
  cost_calculation_method: string;
  input_tokens?: number;
  output_tokens?: number;
} {
  const calculation = calculateCost(eventType, {
    imageSize: parseImageSize(options?.imageSize),
    imageQuality: parseImageQuality(options?.imageQuality),
    inputTokens: options?.inputTokens,
    outputTokens: options?.outputTokens,
  });

  return {
    estimated_cost_usd: calculation.estimatedCostUsd,
    pricing_version: calculation.pricingVersion,
    cost_calculation_method: calculation.calculationMethod,
    input_tokens: calculation.inputTokens,
    output_tokens: calculation.outputTokens,
  };
}

/**
 * Calculate cost for photo analysis and return cost data
 */
export function getPhotoAnalysisCostData(options?: {
  inputTokens?: number;
  outputTokens?: number;
}): {
  estimated_cost_usd: number;
  pricing_version: string;
  cost_calculation_method: string;
  input_tokens: number;
  output_tokens: number;
} {
  const calculation = calculatePhotoAnalysisCost(options);

  return {
    estimated_cost_usd: calculation.estimatedCostUsd,
    pricing_version: calculation.pricingVersion,
    cost_calculation_method: calculation.calculationMethod,
    input_tokens: calculation.inputTokens!,
    output_tokens: calculation.outputTokens!,
  };
}

/**
 * Update an existing generation log with cost data
 * Useful for adding cost after the fact or updating with actual values
 */
export async function updateLogWithCost(
  logId: string,
  costData: {
    estimated_cost_usd?: number;
    pricing_version?: string;
    cost_calculation_method?: string;
    input_tokens?: number;
    output_tokens?: number;
  }
): Promise<void> {
  try {
    const supabase = createServiceClient();

    await supabase
      .from("generation_logs")
      .update(costData)
      .eq("id", logId);
  } catch (err) {
    console.error("Error updating log with cost:", err);
  }
}

/**
 * Backfill costs for existing generation logs that don't have cost data
 * This is a one-time migration utility
 */
export async function backfillCosts(options?: {
  limit?: number;
  dryRun?: boolean;
}): Promise<{
  processed: number;
  updated: number;
  errors: number;
}> {
  const supabase = createServiceClient();
  const limit = options?.limit || 1000;
  const dryRun = options?.dryRun ?? false;

  // Find logs without cost data
  const { data: logs, error } = await supabase
    .from("generation_logs")
    .select("id, event_type, image_size, model_used, status")
    .is("estimated_cost_usd", null)
    .limit(limit);

  if (error) {
    console.error("Error fetching logs for backfill:", error);
    return { processed: 0, updated: 0, errors: 1 };
  }

  if (!logs || logs.length === 0) {
    console.log("No logs found without cost data");
    return { processed: 0, updated: 0, errors: 0 };
  }

  let updated = 0;
  let errors = 0;

  for (const log of logs) {
    try {
      // Only calculate cost for completed generations
      if (log.status !== "completed") {
        continue;
      }

      const costData = getCostDataForEvent(
        log.event_type as GenerationEventType,
        {
          imageSize: log.image_size || undefined,
        }
      );

      if (!dryRun) {
        await updateLogWithCost(log.id, costData);
      }

      updated++;
      console.log(`${dryRun ? "[DRY RUN] " : ""}Updated log ${log.id}: $${costData.estimated_cost_usd.toFixed(6)}`);
    } catch (err) {
      console.error(`Error processing log ${log.id}:`, err);
      errors++;
    }
  }

  return {
    processed: logs.length,
    updated,
    errors,
  };
}

/**
 * Get total cost summary for a user
 */
export async function getUserCostSummary(
  userId: string
): Promise<{
  totalCostUsd: number;
  totalRequests: number;
  successfulRequests: number;
  avgCostPerRequest: number;
} | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("generation_logs")
      .select("estimated_cost_usd, status")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user cost summary:", error);
      return null;
    }

    const completed = data.filter((log) => log.status === "completed");
    const totalCostUsd = completed.reduce(
      (sum, log) => sum + (log.estimated_cost_usd || 0),
      0
    );

    return {
      totalCostUsd,
      totalRequests: data.length,
      successfulRequests: completed.length,
      avgCostPerRequest:
        completed.length > 0 ? totalCostUsd / completed.length : 0,
    };
  } catch (err) {
    console.error("Error calculating user cost summary:", err);
    return null;
  }
}

/**
 * Get total cost summary for a book
 */
export async function getBookCostSummary(
  bookId: string
): Promise<{
  totalCostUsd: number;
  coverCost: number;
  interiorPagesCost: number;
  totalPages: number;
  regenerationCost: number;
} | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("generation_logs")
      .select("event_type, estimated_cost_usd, page_number, is_regenerate, status")
      .eq("book_id", bookId)
      .eq("status", "completed");

    if (error) {
      console.error("Error fetching book cost summary:", error);
      return null;
    }

    let coverCost = 0;
    let interiorPagesCost = 0;
    let regenerationCost = 0;

    for (const log of data) {
      const cost = log.estimated_cost_usd || 0;

      if (log.is_regenerate) {
        regenerationCost += cost;
      }

      if (
        log.event_type === "cover_generate" ||
        log.event_type === "cover_regenerate"
      ) {
        coverCost += cost;
      } else {
        interiorPagesCost += cost;
      }
    }

    // Count unique page numbers (excluding regenerations from count)
    const uniquePages = new Set(
      data
        .filter((log) => !log.is_regenerate)
        .map((log) => log.page_number)
    );

    return {
      totalCostUsd: coverCost + interiorPagesCost,
      coverCost,
      interiorPagesCost,
      totalPages: uniquePages.size,
      regenerationCost,
    };
  } catch (err) {
    console.error("Error calculating book cost summary:", err);
    return null;
  }
}
