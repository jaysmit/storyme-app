import { NextRequest, NextResponse } from "next/server";
import {
  loadBlueprintWithFormat,
  type BookBlueprint,
  type V2Blueprint,
} from "@/lib/book-blueprints";

// GET /api/blueprints/[bookId]/pages - Get all pages of a blueprint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;

  try {
    const { blueprint: rawBlueprint, format } = await loadBlueprintWithFormat(bookId);

    if (format === "v2") {
      const blueprint = rawBlueprint as V2Blueprint;

      const pages = blueprint.pages.map((page) => ({
        pageNumber: page.page_number,
        title: page.title,
        imageUrl: page.master_image_filename
          ? `/books/${bookId}/${page.master_image_filename}`
          : null,
        storyText: page.story_text || "",
        storyTextTemplate: page.story_text_template || "",
        isCover: page.page_number === 0,
        sceneDescription: page.scene_description || "",
      }));

      return NextResponse.json({
        bookId,
        title: blueprint.title,
        format: "v2",
        pageCount: blueprint.page_count,
        visualStyle: blueprint.visual_style,
        characters: blueprint.characters,
        pages,
      });
    } else {
      const blueprint = rawBlueprint as BookBlueprint;

      const pages = blueprint.pages.map((page) => ({
        pageNumber: page.pageNumber,
        title: page.pageType === "cover" ? "Cover" : `Page ${page.pageNumber}`,
        imageUrl: page.originalImage || null,
        isCover: page.pageType === "cover",
      }));

      return NextResponse.json({
        bookId,
        title: blueprint.title,
        format: "v1",
        pageCount: blueprint.pages.length,
        pages,
      });
    }
  } catch (error) {
    console.error(`Failed to load blueprint pages for ${bookId}:`, error);
    return NextResponse.json(
      { error: "Blueprint not found" },
      { status: 404 }
    );
  }
}
