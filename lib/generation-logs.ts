import { createServiceClient } from "@/lib/supabase/server";
import { getCostDataForEvent } from "@/lib/pricing/cost-tracker";
import type { GenerationEventType as PricingEventType } from "@/lib/pricing/pricing-config";

export type GenerationEventType =
  | "cover_generate"
  | "cover_regenerate"
  | "page_generate"
  | "page_regenerate"
  | "caricature_generate"
  | "caricature_regenerate";

export interface GenerationLogEntry {
  user_id: string;
  book_id?: string;
  event_type: GenerationEventType;
  page_number?: number;
  character_count?: number;
  blueprint_id?: string;
  blueprint_format?: "v1" | "v2";
  edit_instructions?: string;
  is_regenerate?: boolean;
  tokens_used?: number;
  output_url?: string;
  image_size?: string;
  model_used?: string;
  metadata?: Record<string, unknown>;
}

export interface GenerationLogResult {
  id: string;
  startedAt: Date;
  estimatedCostUsd?: number;
}

/**
 * Start a generation log entry.
 * Automatically calculates and stores estimated cost.
 * Returns the log ID to use when completing the log.
 */
export async function startGenerationLog(
  entry: GenerationLogEntry
): Promise<GenerationLogResult | null> {
  try {
    const supabase = createServiceClient();

    // Calculate cost data for this event type
    const costData = getCostDataForEvent(
      entry.event_type as PricingEventType,
      {
        imageSize: entry.image_size,
      }
    );

    const { data, error } = await supabase
      .from("generation_logs")
      .insert({
        user_id: entry.user_id,
        book_id: entry.book_id,
        event_type: entry.event_type,
        page_number: entry.page_number,
        character_count: entry.character_count,
        blueprint_id: entry.blueprint_id,
        blueprint_format: entry.blueprint_format,
        edit_instructions: entry.edit_instructions,
        is_regenerate: entry.is_regenerate || false,
        model_used: entry.model_used || "gpt-image-2.5-sunburst",
        image_size: entry.image_size,
        metadata: entry.metadata || {},
        status: "started",
        // Cost tracking fields
        estimated_cost_usd: costData.estimated_cost_usd,
        pricing_version: costData.pricing_version,
        cost_calculation_method: costData.cost_calculation_method,
        input_tokens: costData.input_tokens,
        output_tokens: costData.output_tokens,
      })
      .select("id, started_at, estimated_cost_usd")
      .single();

    if (error) {
      console.error("Failed to start generation log:", error);
      return null;
    }

    return {
      id: data.id,
      startedAt: new Date(data.started_at),
      estimatedCostUsd: data.estimated_cost_usd,
    };
  } catch (err) {
    console.error("Error starting generation log:", err);
    return null;
  }
}

/**
 * Complete a generation log entry with success.
 * Optionally update the cost with actual values if available.
 */
export async function completeGenerationLog(
  logId: string,
  updates: {
    tokens_used?: number;
    output_url?: string;
    image_size?: string;
    metadata?: Record<string, unknown>;
    // Optional cost updates if actual values are known
    actual_cost_usd?: number;
    input_tokens?: number;
    output_tokens?: number;
  }
): Promise<void> {
  try {
    const supabase = createServiceClient();

    // Get the started_at time to calculate duration
    const { data: existing } = await supabase
      .from("generation_logs")
      .select("started_at, event_type, image_size")
      .eq("id", logId)
      .single();

    const duration_ms = existing
      ? Date.now() - new Date(existing.started_at).getTime()
      : null;

    // Prepare update object
    const updateData: Record<string, unknown> = {
      status: "completed",
      completed_at: new Date().toISOString(),
      duration_ms,
      tokens_used: updates.tokens_used,
      output_url: updates.output_url,
      image_size: updates.image_size || existing?.image_size,
      metadata: updates.metadata,
    };

    // Update cost if actual values provided
    if (updates.actual_cost_usd !== undefined) {
      updateData.estimated_cost_usd = updates.actual_cost_usd;
      updateData.cost_calculation_method = "actual";
    }
    if (updates.input_tokens !== undefined) {
      updateData.input_tokens = updates.input_tokens;
    }
    if (updates.output_tokens !== undefined) {
      updateData.output_tokens = updates.output_tokens;
    }

    // If image_size changed, recalculate cost
    if (updates.image_size && existing && updates.image_size !== existing.image_size) {
      const costData = getCostDataForEvent(
        existing.event_type as PricingEventType,
        { imageSize: updates.image_size }
      );
      updateData.estimated_cost_usd = costData.estimated_cost_usd;
    }

    await supabase
      .from("generation_logs")
      .update(updateData)
      .eq("id", logId);
  } catch (err) {
    console.error("Error completing generation log:", err);
  }
}

/**
 * Mark a generation log entry as failed.
 * Note: Estimated cost is preserved to track attempted spend.
 */
export async function failGenerationLog(
  logId: string,
  errorMessage: string
): Promise<void> {
  try {
    const supabase = createServiceClient();

    // Get the started_at time to calculate duration
    const { data: existing } = await supabase
      .from("generation_logs")
      .select("started_at")
      .eq("id", logId)
      .single();

    const duration_ms = existing
      ? Date.now() - new Date(existing.started_at).getTime()
      : null;

    await supabase
      .from("generation_logs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        duration_ms,
        error_message: errorMessage,
      })
      .eq("id", logId);
  } catch (err) {
    console.error("Error failing generation log:", err);
  }
}

/**
 * Quick helper to log a complete generation event (for simple cases).
 * Automatically calculates cost based on event type and image size.
 */
export async function logGenerationEvent(
  entry: GenerationLogEntry & {
    status: "completed" | "failed";
    duration_ms?: number;
    error_message?: string;
  }
): Promise<void> {
  try {
    const supabase = createServiceClient();

    // Calculate cost data for this event type
    const costData = getCostDataForEvent(
      entry.event_type as PricingEventType,
      {
        imageSize: entry.image_size,
      }
    );

    await supabase.from("generation_logs").insert({
      user_id: entry.user_id,
      book_id: entry.book_id,
      event_type: entry.event_type,
      page_number: entry.page_number,
      character_count: entry.character_count,
      blueprint_id: entry.blueprint_id,
      blueprint_format: entry.blueprint_format,
      edit_instructions: entry.edit_instructions,
      is_regenerate: entry.is_regenerate || false,
      tokens_used: entry.tokens_used,
      output_url: entry.output_url,
      image_size: entry.image_size,
      model_used: entry.model_used || "gpt-image-2.5-sunburst",
      metadata: entry.metadata || {},
      status: entry.status,
      completed_at: new Date().toISOString(),
      duration_ms: entry.duration_ms,
      error_message: entry.error_message,
      // Cost tracking fields
      estimated_cost_usd: entry.status === "completed" ? costData.estimated_cost_usd : null,
      pricing_version: costData.pricing_version,
      cost_calculation_method: costData.cost_calculation_method,
      input_tokens: costData.input_tokens,
      output_tokens: costData.output_tokens,
    });
  } catch (err) {
    console.error("Error logging generation event:", err);
  }
}

/**
 * Log a photo analysis event (GPT-4o Vision)
 * This tracks the cost separately from image generation
 */
export async function logPhotoAnalysisEvent(
  userId: string,
  characterId: string,
  status: "completed" | "failed",
  options?: {
    duration_ms?: number;
    error_message?: string;
    input_tokens?: number;
    output_tokens?: number;
  }
): Promise<void> {
  try {
    const supabase = createServiceClient();

    // Import dynamically to avoid circular dependency
    const { getPhotoAnalysisCostData } = await import("@/lib/pricing/cost-tracker");
    const costData = getPhotoAnalysisCostData({
      inputTokens: options?.input_tokens,
      outputTokens: options?.output_tokens,
    });

    await supabase.from("generation_logs").insert({
      user_id: userId,
      event_type: "caricature_generate", // Using existing type, metadata distinguishes it
      model_used: "gpt-4o",
      metadata: {
        character_id: characterId,
        analysis_type: "photo_analysis",
      },
      status,
      completed_at: new Date().toISOString(),
      duration_ms: options?.duration_ms,
      error_message: options?.error_message,
      // Cost tracking fields
      estimated_cost_usd: status === "completed" ? costData.estimated_cost_usd : null,
      pricing_version: costData.pricing_version,
      cost_calculation_method: costData.cost_calculation_method,
      input_tokens: costData.input_tokens,
      output_tokens: costData.output_tokens,
    });
  } catch (err) {
    console.error("Error logging photo analysis event:", err);
  }
}
