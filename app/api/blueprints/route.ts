import { NextResponse } from "next/server";
import { listAvailableBooks, loadBlueprint } from "@/lib/book-blueprints";

// GET /api/blueprints - List all available book blueprints
export async function GET() {
  try {
    const bookIds = await listAvailableBooks();

    // Load basic info for each book
    const books = await Promise.all(
      bookIds.map(async (bookId) => {
        try {
          const blueprint = await loadBlueprint(bookId);
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
          };
        } catch {
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
