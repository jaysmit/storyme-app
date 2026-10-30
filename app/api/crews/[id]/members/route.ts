import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/crews/[id]/members - Add member to crew
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: crewId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify crew belongs to user
  const { data: crew } = await supabase
    .from("crews")
    .select("id")
    .eq("id", crewId)
    .eq("user_id", user.id)
    .single();

  if (!crew) {
    return NextResponse.json({ error: "Crew not found" }, { status: 404 });
  }

  const body = await request.json();
  const { characterId, role } = body;

  if (!characterId) {
    return NextResponse.json(
      { error: "Character ID is required" },
      { status: 400 }
    );
  }

  // Verify character belongs to user
  const { data: character } = await supabase
    .from("characters")
    .select("id")
    .eq("id", characterId)
    .eq("user_id", user.id)
    .single();

  if (!character) {
    return NextResponse.json(
      { error: "Character not found" },
      { status: 404 }
    );
  }

  // Add member (upsert to handle duplicates)
  const { data: member, error } = await supabase
    .from("crew_members")
    .upsert(
      {
        crew_id: crewId,
        character_id: characterId,
        role: role || null,
      },
      { onConflict: "crew_id,character_id" }
    )
    .select(
      `
      id,
      role,
      character:characters (
        id,
        name,
        original_photo_url,
        generated_image_url,
        generation_status,
        character_type
      )
    `
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member }, { status: 201 });
}

// DELETE /api/crews/[id]/members - Remove member from crew
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const characterId = searchParams.get("characterId");
  const crewId = searchParams.get("crewId");

  if (!characterId || !crewId) {
    return NextResponse.json(
      { error: "Character ID and Crew ID are required" },
      { status: 400 }
    );
  }

  // Verify crew belongs to user
  const { data: crew } = await supabase
    .from("crews")
    .select("id")
    .eq("id", crewId)
    .eq("user_id", user.id)
    .single();

  if (!crew) {
    return NextResponse.json({ error: "Crew not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("crew_members")
    .delete()
    .eq("crew_id", crewId)
    .eq("character_id", characterId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
