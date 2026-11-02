import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/crews/[id] - Get single crew with members
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

  const { data: crew, error } = await supabase
    .from("crews")
    .select(
      `
      *,
      crew_members (
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
      )
    `
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !crew) {
    return NextResponse.json({ error: "Crew not found" }, { status: 404 });
  }

  return NextResponse.json({ crew });
}

// PATCH /api/crews/[id] - Update crew
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
  const { name, characterIds } = body;

  if (!name) {
    return NextResponse.json(
      { error: "Crew name is required" },
      { status: 400 }
    );
  }

  // Verify crew ownership
  const { data: existingCrew } = await supabase
    .from("crews")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existingCrew) {
    return NextResponse.json({ error: "Crew not found" }, { status: 404 });
  }

  // Update crew name
  const { error: updateError } = await supabase
    .from("crews")
    .update({ name })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Update members if characterIds provided
  if (characterIds !== undefined) {
    // Delete existing members
    await supabase.from("crew_members").delete().eq("crew_id", id);

    // Add new members
    if (characterIds.length > 0) {
      const members = characterIds.map((characterId: string) => ({
        crew_id: id,
        character_id: characterId,
      }));

      const { error: membersError } = await supabase
        .from("crew_members")
        .insert(members);

      if (membersError) {
        console.error("Error adding members:", membersError);
      }
    }
  }

  // Fetch the complete updated crew
  const { data: crew } = await supabase
    .from("crews")
    .select(
      `
      *,
      crew_members (
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
      )
    `
    )
    .eq("id", id)
    .single();

  return NextResponse.json({ crew });
}

// DELETE /api/crews/[id] - Delete crew
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

  const { error } = await supabase
    .from("crews")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
