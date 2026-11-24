import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";

// Allow blocking prerender for auth-protected routes
export const instant = false;

// GET /api/admin/generations - Get all active generations and recent logs
export async function GET() {
  // Admin auth check
  const authResult = await requireAdminAuth();
  if (authResult.error) {
    return authResult.error;
  }

  const supabase = createServiceClient();

  try {
    // Get all books that are generating or have recent activity
    const { data: activeBooks, error: booksError } = await supabase
      .from("books")
      .select(`
        id,
        status,
        created_at,
        updated_at,
        preview_pages,
        page_statuses,
        generation_config,
        characters_snapshot,
        metadata
      `)
      .in("status", ["draft", "generating", "generating_full", "cover_approved", "preview_ready", "incomplete"])
      .order("updated_at", { ascending: false })
      .limit(50);

    if (booksError) {
      console.error("Failed to fetch active books:", booksError);
      return NextResponse.json({ error: "Failed to fetch active books" }, { status: 500 });
    }

    // Get recent generation logs (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentLogs, error: logsError } = await supabase
      .from("generation_logs")
      .select(`
        id,
        user_id,
        book_id,
        event_type,
        status,
        started_at,
        completed_at,
        duration_ms,
        error_message,
        page_number,
        character_count,
        blueprint_id,
        is_regenerate,
        output_url,
        estimated_cost_usd,
        model_used,
        metadata
      `)
      .gte("started_at", twentyFourHoursAgo)
      .order("started_at", { ascending: false })
      .limit(100);

    if (logsError) {
      console.error("Failed to fetch generation logs:", logsError);
      // Don't fail - just return empty logs
    }

    // Calculate summary stats
    const stats = {
      activeGenerations: 0,
      pendingPages: 0,
      failedPages: 0,
      completedLast24h: 0,
      failedLast24h: 0,
      averageDurationMs: 0,
      totalCostLast24h: 0,
    };

    // Process active books for stats
    activeBooks?.forEach((book) => {
      if (book.status === "generating" || book.status === "generating_full") {
        stats.activeGenerations++;
      }
      if (book.page_statuses && Array.isArray(book.page_statuses)) {
        book.page_statuses.forEach((ps: { status: string }) => {
          if (ps.status === "pending") stats.pendingPages++;
          if (ps.status === "failed") stats.failedPages++;
        });
      }
    });

    // Process logs for stats
    let totalDuration = 0;
    let durationCount = 0;
    recentLogs?.forEach((log) => {
      if (log.status === "completed") {
        stats.completedLast24h++;
        if (log.duration_ms) {
          totalDuration += log.duration_ms;
          durationCount++;
        }
      }
      if (log.status === "failed") {
        stats.failedLast24h++;
      }
      if (log.estimated_cost_usd) {
        stats.totalCostLast24h += parseFloat(log.estimated_cost_usd);
      }
    });
    stats.averageDurationMs = durationCount > 0 ? Math.round(totalDuration / durationCount) : 0;

    return NextResponse.json({
      books: activeBooks || [],
      logs: recentLogs || [],
      stats,
    });
  } catch (error) {
    console.error("Generation monitoring error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
