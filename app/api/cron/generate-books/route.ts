import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cron job to continue generating books server-side
// This ensures generation continues even when user leaves the app
// Called every minute by Vercel Cron

const CONCURRENT_PER_BOOK = 3; // Max pages to generate concurrently per book
const MAX_BOOKS_PER_RUN = 5; // Max books to process per cron run

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
      const pageStatuses = book.page_statuses || [];

      // Find pages that need generation
      const pendingPages = pageStatuses.filter(
        (p: { status: string; pageId: string }) =>
          p.status === "pending" && p.pageId !== "cover"
      );

      const generatingPages = pageStatuses.filter(
        (p: { status: string; startedAt?: string }) => {
          if (p.status !== "generating") return false;
          // Consider pages stuck if generating for > 3 minutes
          if (p.startedAt) {
            const elapsed = Date.now() - new Date(p.startedAt).getTime();
            if (elapsed > 3 * 60 * 1000) {
              console.log(`[CRON] Page stuck for ${Math.round(elapsed / 1000)}s, treating as pending`);
              return false; // Treat stuck pages as not generating
            }
          }
          return true;
        }
      );

      const activelyGenerating = generatingPages.length;

      // Calculate how many more pages to trigger
      const toTriggerCount = Math.min(
        CONCURRENT_PER_BOOK - activelyGenerating,
        pendingPages.length
      );

      if (toTriggerCount <= 0) {
        console.log(`[CRON] Book ${book.id.slice(0, 8)}: ${activelyGenerating} generating, ${pendingPages.length} pending - skipping`);
        continue;
      }

      const pagesToTrigger = pendingPages.slice(0, toTriggerCount);
      console.log(`[CRON] Book ${book.id.slice(0, 8)}: Triggering ${pagesToTrigger.length} pages`);

      // Fire requests to generate pages
      for (const page of pagesToTrigger) {
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
