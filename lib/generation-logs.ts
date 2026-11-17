import { createServiceClient } from "@/lib/supabase/server";

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
}

/**
 * Start a generation log entry.
 * Returns the log ID to use when completing the log.
 */
export async function startGenerationLog(
  entry: GenerationLogEntry
): Promise<GenerationLogResult | null> {
  try {
    const supabase = createServiceClient();

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
        metadata: entry.metadata || {},
        status: "started",
      })
      .select("id, started_at")
      .single();

    if (error) {
      console.error("Failed to start generation log:", error);
      return null;
    }

    return {
      id: data.id,
      startedAt: new Date(data.started_at),
    };
  } catch (err) {
    console.error("Error starting generation log:", err);
    return null;
  }
}

/**
 * Complete a generation log entry with success.
 */
export async function completeGenerationLog(
  logId: string,
  updates: {
    tokens_used?: number;
    output_url?: string;
    image_size?: string;
    metadata?: Record<string, unknown>;
  }
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
        status: "completed",
        completed_at: new Date().toISOString(),
        duration_ms,
        tokens_used: updates.tokens_used,
        output_url: updates.output_url,
        image_size: updates.image_size,
        metadata: updates.metadata,
      })
      .eq("id", logId);
  } catch (err) {
    console.error("Error completing generation log:", err);
  }
}

/**
 * Mark a generation log entry as failed.
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
    });
  } catch (err) {
    console.error("Error logging generation event:", err);
  }
}
