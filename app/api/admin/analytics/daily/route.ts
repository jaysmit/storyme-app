import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";

export interface DailyAnalytics {
  date: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  totalCostUsd: number;
  avgCostPerRequest: number;
  uniqueUsers: number;
  uniqueBooks: number;
  avgDurationMs: number;
  regenerations: number;
}

/**
 * GET /api/admin/analytics/daily
 * Returns daily breakdown of analytics for charting.
 * Supports date range filtering and limit.
 */
export async function GET(request: NextRequest) {
  // Check admin auth
  const { error: authError } = await requireAdminAuth();
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const limit = parseInt(searchParams.get("limit") || "30", 10);

  try {
    const supabase = createServiceClient();

    // Fetch all logs and aggregate in JS
    // (Views may not be available until migration runs)
    let query = supabase
      .from("generation_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data: logs, error } = await query;

    if (error) {
      throw error;
    }

    // Group by date
    const dailyData = new Map<
      string,
      {
        requests: typeof logs;
        users: Set<string>;
        books: Set<string>;
      }
    >();

    for (const log of logs || []) {
      const date = new Date(log.created_at).toISOString().split("T")[0];

      if (!dailyData.has(date)) {
        dailyData.set(date, {
          requests: [],
          users: new Set(),
          books: new Set(),
        });
      }

      const day = dailyData.get(date)!;
      day.requests.push(log);
      day.users.add(log.user_id);
      if (log.book_id) {
        day.books.add(log.book_id);
      }
    }

    // Convert to array and calculate metrics
    const dailyAnalytics: DailyAnalytics[] = [];

    for (const [date, data] of dailyData) {
      const completed = data.requests.filter((r) => r.status === "completed");
      const failed = data.requests.filter((r) => r.status === "failed");
      const regenerations = data.requests.filter((r) => r.is_regenerate);

      const totalCost = completed.reduce(
        (sum, log) => sum + (log.estimated_cost_usd || 0),
        0
      );

      const totalDuration = completed.reduce(
        (sum, log) => sum + (log.duration_ms || 0),
        0
      );

      dailyAnalytics.push({
        date,
        totalRequests: data.requests.length,
        successfulRequests: completed.length,
        failedRequests: failed.length,
        successRate:
          data.requests.length > 0
            ? Math.round((completed.length / data.requests.length) * 100)
            : 0,
        totalCostUsd: Math.round(totalCost * 1000000) / 1000000,
        avgCostPerRequest:
          completed.length > 0
            ? Math.round((totalCost / completed.length) * 1000000) / 1000000
            : 0,
        uniqueUsers: data.users.size,
        uniqueBooks: data.books.size,
        avgDurationMs:
          completed.length > 0 ? Math.round(totalDuration / completed.length) : 0,
        regenerations: regenerations.length,
      });
    }

    // Sort by date descending and limit
    dailyAnalytics.sort((a, b) => b.date.localeCompare(a.date));
    const limitedData = dailyAnalytics.slice(0, limit);

    // Reverse for chronological order (oldest first for charts)
    limitedData.reverse();

    return NextResponse.json({
      data: limitedData,
      totalDays: dailyAnalytics.length,
      limit,
    });
  } catch (error) {
    console.error("Error fetching daily analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily analytics" },
      { status: 500 }
    );
  }
}
