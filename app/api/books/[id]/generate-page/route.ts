import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSinglePage, type CharacterInput } from "@/lib/page-generation";
import { type PageStatus, type PageVersion } from "@/lib/types";
import {
  startGenerationLog,
  completeGenerationLog,
  failGenerationLog,
} from "@/lib/generation-logs";
import {
  validateBookCompletion,
  logValidationResult,
} from "@/lib/book-validation";

/**
 * Reorder characters to match the specified order of IDs.
 * This is necessary because Supabase .in() doesn't preserve order.
 */
function reorderCharacters(
  characters: CharacterInput[],
  orderedIds: string[]
): CharacterInput[] {
  const charMap = new Map(characters.map((c) => [c.id, c]));
  const ordered: CharacterInput[] = [];

  for (const id of orderedIds) {
    const char = charMap.get(id);
    if (char) {
      ordered.push(char);
    }
  }

  return ordered;
}

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
    // Accept either pageId or pageNumber
    let { pageId, pageNumber, fromCron } = body;

    if (!pageId && pageNumber === undefined) {
      return NextResponse.json(
        { error: "Missing pageId or pageNumber in request body" },
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

    // Allow generation for books in generating_full, completed, or preview_ready status
    // This enables regeneration of failed/missing pages after initial generation
    const allowedStatuses = ["generating_full", "completed", "preview_ready", "cover_approved"];
    if (!allowedStatuses.includes(book.status)) {
      return NextResponse.json(
        { error: `Cannot generate page - book status is "${book.status}", expected one of: ${allowedStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if page exists in page_statuses
    const pageStatuses: PageStatus[] = book.page_statuses || [];

    // Find by pageId or pageNumber
    let pageIndex: number;
    if (pageId) {
      pageIndex = pageStatuses.findIndex((p) => p.pageId === pageId);
    } else {
      pageIndex = pageStatuses.findIndex((p) => p.pageNumber === pageNumber);
    }

    if (pageIndex === -1) {
      return NextResponse.json(
        { error: `Page "${pageId || `number ${pageNumber}`}" not found in book page_statuses` },
        { status: 400 }
      );
    }

    const pageStatus = pageStatuses[pageIndex];
    // Ensure we have pageId for consistency
    pageId = pageStatus.pageId;

    // Check if page is already generating (skip check if from cron - cron handles stuck detection)
    if (pageStatus.status === "generating" && !fromCron) {
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

    // Note: Tokens are checked and deducted upfront in start-full-generation
    // This endpoint assumes tokens were already reserved

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

    // Start generation log for interior page
    const generationLog = await startGenerationLog({
      user_id: user.id,
      book_id: id,
      event_type: pageStatus.retryCount > 0 ? "page_regenerate" : "page_generate",
      page_number: pageStatus.pageNumber,
      character_count: config.characterIds.length,
      blueprint_id: config.bookId,
      blueprint_format: book.blueprint_format || "v1",
      is_regenerate: pageStatus.retryCount > 0,
    });

    // Use characters snapshot if available (resilient to deleted characters)
    // Otherwise fall back to fetching from database
    let characters: CharacterInput[] = [];

    if (book.characters_snapshot && Array.isArray(book.characters_snapshot) && book.characters_snapshot.length > 0) {
      // Use the stored snapshot - characters are preserved even if deleted
      // Reorder to match characterIds order (snapshot may not be in order)
      console.log(`Using characters snapshot (${book.characters_snapshot.length} characters)`);
      const rawSnapshot = book.characters_snapshot as CharacterInput[];
      characters = reorderCharacters(rawSnapshot, config.characterIds);
      console.log("Snapshot order:", characters.map((c, i) => `${i + 1}. ${c.name}`).join(", "));
    } else {
      // Fall back to fetching from database
      console.log("No characters snapshot, fetching from database");
      let charData: CharacterInput[] | null = null;
      const { data: data1, error: error1 } = await supabase
        .from("characters")
        .select("id, name, character_type, pet_type, age, height_cm, generated_image_url, identity_profile, identity_confirmed")
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

      // Reorder to match characterIds order (important for priority)
      const rawCharacters = charData || [];
      characters = reorderCharacters(rawCharacters, config.characterIds);
      console.log("Fetched order:", characters.map((c, i) => `${i + 1}. ${c.name}`).join(", "));
    }

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
      // Save previous version if there was an existing URL (regeneration)
      let versions: PageVersion[] = pageStatus.versions || [];
      if (pageStatus.url) {
        // Add current URL to versions history (most recent first)
        versions = [
          { url: pageStatus.url, createdAt: pageStatus.completedAt || new Date().toISOString() },
          ...versions,
        ].slice(0, 5); // Keep max 5 versions
        console.log(`Saved previous version for page ${pageId}, now have ${versions.length} versions`);
      }

      // Update page status to completed
      pageStatuses[pageIndex] = {
        ...pageStatus,
        status: "completed",
        url: result.url,
        completedAt: new Date().toISOString(),
        error: undefined,
        versions,
      };

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

      // CRITICAL: Validate book completion against blueprint expectations
      // This ensures we don't mark books complete with missing pages
      const validation = await validateBookCompletion(
        pageStatuses,
        config,
        config.bookId
      );
      logValidationResult(validation);

      // Determine new status based on validation
      let newStatus: string;
      if (validation.isComplete && validation.recommendedStatus === "completed") {
        newStatus = "completed";
        console.log(`Book ${id} VALIDATED as complete - all ${validation.expectedPageCount} pages generated`);
      } else if (validation.failedCount > 0 || validation.missingCount > 0) {
        // Has failures but no active generation - mark as incomplete
        const hasActiveGeneration = validation.generatingCount > 0 || validation.pendingCount > 0;
        if (!hasActiveGeneration) {
          newStatus = "incomplete";
          console.log(`Book ${id} marked INCOMPLETE - ${validation.failedCount} failed, ${validation.missingCount} missing`);
        } else {
          newStatus = "generating_full";
        }
      } else {
        newStatus = "generating_full";
      }

      await supabase
        .from("books")
        .update({
          page_statuses: pageStatuses,
          preview_pages: previewPages,
          status: newStatus,
          validation_result: validation,
          validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      // Note: Tokens were already deducted upfront in start-full-generation

      // Complete generation log
      if (generationLog) {
        await completeGenerationLog(generationLog.id, {
          tokens_used: 1, // 1 token per page
          output_url: result.url,
          metadata: {
            page_id: pageId,
            page_number: result.pageNumber,
          },
        });
      }

      // Chain trigger: Spawn multiple pending pages to maintain parallelism
      // This keeps ~3 pages generating concurrently for faster completion
      const CONCURRENT_TARGET = 3;
      if (!validation.isComplete && validation.pendingCount > 0) {
        const pendingPages = pageStatuses.filter((p) => p.status === "pending");
        const generatingCount = pageStatuses.filter((p) => p.status === "generating").length;

        // Trigger enough pages to maintain target concurrency
        const toTriggerCount = Math.min(
          CONCURRENT_TARGET - generatingCount,
          pendingPages.length
        );

        if (toTriggerCount > 0) {
          const pagesToTrigger = pendingPages.slice(0, toTriggerCount);
          console.log(`[CHAIN] Triggering ${pagesToTrigger.length} pages to maintain ${CONCURRENT_TARGET} concurrent (${generatingCount} currently generating)`);
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://storyme-app-roan.vercel.app";

          // Fire and forget - don't await
          for (const page of pagesToTrigger) {
            fetch(`${baseUrl}/api/books/${id}/generate-page`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pageId: page.pageId,
                fromCron: true, // Treat as background job
              }),
            }).catch((err) => {
              console.error(`[CHAIN] Failed to trigger page ${page.pageId}:`, err);
            });
          }
        }
      }

      return NextResponse.json({
        pageId,
        pageNumber: result.pageNumber,
        status: "completed",
        url: result.url,
        allCompleted: validation.isComplete,
        validation: {
          completedCount: validation.completedCount,
          expectedCount: validation.expectedPageCount,
          failedCount: validation.failedCount,
          missingCount: validation.missingCount,
        },
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

      // Fail generation log
      if (generationLog) {
        await failGenerationLog(generationLog.id, result.error || "Unknown error");
      }

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

    // Note: generationLog may not be in scope if error happened before it was created
    // The log will remain in "started" status if not completed/failed

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
