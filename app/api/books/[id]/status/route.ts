import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PageStatus } from "@/lib/types";

// GET /api/books/[id]/status - Poll current generation progress
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
      .select("id, status, page_statuses, preview_pages, generation_config, metadata, updated_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const pageStatuses: PageStatus[] = book.page_statuses || [];

    // Calculate progress
    const total = pageStatuses.length;
    const completed = pageStatuses.filter((p) => p.status === "completed").length;
    const failed = pageStatuses.filter((p) => p.status === "failed").length;
    const generating = pageStatuses.filter((p) => p.status === "generating").length;
    const pending = pageStatuses.filter((p) => p.status === "pending").length;

    return NextResponse.json({
      bookId: book.id,
      status: book.status,
      progress: {
        total,
        completed,
        failed,
        generating,
        pending,
      },
      pageStatuses,
      previewPages: book.preview_pages,
      generationConfig: book.generation_config,
      updatedAt: book.updated_at,
    });
  } catch (error) {
    console.error("Error fetching status:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
