import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/characters - List user's characters
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: characters, error } = await supabase
    .from("characters")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ characters });
}

// POST /api/characters - Upload photo and create character
// Supports both FormData (file upload) and JSON (base64)
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    let name: string;
    let characterType: string;
    let petType: string | null;
    let ageGroup: string | null;
    let fileBuffer: Buffer;
    let fileExt: string;
    let mimeType: string;

    if (contentType.includes("application/json")) {
      // Handle JSON with base64
      const body = await request.json();
      name = body.name;
      characterType = body.characterType || "person";
      petType = body.petType || null;
      ageGroup = body.ageGroup || null;

      if (!body.photoBase64 || !name) {
        return NextResponse.json(
          { error: "Photo and name are required" },
          { status: 400 }
        );
      }

      // Parse base64 data URL
      const matches = body.photoBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return NextResponse.json(
          { error: "Invalid base64 image format" },
          { status: 400 }
        );
      }

      mimeType = matches[1];
      fileBuffer = Buffer.from(matches[2], "base64");
      fileExt = mimeType.split("/")[1] || "jpg";
    } else {
      // Handle FormData
      const formData = await request.formData();
      const file = formData.get("photo") as File;
      name = formData.get("name") as string;
      characterType = (formData.get("type") as string) || "person";
      petType = formData.get("petType") as string | null;
      ageGroup = formData.get("ageGroup") as string | null;

      if (!file || !name) {
        return NextResponse.json(
          { error: "Photo and name are required" },
          { status: 400 }
        );
      }

      fileBuffer = Buffer.from(await file.arrayBuffer());
      fileExt = file.name.split(".").pop() || "jpg";
      mimeType = file.type;
    }

    // Upload photo to Supabase Storage
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload photo" },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("photos").getPublicUrl(fileName);

    // Create character record - try with pet_type first, fallback without if column doesn't exist
    const baseData = {
      user_id: user.id,
      name,
      original_photo_url: publicUrl,
      character_type: characterType,
      age_group: ageGroup,
      generation_status: "pending",
    };

    let character;
    let insertError;

    // Try with pet_type if we have one
    if (petType) {
      const result = await supabase
        .from("characters")
        .insert({ ...baseData, pet_type: petType })
        .select()
        .single();

      // If pet_type column doesn't exist, retry without it
      if (result.error?.code === "PGRST204" && result.error?.message?.includes("pet_type")) {
        console.log("pet_type column not found, inserting without it");
        const retryResult = await supabase
          .from("characters")
          .insert(baseData)
          .select()
          .single();
        character = retryResult.data;
        insertError = retryResult.error;
      } else {
        character = result.data;
        insertError = result.error;
      }
    } else {
      const result = await supabase
        .from("characters")
        .insert(baseData)
        .select()
        .single();
      character = result.data;
      insertError = result.error;
    }

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create character" },
        { status: 500 }
      );
    }

    return NextResponse.json({ character }, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
