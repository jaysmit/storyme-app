import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PageStatus } from "@/lib/types";

// POST /api/books/[id]/retry-page - Reset a failed page to pending for retry
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
    const body = await request.json();
    const { pageId } = body;

    if (!pageId) {
      return NextResponse.json(
        { error: "Missing pageId in request body" },
        { status: 400 }
      );
    }

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

    // Check page exists in page_statuses
    const pageStatuses: PageStatus[] = book.page_statuses || [];
    const pageIndex = pageStatuses.findIndex((p) => p.pageId === pageId);

    if (pageIndex === -1) {
      return NextResponse.json(
        { error: `Page "${pageId}" not found in book page_statuses` },
        { status: 400 }
      );
    }

    const pageStatus = pageStatuses[pageIndex];

    // Only allow retry for failed pages
    if (pageStatus.status !== "failed") {
      return NextResponse.json(
        { error: `Cannot retry page - status is "${pageStatus.status}", expected "failed"` },
        { status: 400 }
      );
    }

    // Reset page status to pending
    pageStatuses[pageIndex] = {
      ...pageStatus,
      status: "pending",
      error: undefined,
      startedAt: undefined,
      completedAt: undefined,
      // Keep retryCount for tracking
    };

    // Update book
    const { data: updatedBook, error: updateError } = await supabase
      .from("books")
      .update({
        page_statuses: pageStatuses,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update book: ${updateError.message}`);
    }

    return NextResponse.json({
      pageId,
      status: "pending",
      message: "Page reset for retry",
      pageStatuses: updatedBook.page_statuses,
    });
  } catch (error) {
    console.error("Error retrying page:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
