import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";

export interface UserAnalytics {
  userId: string;
  email: string | null;
  name: string | null;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  totalCostUsd: number;
  avgCostPerRequest: number;
  totalBooks: number;
  completedBooks: number;
  regenerations: number;
  firstRequestAt: string;
  lastRequestAt: string;
  tokensUsed: number;
  tokensRemaining: number;
}

/**
 * GET /api/admin/analytics/users
 * Returns per-user analytics with pagination.
 */
export async function GET(request: NextRequest) {
  // Check admin auth
  const { error: authError } = await requireAdminAuth();
  if (authError) return authError;

  const searchParams = request.nextUrl.searchParams;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
  const sortBy = searchParams.get("sortBy") || "totalCostUsd";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  try {
    const supabase = createServiceClient();

    // Fetch all logs
    let query = supabase.from("generation_logs").select("*");

    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      throw logsError;
    }

    // Fetch profiles for user info
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, name, tokens, tokens_used");

    if (profilesError) {
      throw profilesError;
    }

    // Fetch books for completed counts
    const { data: books, error: booksError } = await supabase
      .from("books")
      .select("user_id, status");

    if (booksError) {
      throw booksError;
    }

    // Create profile lookup
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Group logs by user
    const userStats = new Map<
      string,
      {
        requests: typeof logs;
        books: Set<string>;
      }
    >();

    for (const log of logs || []) {
      if (!userStats.has(log.user_id)) {
        userStats.set(log.user_id, {
          requests: [],
          books: new Set(),
        });
      }

      const user = userStats.get(log.user_id)!;
      user.requests.push(log);
      if (log.book_id) {
        user.books.add(log.book_id);
      }
    }

    // Calculate per-user metrics
    const userAnalytics: UserAnalytics[] = [];

    for (const [userId, data] of userStats) {
      const profile = profileMap.get(userId);
      const completed = data.requests.filter((r) => r.status === "completed");
      const failed = data.requests.filter((r) => r.status === "failed");
      const regenerations = data.requests.filter((r) => r.is_regenerate);

      const totalCost = completed.reduce(
        (sum, log) => sum + (log.estimated_cost_usd || 0),
        0
      );

      const userBooks = books?.filter((b) => b.user_id === userId) || [];
      const completedBooks = userBooks.filter(
        (b) => b.status === "completed"
      ).length;

      // Find first and last request dates
      const sortedByDate = [...data.requests].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      userAnalytics.push({
        userId,
        email: profile?.email || null,
        name: profile?.name || null,
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
        totalBooks: data.books.size,
        completedBooks,
        regenerations: regenerations.length,
        firstRequestAt: sortedByDate[0]?.created_at || "",
        lastRequestAt: sortedByDate[sortedByDate.length - 1]?.created_at || "",
        tokensUsed: profile?.tokens_used || 0,
        tokensRemaining: profile?.tokens || 0,
      });
    }

    // Sort
    userAnalytics.sort((a, b) => {
      const aVal = a[sortBy as keyof UserAnalytics];
      const bVal = b[sortBy as keyof UserAnalytics];

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
      }
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "desc"
          ? bVal.localeCompare(aVal)
          : aVal.localeCompare(bVal);
      }
      return 0;
    });

    // Paginate
    const totalUsers = userAnalytics.length;
    const totalPages = Math.ceil(totalUsers / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedData = userAnalytics.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        totalUsers,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      sortBy,
      sortOrder,
    });
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch user analytics" },
      { status: 500 }
    );
  }
}
