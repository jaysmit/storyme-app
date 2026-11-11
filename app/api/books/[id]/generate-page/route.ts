import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSinglePage, type CharacterInput } from "@/lib/page-generation";
import { checkTokens, deductTokens } from "@/lib/tokens";
import { TOKEN_COSTS, type PageStatus } from "@/lib/types";

// POST /api/books/[id]/generate-page - Generate a single interior page
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

    // Verify book is in generating_full status
    if (book.status !== "generating_full") {
      return NextResponse.json(
        { error: `Cannot generate page - book status is "${book.status}", expected "generating_full"` },
        { status: 400 }
      );
    }

    // Check if page exists in page_statuses
    const pageStatuses: PageStatus[] = book.page_statuses || [];
    const pageIndex = pageStatuses.findIndex((p) => p.pageId === pageId);

    if (pageIndex === -1) {
      return NextResponse.json(
        { error: `Page "${pageId}" not found in book page_statuses` },
        { status: 400 }
      );
    }

    const pageStatus = pageStatuses[pageIndex];

    // Check if page is already generating or completed
    if (pageStatus.status === "generating") {
      return NextResponse.json(
        { error: `Page "${pageId}" is already generating` },
        { status: 400 }
      );
    }

    if (pageStatus.status === "completed") {
      return NextResponse.json({
        pageId,
        status: "completed",
        url: pageStatus.url,
        message: "Page already generated",
      });
    }

    // Get generation config
    const config = book.generation_config;
    if (!config?.bookId || !config?.characterIds) {
      return NextResponse.json(
        { error: "Book missing generation config" },
        { status: 400 }
      );
    }

    // Check tokens
    const tokenCost = TOKEN_COSTS.BOOK_PAGE;
    const { hasEnough, balance } = await checkTokens(supabase, user.id, tokenCost);

    if (!hasEnough) {
      return NextResponse.json(
        {
          error: "Insufficient tokens",
          required: tokenCost,
          balance,
          message: `You need ${tokenCost} token for a book page but only have ${balance}.`,
        },
        { status: 402 }
      );
    }

    // Update page status to generating
    pageStatuses[pageIndex] = {
      ...pageStatus,
      status: "generating",
      startedAt: new Date().toISOString(),
      error: undefined,
    };

    await supabase
      .from("books")
      .update({
        page_statuses: pageStatuses,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Fetch characters from database
    let charData: CharacterInput[] | null = null;
    const { data: data1, error: error1 } = await supabase
      .from("characters")
      .select("id, name, character_type, pet_type, age, generated_image_url, identity_profile, identity_confirmed")
      .in("id", config.characterIds);

    if (error1?.message?.includes("age") || error1?.message?.includes("identity")) {
      // Some columns don't exist, try minimal query
      const { data: data2 } = await supabase
        .from("characters")
        .select("id, name, character_type, pet_type, generated_image_url")
        .in("id", config.characterIds);
      charData = data2;
    } else {
      charData = data1;
    }

    const characters: CharacterInput[] = charData || [];

    // Validate all characters have generated images
    const missingImages = characters.filter((c) => !c.generated_image_url);
    if (missingImages.length > 0) {
      const names = missingImages.map((c) => c.name).join(", ");

      // Update page status to failed
      pageStatuses[pageIndex] = {
        ...pageStatus,
        status: "failed",
        error: `Character illustrations required: ${names}`,
        retryCount: pageStatus.retryCount + 1,
      };
      await supabase
        .from("books")
        .update({ page_statuses: pageStatuses })
        .eq("id", id);

      return NextResponse.json(
        { error: `Character illustrations required: ${names}` },
        { status: 400 }
      );
    }

    // Generate the page
    const result = await generateSinglePage(
      id,
      user.id,
      pageId,
      config.bookId,
      characters
    );

    if (result.success && result.url) {
      // Update page status to completed
      pageStatuses[pageIndex] = {
        ...pageStatus,
        status: "completed",
        url: result.url,
        completedAt: new Date().toISOString(),
        error: undefined,
      };

      // Check if all pages are completed
      const allCompleted = pageStatuses.every((p) => p.status === "completed");

      // Update preview_pages array with this page
      const previewPages = [...(book.preview_pages || [])];
      const existingPageIndex = previewPages.findIndex(
        (p) => p.page_number === result.pageNumber
      );
      if (existingPageIndex >= 0) {
        previewPages[existingPageIndex] = {
          page_number: result.pageNumber,
          url: result.url,
        };
      } else {
        previewPages.push({
          page_number: result.pageNumber,
          url: result.url,
        });
      }

      // Sort by page number
      previewPages.sort((a, b) => a.page_number - b.page_number);

      await supabase
        .from("books")
        .update({
          page_statuses: pageStatuses,
          preview_pages: previewPages,
          status: allCompleted ? "completed" : "generating_full",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      // Deduct tokens
      const deductResult = await deductTokens(
        supabase,
        user.id,
        tokenCost,
        "book_page",
        id,
        `Page: ${pageId}`
      );

      return NextResponse.json({
        pageId,
        pageNumber: result.pageNumber,
        status: "completed",
        url: result.url,
        tokensUsed: tokenCost,
        tokensRemaining: deductResult.newBalance,
        allCompleted,
      });
    } else {
      // Update page status to failed
      pageStatuses[pageIndex] = {
        ...pageStatus,
        status: "failed",
        error: result.error || "Unknown error",
        retryCount: pageStatus.retryCount + 1,
      };

      await supabase
        .from("books")
        .update({
          page_statuses: pageStatuses,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      return NextResponse.json(
        {
          pageId,
          status: "failed",
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error generating page:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
