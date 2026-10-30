import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/characters/[id] - Get single character
export async function GET(
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

  const { data: character, error } = await supabase
    .from("characters")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !character) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  return NextResponse.json({ character });
}

// PATCH /api/characters/[id] - Update character
export async function PATCH(
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

  const body = await request.json();
  const { name, character_type, age_group } = body;

  const { data: character, error } = await supabase
    .from("characters")
    .update({
      ...(name && { name }),
      ...(character_type && { character_type }),
      ...(age_group !== undefined && { age_group }),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ character });
}

// DELETE /api/characters/[id] - Delete character
export async function DELETE(
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

  // Get character to find photo URL for cleanup
  const { data: character } = await supabase
    .from("characters")
    .select("original_photo_url, generated_image_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!character) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  // Delete character record (cascade will handle crew_members)
  const { error } = await supabase
    .from("characters")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Clean up storage files (best effort)
  if (character.original_photo_url) {
    const photoPath = character.original_photo_url.split("/photos/")[1];
    if (photoPath) {
      await supabase.storage.from("photos").remove([photoPath]);
    }
  }
  if (character.generated_image_url) {
    const genPath = character.generated_image_url.split("/characters/")[1];
    if (genPath) {
      await supabase.storage.from("characters").remove([genPath]);
    }
  }

  return NextResponse.json({ success: true });
}
