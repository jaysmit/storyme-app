import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { type PageStatus, GENERATION_CONFIG } from "@/lib/types";
import {
  calculatePagesToTrigger,
  logGenerationStatus,
  isPageStalled,
} from "@/lib/generation-manager";

// Cron job to continue generating books server-side
// This ensures generation continues even when user leaves the app
// Called daily by Vercel Cron (Hobby plan limit)

const MAX_BOOKS_PER_RUN = 10; // Max books to process per cron run

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log("[CRON] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role client to access all books
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Find books that are mid-generation
    const { data: books, error } = await supabase
      .from("books")
      .select("id, user_id, status, page_statuses, generation_config")
      .in("status", ["generating_full", "incomplete"])
      .limit(MAX_BOOKS_PER_RUN);

    if (error) {
      throw new Error(`Failed to fetch books: ${error.message}`);
    }

    if (!books || books.length === 0) {
      return NextResponse.json({ message: "No books to process", processed: 0 });
    }

    console.log(`[CRON] Found ${books.length} books mid-generation`);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://storyme-app-roan.vercel.app";
    let totalTriggered = 0;

    for (const book of books) {
      const pageStatuses: PageStatus[] = book.page_statuses || [];

      // Log current status
      logGenerationStatus(book.id, pageStatuses, "[CRON] ");

      // Use the generation manager to calculate pages to trigger
      const { pagesToTrigger, activeCount, slotsAvailable } = calculatePagesToTrigger(
        pageStatuses,
        GENERATION_CONFIG.DEFAULT_CONCURRENCY
      );

      if (pagesToTrigger.length === 0) {
        console.log(`[CRON] Book ${book.id.slice(0, 8)}: ${activeCount} active, no slots available - skipping`);
        continue;
      }

      // Filter out cover page
      const nonCoverPages = pagesToTrigger.filter(
        (p) => p.pageId !== "cover" && p.pageNumber !== 0
      );

      if (nonCoverPages.length === 0) {
        continue;
      }

      console.log(`[CRON] Book ${book.id.slice(0, 8)}: Triggering ${nonCoverPages.length} pages (${slotsAvailable} slots available)`);

      // Fire requests to generate pages
      for (const page of nonCoverPages) {
        // Don't await - fire and continue
        fetch(`${baseUrl}/api/books/${book.id}/generate-page`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageId: page.pageId,
            fromCron: true,
          }),
        }).catch((err) => {
          console.error(`[CRON] Failed to trigger ${page.pageId}:`, err);
        });

        totalTriggered++;
      }
    }

    console.log(`[CRON] Complete - triggered ${totalTriggered} pages across ${books.length} books`);

    return NextResponse.json({
      message: "Cron complete",
      booksProcessed: books.length,
      pagesTriggered: totalTriggered,
    });
  } catch (error) {
    console.error("[CRON] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
