import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// This endpoint is called by Vercel Cron every minute
// It finds stuck/pending pages and triggers generation

const MAX_CONCURRENT_PAGES = 3; // Max pages to process per cron run
const STUCK_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes = stuck
const MAX_RETRIES = 5;

export const maxDuration = 60; // 1 minute for cron

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In production, verify the secret
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log("[CRON] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[CRON] Processing pages cron job started");

  const supabase = createServiceClient();
  const now = new Date();
  const stuckThreshold = new Date(now.getTime() - STUCK_THRESHOLD_MS);

  try {
    // Find books that are generating_full and have pending/stuck pages
    const { data: books, error: booksError } = await supabase
      .from("books")
      .select("id, page_statuses, generation_config, characters_snapshot")
      .in("status", ["generating_full", "incomplete"])
      .not("page_statuses", "is", null);

    if (booksError) {
      console.error("[CRON] Error fetching books:", booksError);
      return NextResponse.json({ error: booksError.message }, { status: 500 });
    }

    if (!books || books.length === 0) {
      console.log("[CRON] No books need processing");
      return NextResponse.json({ processed: 0, message: "No books need processing" });
    }

    console.log(`[CRON] Found ${books.length} books to check`);

    let totalTriggered = 0;
    const results: Array<{ bookId: string; triggered: number; pages: string[] }> = [];

    for (const book of books) {
      if (totalTriggered >= MAX_CONCURRENT_PAGES) break;

      const pageStatuses = book.page_statuses as Array<{
        pageId: string;
        pageNumber: number;
        status: string;
        startedAt?: string;
        retryCount?: number;
      }>;

      // Find pages that need processing
      const pagesToProcess: typeof pageStatuses = [];

      for (const page of pageStatuses) {
        if (totalTriggered + pagesToProcess.length >= MAX_CONCURRENT_PAGES) break;

        const retryCount = page.retryCount || 0;

        // Skip if max retries exceeded
        if (retryCount >= MAX_RETRIES) continue;

        // Pending pages
        if (page.status === "pending") {
          pagesToProcess.push(page);
          continue;
        }

        // Failed pages (need retry)
        if (page.status === "failed") {
          pagesToProcess.push(page);
          continue;
        }

        // Stuck pages (generating for too long)
        if (page.status === "generating" && page.startedAt) {
          const startedAt = new Date(page.startedAt);
          if (startedAt < stuckThreshold) {
            console.log(`[CRON] Page ${page.pageId} is stuck (started ${page.startedAt})`);
            pagesToProcess.push(page);
          }
        }
      }

      if (pagesToProcess.length === 0) continue;

      console.log(`[CRON] Book ${book.id}: ${pagesToProcess.length} pages to process`);

      // Trigger generation for each page
      const triggeredPages: string[] = [];
      for (const page of pagesToProcess) {
        if (totalTriggered >= MAX_CONCURRENT_PAGES) break;

        try {
          // Update status to "generating" with new timestamp
          const updatedStatuses = pageStatuses.map((p) =>
            p.pageId === page.pageId
              ? {
                  ...p,
                  status: "generating",
                  startedAt: now.toISOString(),
                  retryCount: (p.retryCount || 0) + (page.status === "failed" || page.status === "generating" ? 1 : 0),
                }
              : p
          );

          await supabase
            .from("books")
            .update({ page_statuses: updatedStatuses })
            .eq("id", book.id);

          // Trigger the actual generation (fire and forget)
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://storyme-app-roan.vercel.app";

          // Don't await - let it run in background
          fetch(`${baseUrl}/api/books/${book.id}/generate-page`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pageNumber: page.pageNumber,
              fromCron: true, // Mark as cron-triggered
            }),
          }).catch((err) => {
            console.error(`[CRON] Failed to trigger page ${page.pageId}:`, err);
          });

          triggeredPages.push(page.pageId);
          totalTriggered++;
          console.log(`[CRON] Triggered page ${page.pageId} (page ${page.pageNumber})`);
        } catch (err) {
          console.error(`[CRON] Error processing page ${page.pageId}:`, err);
        }
      }

      if (triggeredPages.length > 0) {
        results.push({
          bookId: book.id,
          triggered: triggeredPages.length,
          pages: triggeredPages,
        });
      }
    }

    console.log(`[CRON] Total triggered: ${totalTriggered}`);

    return NextResponse.json({
      processed: totalTriggered,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[CRON] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
