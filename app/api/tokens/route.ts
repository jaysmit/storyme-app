import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/tokens - Get user's token balance
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("tokens, tokens_used")
    .eq("id", user.id)
    .single();

  if (error) {
    // Profile might not exist yet, return default
    return NextResponse.json({ tokens: 5, tokens_used: 0 });
  }

  return NextResponse.json({
    tokens: profile.tokens ?? 5,
    tokens_used: profile.tokens_used ?? 0,
  });
}
