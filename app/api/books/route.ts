import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/books - Create a new book
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { storySlug, artStyle, characterIds, characters, roleAssignments } = body;

    if (!storySlug || !artStyle) {
      return NextResponse.json(
        { error: "Missing required fields: storySlug and artStyle" },
        { status: 400 }
      );
    }

    // Accept either characterIds or characters
    const charIds = characterIds || characters || [];

    // Build the insert data - metadata column may not exist
    const insertData: Record<string, unknown> = {
      user_id: user.id,
      story_id: null,
      art_style_id: null,
      status: "draft",
      preview_pages: [],
    };

    // Try with metadata first
    const { data: book, error } = await supabase
      .from("books")
      .insert({
        ...insertData,
        metadata: {
          storySlug,
          artStyle,
          characterIds: charIds,
          roleAssignments,
        },
      })
      .select()
      .single();

    if (error) {
      // If metadata column doesn't exist, try without it
      if (error.message?.includes("metadata")) {
        console.log("Metadata column not found, inserting without it");
        const { data: bookNoMeta, error: error2 } = await supabase
          .from("books")
          .insert(insertData)
          .select()
          .single();

        if (error2) {
          console.error("Book creation error:", error2);
          return NextResponse.json(
            { error: `Failed to create book: ${error2.message}` },
            { status: 500 }
          );
        }

        return NextResponse.json({ book: bookNoMeta });
      }

      console.error("Book creation error:", error);
      return NextResponse.json(
        { error: `Failed to create book: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ book });
  } catch (error) {
    console.error("Book creation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create book: ${message}` },
      { status: 500 }
    );
  }
}

// GET /api/books - List user's books
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: books, error } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Books fetch error:", error);
      return NextResponse.json({ books: [] });
    }

    return NextResponse.json({ books: books || [] });
  } catch (error) {
    console.error("Books fetch error:", error);
    return NextResponse.json({ books: [] });
  }
}
