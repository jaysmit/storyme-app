import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";

export interface AnalyticsSummary {
  // Cost metrics
  totalCostUsd: number;
  avgCostPerRequest: number;
  avgCostPerBook: number;

  // Request metrics
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;

  // User metrics
  totalUsers: number;
  activeUsersLast7Days: number;
  activeUsersLast30Days: number;

  // Book metrics
  totalBooks: number;
  completedBooks: number;
  avgPagesPerBook: number;

  // Regeneration metrics
  totalRegenerations: number;
  regenerationRate: number;

  // Time period
  periodStart: string;
  periodEnd: string;
}

/**
 * GET /api/admin/analytics/summary
 * Returns overall KPI summary for the admin dashboard.
 * Supports date range filtering via query params.
 */
export async function GET(request: NextRequest) {
  // Check admin auth
  const { error: authError, userId } = await requireAdminAuth();
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  try {
    const supabase = createServiceClient();

    // Build date filter
    let dateFilter = "";
    const params: string[] = [];
    if (startDate) {
      dateFilter += ` AND created_at >= '${startDate}'`;
    }
    if (endDate) {
      dateFilter += ` AND created_at <= '${endDate}'`;
    }

    // Get generation log metrics
    const { data: logMetrics, error: logError } = await supabase
      .rpc("get_generation_metrics", {
        start_date: startDate || "1970-01-01",
        end_date: endDate || "2100-01-01",
      });

    // Fallback to direct query if RPC doesn't exist yet
    let metrics;
    if (logError) {
      // Direct query approach
      const { data: logs, error: directError } = await supabase
        .from("generation_logs")
        .select("*");

      if (directError) {
        throw directError;
      }

      // Apply date filters in JS
      let filteredLogs = logs || [];
      if (startDate) {
        filteredLogs = filteredLogs.filter(
          (log) => new Date(log.created_at) >= new Date(startDate)
        );
      }
      if (endDate) {
        filteredLogs = filteredLogs.filter(
          (log) => new Date(log.created_at) <= new Date(endDate)
        );
      }

      const completed = filteredLogs.filter((log) => log.status === "completed");
      const regenerations = filteredLogs.filter((log) => log.is_regenerate);
      const uniqueUsers = new Set(filteredLogs.map((log) => log.user_id));
      const uniqueBooks = new Set(
        filteredLogs.filter((log) => log.book_id).map((log) => log.book_id)
      );

      // Calculate active users (need to query profiles for recent activity)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeUsers7Days = new Set(
        filteredLogs
          .filter((log) => new Date(log.created_at) >= sevenDaysAgo)
          .map((log) => log.user_id)
      );
      const activeUsers30Days = new Set(
        filteredLogs
          .filter((log) => new Date(log.created_at) >= thirtyDaysAgo)
          .map((log) => log.user_id)
      );

      const totalCost = completed.reduce(
        (sum, log) => sum + (log.estimated_cost_usd || 0),
        0
      );

      metrics = {
        totalCostUsd: totalCost,
        avgCostPerRequest: completed.length > 0 ? totalCost / completed.length : 0,
        avgCostPerBook:
          uniqueBooks.size > 0 ? totalCost / uniqueBooks.size : 0,
        totalRequests: filteredLogs.length,
        successfulRequests: completed.length,
        failedRequests: filteredLogs.filter((log) => log.status === "failed")
          .length,
        successRate:
          filteredLogs.length > 0
            ? (completed.length / filteredLogs.length) * 100
            : 0,
        totalUsers: uniqueUsers.size,
        activeUsersLast7Days: activeUsers7Days.size,
        activeUsersLast30Days: activeUsers30Days.size,
        totalBooks: uniqueBooks.size,
        totalRegenerations: regenerations.length,
        regenerationRate:
          filteredLogs.length > 0
            ? (regenerations.length / filteredLogs.length) * 100
            : 0,
      };
    } else {
      metrics = logMetrics;
    }

    // Get completed books count
    const { count: completedBooksCount } = await supabase
      .from("books")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    // Calculate avg pages per book from generation logs
    const { data: bookPageCounts } = await supabase
      .from("generation_logs")
      .select("book_id")
      .not("book_id", "is", null)
      .eq("status", "completed");

    const pagesPerBook = new Map<string, number>();
    (bookPageCounts || []).forEach((log) => {
      const count = pagesPerBook.get(log.book_id) || 0;
      pagesPerBook.set(log.book_id, count + 1);
    });

    const avgPagesPerBook =
      pagesPerBook.size > 0
        ? Array.from(pagesPerBook.values()).reduce((a, b) => a + b, 0) /
          pagesPerBook.size
        : 0;

    const summary: AnalyticsSummary = {
      ...metrics,
      completedBooks: completedBooksCount || 0,
      avgPagesPerBook,
      periodStart: startDate || "All time",
      periodEnd: endDate || "Present",
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching analytics summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics summary" },
      { status: 500 }
    );
  }
}
