import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { type PageStatus, type PageVersion } from "@/lib/types";

// POST /api/books/[id]/switch-version - Switch a page to a previous version
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
    const { pageId, versionIndex } = body;

    if (!pageId || versionIndex === undefined) {
      return NextResponse.json(
        { error: "Missing pageId or versionIndex" },
        { status: 400 }
      );
    }

    // Get the book
    const { data: book, error: fetchError } = await supabase
      .from("books")
      .select("page_statuses, preview_pages")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const pageStatuses: PageStatus[] = book.page_statuses || [];
    const pageIndex = pageStatuses.findIndex((p) => p.pageId === pageId);

    if (pageIndex === -1) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const pageStatus = pageStatuses[pageIndex];
    const versions: PageVersion[] = pageStatus.versions || [];

    if (versionIndex < 0 || versionIndex >= versions.length) {
      return NextResponse.json(
        { error: "Invalid version index" },
        { status: 400 }
      );
    }

    // Swap: current becomes version, selected version becomes current
    const selectedVersion = versions[versionIndex];
    const currentUrl = pageStatus.url;
    const currentCreatedAt = pageStatus.completedAt || new Date().toISOString();

    // Build new versions array: remove selected, add current at that position
    const newVersions = [...versions];
    newVersions[versionIndex] = {
      url: currentUrl!,
      createdAt: currentCreatedAt,
    };

    // Update page status with selected version as current
    pageStatuses[pageIndex] = {
      ...pageStatus,
      url: selectedVersion.url,
      completedAt: selectedVersion.createdAt,
      versions: newVersions,
    };

    // Also update preview_pages to reflect the change
    const previewPages = [...(book.preview_pages || [])];
    const previewIndex = previewPages.findIndex(
      (p) => p.page_number === pageStatus.pageNumber
    );
    if (previewIndex >= 0) {
      previewPages[previewIndex] = {
        ...previewPages[previewIndex],
        url: selectedVersion.url,
      };
    }

    // Save updates
    await supabase
      .from("books")
      .update({
        page_statuses: pageStatuses,
        preview_pages: previewPages,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    console.log(`Switched page ${pageId} to version ${versionIndex}`);

    return NextResponse.json({
      success: true,
      pageId,
      newUrl: selectedVersion.url,
      versionCount: newVersions.length,
    });
  } catch (error) {
    console.error("Error switching version:", error);
    return NextResponse.json(
      { error: "Failed to switch version" },
      { status: 500 }
    );
  }
}
