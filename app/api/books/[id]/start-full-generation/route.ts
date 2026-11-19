import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeneratablePages } from "@/lib/page-generation";
import { resolveBookId } from "@/lib/book-blueprints";
import { checkTokens, deductTokens } from "@/lib/tokens";
import { TOKEN_COSTS, GENERATION_CONFIG, type GenerationConfig } from "@/lib/types";
import {
  buildExpectedContents,
  initializePageStatusesFromExpected,
  mergePageStatuses,
} from "@/lib/book-validation";
import { generateWorkerId, logGenerationStatus } from "@/lib/generation-manager";

// POST /api/books/[id]/start-full-generation - Initialize page statuses for all interior pages
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
    // Get the book and verify ownership
    const { data: book, error: fetchError } = await supabase
      .from("books")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Verify book is in cover_approved status (or generating_full for resume)
    if (book.status !== "cover_approved" && book.status !== "generating_full") {
      return NextResponse.json(
        { error: `Cannot start full generation - book status is "${book.status}", expected "cover_approved"` },
        { status: 400 }
      );
    }

    // Get blueprint book ID from metadata
    const blueprintBookId = book.metadata?.bookId || book.metadata?.storySlug;
    if (!blueprintBookId) {
      return NextResponse.json(
        { error: "Book has no story/blueprint ID in metadata" },
        { status: 400 }
      );
    }

    // Get character IDs from metadata - this preserves the user's chosen priority order
    // The metadata.characterIds is the source of truth for order
    let characterIds: string[] = book.metadata?.characterIds || [];

    // Only use snapshot IDs if metadata doesn't have them (legacy books)
    if (characterIds.length === 0 && book.characters_snapshot && Array.isArray(book.characters_snapshot)) {
      console.log("Using character IDs from snapshot (metadata.characterIds was empty)");
      characterIds = book.characters_snapshot.map((c: { id: string }) => c.id);
    }

    if (characterIds.length === 0) {
      return NextResponse.json(
        { error: "Book has no characters selected" },
        { status: 400 }
      );
    }

    console.log(`Character order for generation: ${characterIds.map((id, i) => `${i + 1}. ${id.substring(0, 8)}`).join(", ")}`);

    // Get cover URL
    const coverPage = book.preview_pages?.find(
      (p: { page_number: number }) => p.page_number === 0
    );
    const coverUrl = coverPage?.url;

    // Build expected contents from blueprint (this is the source of truth)
    let expectedContents;
    try {
      expectedContents = await buildExpectedContents(blueprintBookId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: `Failed to load blueprint: ${msg}` },
        { status: 400 }
      );
    }

    console.log(`Expected contents: ${expectedContents.expectedPageCount} pages (${expectedContents.expectedPageIds.join(", ")})`);

    if (expectedContents.expectedPageCount === 0) {
      return NextResponse.json(
        { error: "No pages found in blueprint" },
        { status: 400 }
      );
    }

    // Get list of generatable pages (for compatibility)
    const pages = await getGeneratablePages(blueprintBookId);
    const pagesWithImages = pages.filter((p) => p.hasImage);

    if (pagesWithImages.length <= 1) {
      // Only cover page has an image
      const coverOnlyStatuses = initializePageStatusesFromExpected(expectedContents, coverUrl);
      return NextResponse.json({
        book,
        pages: pagesWithImages,
        pageStatuses: coverOnlyStatuses,
        message: "Only cover page has an original image. Interior pages coming soon.",
        hasInteriorPages: false,
      });
    }

    // Initialize or merge page statuses
    // If book already has page_statuses (resume scenario), merge with expected
    // Otherwise, initialize fresh from expected contents
    let pageStatuses;
    if (book.page_statuses && book.page_statuses.length > 0) {
      console.log(`Resuming generation - merging ${book.page_statuses.length} existing statuses`);
      pageStatuses = mergePageStatuses(book.page_statuses, expectedContents);
    } else {
      pageStatuses = initializePageStatusesFromExpected(expectedContents, coverUrl);
    }

    // Calculate pages that need to be generated (exclude cover)
    const pagesToGenerateCount = pageStatuses.filter(
      (p) => p.status === "pending" && p.pageId !== "cover"
    ).length;

    // Check if user has enough tokens for ALL pages BEFORE starting
    const totalTokensNeeded = pagesToGenerateCount * TOKEN_COSTS.BOOK_PAGE;

    if (totalTokensNeeded > 0) {
      const { hasEnough, balance } = await checkTokens(supabase, user.id, totalTokensNeeded);

      if (!hasEnough) {
        return NextResponse.json(
          {
            error: "Insufficient tokens",
            required: totalTokensNeeded,
            balance,
            message: `You need ${totalTokensNeeded} tokens to generate ${pagesToGenerateCount} pages, but you only have ${balance} tokens.`,
          },
          { status: 402 }
        );
      }

      // Deduct ALL tokens upfront to prevent mid-generation failure
      const deducted = await deductTokens(
        supabase,
        user.id,
        totalTokensNeeded,
        "book_page",
        id,
        `Reserved for ${pagesToGenerateCount} interior pages`
      );
      if (!deducted.success) {
        return NextResponse.json(
          { error: "Failed to reserve tokens for generation" },
          { status: 500 }
        );
      }

      console.log(`Reserved ${totalTokensNeeded} tokens for ${pagesToGenerateCount} pages (balance: ${balance} -> ${deducted.newBalance})`);
    }

    // Create generation config with expected contents for validation
    const generationConfig: GenerationConfig = {
      bookId: resolveBookId(blueprintBookId),
      characterIds,
      artStyle: book.metadata?.artStyle || "glow",
      totalPages: expectedContents.expectedPageCount,
      startedAt: new Date().toISOString(),
      // Store expected contents for validation during generation
      expectedPageIds: expectedContents.expectedPageIds,
      expectedPageCount: expectedContents.expectedPageCount,
      blueprintFormat: expectedContents.blueprintFormat,
      coverPageId: expectedContents.coverPageId,
    };

    // Update book with page statuses and generation config
    const { data: updatedBook, error: updateError } = await supabase
      .from("books")
      .update({
        status: "generating_full",
        page_statuses: pageStatuses,
        generation_config: generationConfig,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update book: ${updateError.message}`);
    }

    // Return pages that need to be generated (exclude completed cover)
    const pagesToGenerate = pageStatuses.filter(
      (p) => p.status === "pending" && p.pageId !== "cover" && p.pageNumber !== 0
    );

    // Trigger initial batch of pages to start generation immediately
    // Uses configurable concurrency from GENERATION_CONFIG
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://storyme-app-roan.vercel.app";
    const workerId = generateWorkerId();

    const initialBatch = pagesToGenerate.slice(0, GENERATION_CONFIG.DEFAULT_CONCURRENCY);
    console.log(`[START] Triggering initial batch of ${initialBatch.length} pages (concurrency: ${GENERATION_CONFIG.DEFAULT_CONCURRENCY})`);
    logGenerationStatus(id, pageStatuses, "[START] ");

    for (const page of initialBatch) {
      // Fire and forget - don't await
      fetch(`${baseUrl}/api/books/${id}/generate-page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: page.pageId,
          fromCron: true, // Treat as background job
          workerId, // Share worker ID across initial batch for logging
        }),
      }).catch((err) => {
        console.error(`[START] Failed to trigger page ${page.pageId}:`, err);
      });
    }

    return NextResponse.json({
      book: updatedBook,
      pages: pagesWithImages,
      pageStatuses,
      pagesToGenerate,
      hasInteriorPages: pagesToGenerate.length > 0,
      triggeredPages: initialBatch.map((p) => p.pageId),
      concurrency: GENERATION_CONFIG.DEFAULT_CONCURRENCY,
      workerId,
    });
  } catch (error) {
    console.error("Error starting full generation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
