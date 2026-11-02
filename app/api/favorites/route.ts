import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/favorites - List user's favorites
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: favorites, error } = await supabase
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

  if (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ favorites });
}

// POST /api/favorites - Add book to favorites
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await request.json();

  if (!bookId) {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
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
      // Already favorited
      return NextResponse.json({ error: "Already in favorites" }, { status: 409 });
    }
    console.error("Error adding favorite:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ favorite }, { status: 201 });
}

// DELETE /api/favorites?bookId=xxx - Remove from favorites
export async function DELETE(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get("bookId");

  if (!bookId) {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
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
