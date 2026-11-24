import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/favorites - List user's favorites (both books and stories)
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch book favorites
  const { data: bookFavorites, error: bookError } = await supabase
    .from("favorites")
    .select(`
      id,
      created_at,
      book:books (
        id,
        status,
        preview_pages,
        created_at,
        story:stories (
          slug,
          title,
          category
        ),
        art_style:art_styles (
          slug,
          name
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (bookError) {
    console.error("Error fetching book favorites:", bookError);
  }

  // Fetch story favorites
  const { data: storyFavorites, error: storyError } = await supabase
    .from("story_favorites")
    .select("id, story_slug, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (storyError) {
    // Table might not exist yet, that's ok
    console.log("Story favorites not available:", storyError.message);
  }

  return NextResponse.json({
    favorites: bookFavorites || [],
    storyFavorites: storyFavorites || [],
  });
}

// POST /api/favorites - Add book or story to favorites
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { bookId, story_slug } = body;

  // Story favorite
  if (story_slug) {
    const { data: favorite, error } = await supabase
      .from("story_favorites")
      .insert({
        user_id: user.id,
        story_slug: story_slug,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Already in favorites" }, { status: 409 });
      }
      // Table might not exist - create it
      if (error.code === "42P01") {
        return NextResponse.json({ error: "Story favorites not yet enabled" }, { status: 501 });
      }
      console.error("Error adding story favorite:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ favorite }, { status: 201 });
  }

  // Book favorite
  if (!bookId) {
    return NextResponse.json({ error: "bookId or story_slug is required" }, { status: 400 });
  }

  // Check if book exists and belongs to user
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("id")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (bookError || !book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  // Add to favorites
  const { data: favorite, error } = await supabase
    .from("favorites")
    .insert({
      user_id: user.id,
      book_id: bookId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already in favorites" }, { status: 409 });
    }
    console.error("Error adding favorite:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ favorite }, { status: 201 });
}

// DELETE /api/favorites - Remove from favorites
export async function DELETE(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check for JSON body first (story favorites)
  const contentType = request.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const body = await request.json();
    const { story_slug } = body;

    if (story_slug) {
      const { error } = await supabase
        .from("story_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("story_slug", story_slug);

      if (error) {
        console.error("Error removing story favorite:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }
  }

  // URL param (book favorites)
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get("bookId");

  if (!bookId) {
    return NextResponse.json({ error: "bookId or story_slug is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("book_id", bookId);

  if (error) {
    console.error("Error removing favorite:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
