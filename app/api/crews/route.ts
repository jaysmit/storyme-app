import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/crews - List user's crews with members
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: crews, error } = await supabase
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
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ crews });
}

// POST /api/crews - Create a new crew
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
    const { name, characterIds, roles } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Crew name is required" },
        { status: 400 }
      );
    }

    // Create crew
    const { data: crew, error: crewError } = await supabase
      .from("crews")
      .insert({
        user_id: user.id,
        name,
      })
      .select()
      .single();

    if (crewError) {
      return NextResponse.json({ error: crewError.message }, { status: 500 });
    }

    // Add members if provided
    if (characterIds && characterIds.length > 0) {
      const members = characterIds.map((characterId: string, index: number) => ({
        crew_id: crew.id,
        character_id: characterId,
        role: roles?.[index] || null,
      }));

      const { error: membersError } = await supabase
        .from("crew_members")
        .insert(members);

      if (membersError) {
        console.error("Error adding members:", membersError);
      }
    }

    // Fetch the complete crew with members
    const { data: completeCrew } = await supabase
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
      .eq("id", crew.id)
      .single();

    return NextResponse.json({ crew: completeCrew }, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
