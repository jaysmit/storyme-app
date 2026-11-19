import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  validateBookCompletion,
  buildExpectedContents,
  mergePageStatuses,
  logValidationResult,
  type BookValidationResult,
} from "@/lib/book-validation";
import type { PageStatus } from "@/lib/types";

/**
 * POST /api/books/[id]/reconcile - Reconcile a book's state
 *
 * This endpoint:
 * 1. Validates the book against its blueprint
 * 2. Fixes incorrect status (e.g., "completed" when pages are missing)
 * 3. Identifies pages that need recovery
 * 4. Optionally merges missing pages into page_statuses for retry
 *
 * Use this to recover books that were incorrectly marked as complete.
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
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { autoFix = true, prepareMissingForRetry = true } = body;

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

    // Get blueprint ID - check generation_config first, then metadata
    const blueprintBookId = book.generation_config?.bookId || book.metadata?.bookId || book.metadata?.storySlug;
    if (!blueprintBookId) {
      return NextResponse.json(
        { error: "Book has no blueprint ID" },
        { status: 400 }
      );
    }

    console.log(`=== RECONCILING BOOK ${id} ===`);
    console.log(`Current status: ${book.status}`);
    console.log(`Blueprint: ${blueprintBookId}`);

    // Build expected contents
    const expectedContents = await buildExpectedContents(blueprintBookId);
    console.log(`Expected pages: ${expectedContents.expectedPageCount} (${expectedContents.expectedPageIds.join(", ")})`);

    // Get current page statuses
    const currentStatuses: PageStatus[] = book.page_statuses || [];
    console.log(`Current page_statuses: ${currentStatuses.length} entries`);

    // Validate current state
    const validation = await validateBookCompletion(
      currentStatuses,
      book.generation_config,
      blueprintBookId
    );
    logValidationResult(validation);

    // Check if status needs correction
    const statusNeedsCorrection =
      (book.status === "completed" && !validation.isComplete) ||
      (book.status === "generating_full" && validation.failedCount > 0 && validation.pendingCount === 0 && validation.generatingCount === 0) ||
      (book.status === "generating_full" && validation.isComplete && validation.recommendedStatus === "completed");

    // Prepare response data
    const reconcileResult = {
      bookId: id,
      currentStatus: book.status,
      validation,
      statusNeedsCorrection,
      correctedStatus: null as string | null,
      missingPagesAdded: false,
      recoverablePages: validation.recoverablePageIds.map(pageId => {
        const pageValidation = validation.pages.find(p => p.pageId === pageId);
        return {
          pageId,
          pageNumber: pageValidation?.pageNumber ?? 0,
          status: pageValidation?.status ?? "missing",
          issues: pageValidation?.issues ?? [],
        };
      }),
      message: "",
    };

    // Apply fixes if requested
    if (autoFix && (statusNeedsCorrection || (prepareMissingForRetry && validation.missingCount > 0))) {
      let newPageStatuses = currentStatuses;
      let newStatus = book.status;

      // Merge missing pages into page_statuses
      if (prepareMissingForRetry && validation.missingCount > 0) {
        newPageStatuses = mergePageStatuses(currentStatuses, expectedContents);
        reconcileResult.missingPagesAdded = true;
        console.log(`Added ${validation.missingCount} missing pages to page_statuses`);
      }

      // Determine correct status
      if (statusNeedsCorrection) {
        newStatus = validation.recommendedStatus;
        reconcileResult.correctedStatus = newStatus;
        console.log(`Correcting status from "${book.status}" to "${newStatus}"`);
      }

      // Update the book
      const { error: updateError } = await supabase
        .from("books")
        .update({
          status: newStatus,
          page_statuses: newPageStatuses,
          validation_result: validation,
          validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        throw new Error(`Failed to update book: ${updateError.message}`);
      }

      if (reconcileResult.correctedStatus) {
        reconcileResult.message = `Book status corrected from "${book.status}" to "${reconcileResult.correctedStatus}". `;
      }
      if (reconcileResult.missingPagesAdded) {
        reconcileResult.message += `${validation.missingCount} missing pages added for retry. `;
      }
      if (reconcileResult.recoverablePages.length > 0) {
        reconcileResult.message += `${reconcileResult.recoverablePages.length} pages can be regenerated.`;
      }
    } else {
      // Just report without fixing
      if (validation.isComplete) {
        reconcileResult.message = "Book is complete. No issues found.";
      } else {
        reconcileResult.message = `Book has ${validation.failedCount} failed and ${validation.missingCount} missing pages. Set autoFix=true to correct status.`;
      }
    }

    return NextResponse.json(reconcileResult);
  } catch (error) {
    console.error("Error reconciling book:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/books/[id]/reconcile - Check book state without modifying
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

    // Get blueprint ID - check generation_config first, then metadata
    const blueprintBookId = book.generation_config?.bookId || book.metadata?.bookId || book.metadata?.storySlug;
    if (!blueprintBookId) {
      return NextResponse.json(
        { error: "Book has no blueprint ID" },
        { status: 400 }
      );
    }

    // Validate current state
    const validation = await validateBookCompletion(
      book.page_statuses || [],
      book.generation_config,
      blueprintBookId
    );

    // Check if status needs correction
    const statusNeedsCorrection =
      (book.status === "completed" && !validation.isComplete) ||
      (book.status === "generating_full" && validation.failedCount > 0 && validation.pendingCount === 0 && validation.generatingCount === 0) ||
      (book.status === "generating_full" && validation.isComplete && validation.recommendedStatus === "completed");

    return NextResponse.json({
      bookId: id,
      currentStatus: book.status,
      validation,
      statusNeedsCorrection,
      recoverablePages: validation.recoverablePageIds.map(pageId => {
        const pageValidation = validation.pages.find(p => p.pageId === pageId);
        return {
          pageId,
          pageNumber: pageValidation?.pageNumber ?? 0,
          status: pageValidation?.status ?? "missing",
          issues: pageValidation?.issues ?? [],
        };
      }),
    });
  } catch (error) {
    console.error("Error checking book state:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
