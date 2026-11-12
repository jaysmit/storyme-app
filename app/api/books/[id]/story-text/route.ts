import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  loadBlueprintWithFormat,
  resolveBookId,
  type V2Blueprint,
} from "@/lib/book-blueprints";
import {
  personalizeAllPages,
  personalizePageText,
  type PersonalizedPage,
} from "@/lib/story-text";

/**
 * GET /api/books/[id]/story-text
 * Returns personalized story text for a V2 book
 *
 * Query params:
 * - page: (optional) specific page number to get text for
 *
 * Response for V2 books:
 * {
 *   format: "v2",
 *   title: "The Essendon Five",
 *   pages: [
 *     { page_number: 1, title: "Game Day!", story_text: "Tommy couldn't wait..." },
 *     ...
 *   ],
 *   nameMapping: { leon: "Tommy", mum: "Sarah", ... }
 * }
 *
 * Response for V1 books:
 * {
 *   format: "v1",
 *   message: "Story text not available for V1 format books"
 * }
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
    // Get the book
    const { data: book, error: fetchError } = await supabase
      .from("books")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Check if we have pre-computed personalized pages (V2)
    if (book.personalized_pages && Array.isArray(book.personalized_pages) && book.personalized_pages.length > 0) {
      const searchParams = request.nextUrl.searchParams;
      const pageParam = searchParams.get("page");

      if (pageParam) {
        const pageNumber = parseInt(pageParam, 10);
        const page = (book.personalized_pages as PersonalizedPage[]).find(
          (p) => p.page_number === pageNumber
        );

        if (!page) {
          return NextResponse.json(
            { error: `Page ${pageNumber} not found` },
            { status: 404 }
          );
        }

        return NextResponse.json({
          format: "v2",
          page,
          nameMapping: book.name_mapping || {},
        });
      }

      return NextResponse.json({
        format: "v2",
        title: book.metadata?.title || "Story",
        pages: book.personalized_pages,
        nameMapping: book.name_mapping || {},
      });
    }

    // Check if this is a V2 book that needs on-the-fly generation
    const bookId = book.metadata?.bookId;
    if (!bookId) {
      return NextResponse.json({
        format: "v1",
        message: "Story text not available - no book ID in metadata",
      });
    }

    const resolvedBookId = resolveBookId(bookId);
    const { blueprint: rawBlueprint, format } = await loadBlueprintWithFormat(resolvedBookId);

    if (format !== "v2") {
      return NextResponse.json({
        format: "v1",
        message: "Story text not available for V1 format books",
      });
    }

    const blueprint = rawBlueprint as V2Blueprint;
    const nameMapping = book.name_mapping || {};

    // Generate personalized pages on the fly
    const personalizedPages = personalizeAllPages(blueprint, nameMapping);

    // Optional: store for future requests
    if (personalizedPages.length > 0) {
      await supabase
        .from("books")
        .update({
          personalized_pages: personalizedPages,
          blueprint_format: "v2",
        })
        .eq("id", id);
    }

    const searchParams = request.nextUrl.searchParams;
    const pageParam = searchParams.get("page");

    if (pageParam) {
      const pageNumber = parseInt(pageParam, 10);
      const page = personalizedPages.find((p) => p.page_number === pageNumber);

      if (!page) {
        return NextResponse.json(
          { error: `Page ${pageNumber} not found` },
          { status: 404 }
        );
      }

      return NextResponse.json({
        format: "v2",
        page,
        nameMapping,
      });
    }

    return NextResponse.json({
      format: "v2",
      title: blueprint.title,
      pages: personalizedPages,
      nameMapping,
    });
  } catch (error) {
    console.error("Error fetching story text:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
