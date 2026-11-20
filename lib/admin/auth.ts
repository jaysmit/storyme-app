/**
 * Admin Authentication Helper
 *
 * Provides utilities for checking admin access in API routes and pages.
 */

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export interface AdminAuthResult {
  isAdmin: boolean;
  userId: string | null;
  error?: string;
}

/**
 * Check if the current user has admin access.
 * Uses the user's session and checks the is_admin flag in profiles.
 *
 * @returns AdminAuthResult with isAdmin status and userId
 */
export async function checkAdminAuth(): Promise<AdminAuthResult> {
  try {
    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        isAdmin: false,
        userId: null,
        error: "Not authenticated",
      };
    }

    // Use service client to check admin status (bypasses RLS)
    const serviceClient = createServiceClient();
    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error checking admin status:", profileError);
      return {
        isAdmin: false,
        userId: user.id,
        error: "Failed to check admin status",
      };
    }

    return {
      isAdmin: profile?.is_admin === true,
      userId: user.id,
    };
  } catch (err) {
    console.error("Admin auth check error:", err);
    return {
      isAdmin: false,
      userId: null,
      error: "Authentication error",
    };
  }
}

/**
 * Require admin access for an API route.
 * Returns a NextResponse error if not authenticated or not admin.
 *
 * @returns null if admin access granted, NextResponse error otherwise
 */
export async function requireAdminAuth(): Promise<{
  error: NextResponse | null;
  userId: string | null;
}> {
  const authResult = await checkAdminAuth();

  if (!authResult.userId) {
    return {
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      ),
      userId: null,
    };
  }

  if (!authResult.isAdmin) {
    return {
      error: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      ),
      userId: null,
    };
  }

  return {
    error: null,
    userId: authResult.userId,
  };
}

/**
 * Get admin profile data (useful for displaying admin info in dashboard)
 */
export async function getAdminProfile(
  userId: string
): Promise<{
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
} | null> {
  try {
    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from("profiles")
      .select("id, name, email, avatar_url")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching admin profile:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("Admin profile fetch error:", err);
    return null;
  }
}

/**
 * Set a user as admin (utility for initial setup)
 * Only use this in scripts or admin setup routes
 */
export async function setUserAsAdmin(
  userIdOrEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const serviceClient = createServiceClient();

    // Check if it's an email or UUID
    const isEmail = userIdOrEmail.includes("@");

    let query;
    if (isEmail) {
      query = serviceClient
        .from("profiles")
        .update({ is_admin: true })
        .eq("email", userIdOrEmail);
    } else {
      query = serviceClient
        .from("profiles")
        .update({ is_admin: true })
        .eq("id", userIdOrEmail);
    }

    const { error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
