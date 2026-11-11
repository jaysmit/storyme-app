import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/books/[id]/approve-cover - Set status to cover_approved
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

    // Verify book has a cover (preview_ready status)
    if (book.status !== "preview_ready") {
      return NextResponse.json(
        { error: `Cannot approve cover - book status is "${book.status}", expected "preview_ready"` },
        { status: 400 }
      );
    }

    // Verify cover page exists
    const coverPage = book.preview_pages?.find(
      (p: { page_number: number }) => p.page_number === 0
    );
    if (!coverPage?.url) {
      return NextResponse.json(
        { error: "No cover page generated yet" },
        { status: 400 }
      );
    }

    // Update status to cover_approved
    const { data: updatedBook, error: updateError } = await supabase
      .from("books")
      .update({
        status: "cover_approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update book: ${updateError.message}`);
    }

    return NextResponse.json({
      book: updatedBook,
      message: "Cover approved successfully",
    });
  } catch (error) {
    console.error("Error approving cover:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
