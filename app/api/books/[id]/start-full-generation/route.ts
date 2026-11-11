import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getGeneratablePages, initializePageStatuses } from "@/lib/page-generation";
import { resolveBookId } from "@/lib/book-blueprints";
import type { GenerationConfig } from "@/lib/types";

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

    // Get character IDs from metadata
    const characterIds: string[] = book.metadata?.characterIds || [];
    if (characterIds.length === 0) {
      return NextResponse.json(
        { error: "Book has no characters selected" },
        { status: 400 }
      );
    }

    // Get cover URL
    const coverPage = book.preview_pages?.find(
      (p: { page_number: number }) => p.page_number === 0
    );
    const coverUrl = coverPage?.url;

    // Get list of generatable pages
    const pages = await getGeneratablePages(blueprintBookId);

    if (pages.length === 0) {
      return NextResponse.json(
        { error: "No pages found in blueprint" },
        { status: 400 }
      );
    }

    // Filter to only pages with images
    const pagesWithImages = pages.filter((p) => p.hasImage);

    if (pagesWithImages.length <= 1) {
      // Only cover page has an image
      return NextResponse.json({
        book,
        pages: pagesWithImages,
        pageStatuses: initializePageStatuses(pagesWithImages, coverUrl),
        message: "Only cover page has an original image. Interior pages coming soon.",
        hasInteriorPages: false,
      });
    }

    // Initialize page statuses (cover is already completed)
    const pageStatuses = initializePageStatuses(pagesWithImages, coverUrl);

    // Create generation config
    const generationConfig: GenerationConfig = {
      bookId: resolveBookId(blueprintBookId),
      characterIds,
      artStyle: book.metadata?.artStyle || "glow",
      totalPages: pagesWithImages.length,
      startedAt: new Date().toISOString(),
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
      (p) => p.status === "pending" && p.pageId !== "cover"
    );

    return NextResponse.json({
      book: updatedBook,
      pages: pagesWithImages,
      pageStatuses,
      pagesToGenerate,
      hasInteriorPages: pagesToGenerate.length > 0,
    });
  } catch (error) {
    console.error("Error starting full generation:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
