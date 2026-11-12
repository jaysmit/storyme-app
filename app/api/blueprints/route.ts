import { NextResponse } from "next/server";
import {
  listAllAvailableBooks,
  loadBlueprintWithFormat,
  type BookBlueprint,
  type V2Blueprint,
} from "@/lib/book-blueprints";

// GET /api/blueprints - List all available book blueprints (V1 and V2)
export async function GET() {
  try {
    const allBooks = await listAllAvailableBooks();

    // Load basic info for each book
    const books = await Promise.all(
      allBooks.map(async ({ bookId, format }) => {
        try {
          const { blueprint: rawBlueprint } = await loadBlueprintWithFormat(bookId);

          if (format === "v2") {
            const blueprint = rawBlueprint as V2Blueprint;
            const firstPage = blueprint.pages[0];

            return {
              bookId,
              title: blueprint.title,
              visualStyle: blueprint.visual_style.substring(0, 100) + "...",
              coverImage: firstPage?.master_image_filename
                ? `/books/${bookId}/${firstPage.master_image_filename}`
                : null,
              crewSlotCount: Object.keys(blueprint.characters).length,
              bookCharacterCount: 0, // V2 doesn't have separate book characters
              dimensions: firstPage?.master_image_size || { width: 1536, height: 1024 },
              aspectRatio: firstPage?.master_image_size
                ? firstPage.master_image_size.width / firstPage.master_image_size.height
                : 1.5,
              format: "v2",
              pageCount: blueprint.page_count,
            };
          } else {
            const blueprint = rawBlueprint as BookBlueprint;
            const coverPage = blueprint.pages.find((p) => p.pageType === "cover");

            return {
              bookId: blueprint.bookId,
              title: blueprint.title,
              visualStyle: blueprint.visualStyle.substring(0, 100) + "...",
              coverImage: coverPage?.originalImage || null,
              crewSlotCount: blueprint.characters.crewSlots.length,
              bookCharacterCount: blueprint.characters.bookCharacters.length,
              dimensions: coverPage?.composition.dimensions || null,
              aspectRatio: coverPage?.composition.aspectRatio || null,
              format: "v1",
            };
          }
        } catch (error) {
          console.error(`Failed to load blueprint ${bookId}:`, error);
          return null;
        }
      })
    );

    return NextResponse.json({
      books: books.filter(Boolean),
      count: books.filter(Boolean).length,
    });
  } catch (error) {
    console.error("Failed to list blueprints:", error);
    return NextResponse.json(
      { error: "Failed to list blueprints" },
      { status: 500 }
    );
  }
}
