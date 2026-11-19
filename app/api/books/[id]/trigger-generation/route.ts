import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type PageStatus, GENERATION_CONFIG } from "@/lib/types";
import {
  calculatePagesToTrigger,
  getGenerationSummary,
  generateWorkerId,
  logGenerationStatus,
} from "@/lib/generation-manager";

/**
 * POST /api/books/[id]/trigger-generation
 *
 * Idempotent endpoint that triggers generation for eligible pages.
 * Safe to call repeatedly from multiple sources (orchestrator, cron, manual).
 *
 * This endpoint:
 * 1. Checks if book has incomplete generation
 * 2. Calculates how many pages to trigger based on concurrency
 * 3. Triggers generation for eligible pages
 * 4. Returns current generation status
 *
 * Does NOT block - triggers are fire-and-forget
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse request body for optional concurrency override
    let concurrency: number = GENERATION_CONFIG.DEFAULT_CONCURRENCY;
    try {
      const body = await request.json();
      if (body.concurrency && typeof body.concurrency === "number") {
        concurrency = Math.min(
          Math.max(body.concurrency, GENERATION_CONFIG.MIN_CONCURRENCY),
          GENERATION_CONFIG.MAX_CONCURRENCY
        );
      }
    } catch {
      // No body or invalid JSON - use defaults
    }

    // Get book and verify ownership
    const { data: book, error: fetchError } = await supabase
      .from("books")
      .select("id, status, page_statuses, generation_config")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Only trigger for books that need generation
    const generatableStatuses = ["generating_full", "incomplete", "cover_approved"];
    if (!generatableStatuses.includes(book.status)) {
      const summary = getGenerationSummary(book.page_statuses || []);
      return NextResponse.json({
        status: book.status,
        summary,
        triggered: 0,
        message: `Book status is "${book.status}" - no generation needed`,
      });
    }

    const pageStatuses: PageStatus[] = book.page_statuses || [];

    if (pageStatuses.length === 0) {
      return NextResponse.json({
        status: book.status,
        summary: getGenerationSummary([]),
        triggered: 0,
        message: "No pages to generate",
      });
    }

    // Log current status
    logGenerationStatus(id, pageStatuses, "[TRIGGER] ");

    // Calculate how many pages to trigger
    const { pagesToTrigger, activeCount, slotsAvailable } = calculatePagesToTrigger(
      pageStatuses,
      concurrency
    );

    if (pagesToTrigger.length === 0) {
      const summary = getGenerationSummary(pageStatuses);
      return NextResponse.json({
        status: book.status,
        summary,
        triggered: 0,
        activeCount,
        slotsAvailable,
        message: activeCount > 0
          ? `${activeCount} pages already generating (concurrency: ${concurrency})`
          : "No eligible pages to trigger",
      });
    }

    // Generate a worker ID for this trigger batch
    const workerId = generateWorkerId();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://storyme-app-roan.vercel.app";

    // Trigger generation for each eligible page
    const triggeredPageIds: string[] = [];

    for (const page of pagesToTrigger) {
      // Skip cover page (already generated)
      if (page.pageId === "cover" || page.pageNumber === 0) {
        continue;
      }

      // Fire and forget - don't await
      fetch(`${baseUrl}/api/books/${id}/generate-page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: page.pageId,
          fromCron: true, // Treat as background job
          workerId,
          internalSecret: process.env.CRON_SECRET,
        }),
      }).catch((err) => {
        console.error(`[TRIGGER] Failed to trigger page ${page.pageId}:`, err);
      });

      triggeredPageIds.push(page.pageId);
    }

    console.log(`[TRIGGER] Triggered ${triggeredPageIds.length} pages: ${triggeredPageIds.join(", ")}`);

    const summary = getGenerationSummary(pageStatuses);

    return NextResponse.json({
      status: book.status,
      summary,
      triggered: triggeredPageIds.length,
      triggeredPages: triggeredPageIds,
      activeCount,
      slotsAvailable,
      concurrency,
      workerId,
    });
  } catch (error) {
    console.error("[TRIGGER] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/books/[id]/trigger-generation
 *
 * Returns current generation status without triggering anything.
 * Useful for polling/status checks.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: book, error: fetchError } = await supabase
      .from("books")
      .select("id, status, page_statuses, generation_config, preview_pages")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const pageStatuses: PageStatus[] = book.page_statuses || [];
    const summary = getGenerationSummary(pageStatuses);

    // Calculate eligibility
    const { activeCount, pendingCount, slotsAvailable } = calculatePagesToTrigger(
      pageStatuses,
      GENERATION_CONFIG.DEFAULT_CONCURRENCY
    );

    // Check if generation is complete
    const isComplete = summary.pending === 0 && summary.generating === 0 && summary.retrying === 0;
    const hasErrors = summary.failed > 0;

    return NextResponse.json({
      bookId: id,
      status: book.status,
      summary,
      isComplete,
      hasErrors,
      activeCount,
      pendingCount,
      slotsAvailable,
      concurrency: GENERATION_CONFIG.DEFAULT_CONCURRENCY,
      pageStatuses,
      previewPages: book.preview_pages,
    });
  } catch (error) {
    console.error("[TRIGGER-GET] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
