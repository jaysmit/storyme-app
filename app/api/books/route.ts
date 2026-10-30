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
    const { storySlug, artStyle, characters, roleAssignments } = body;

    if (!storySlug || !artStyle) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create the book record
    const { data: book, error } = await supabase
      .from("books")
      .insert({
        user_id: user.id,
        story_id: null, // Will be set when we have real story IDs
        art_style_id: null, // Will be set when we have real style IDs
        status: "draft",
        preview_pages: [],
        // Store metadata for generation
        metadata: {
          storySlug,
          artStyle,
          characters,
          roleAssignments,
        },
      })
      .select()
      .single();

    if (error) {
      console.error("Book creation error:", error);
      return NextResponse.json(
        { error: "Failed to create book" },
        { status: 500 }
      );
    }

    return NextResponse.json({ book });
  } catch (error) {
    console.error("Book creation error:", error);
    return NextResponse.json(
      { error: "Failed to create book" },
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
