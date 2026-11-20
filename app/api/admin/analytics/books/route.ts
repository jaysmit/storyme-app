import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";

export interface BookAnalytics {
  bookId: string;
  userId: string;
  userEmail: string | null;
  blueprintId: string | null;
  blueprintFormat: string | null;
  status: string;
  totalPages: number;
  successfulPages: number;
  failedPages: number;
  regenerations: number;
  totalCostUsd: number;
  avgCostPerPage: number;
  generationStartedAt: string;
  generationCompletedAt: string | null;
  totalDurationMs: number;
}

/**
 * GET /api/admin/analytics/books
 * Returns per-book cost breakdown with pagination.
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
  const sortBy = searchParams.get("sortBy") || "generationStartedAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const userId = searchParams.get("userId"); // Optional filter by user

  try {
    const supabase = createServiceClient();

    // Fetch logs with book_id
    let query = supabase
      .from("generation_logs")
      .select("*")
      .not("book_id", "is", null);

    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      throw logsError;
    }

    // Fetch books for status
    const { data: books, error: booksError } = await supabase
      .from("books")
      .select("id, user_id, status");

    if (booksError) {
      throw booksError;
    }

    // Fetch profiles for user info
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email");

    if (profilesError) {
      throw profilesError;
    }

    // Create lookups
    const bookMap = new Map(books?.map((b) => [b.id, b]) || []);
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Group logs by book
    const bookStats = new Map<
      string,
      {
        requests: typeof logs;
        userId: string;
        blueprintId: string | null;
        blueprintFormat: string | null;
      }
    >();

    for (const log of logs || []) {
      if (!log.book_id) continue;

      if (!bookStats.has(log.book_id)) {
        bookStats.set(log.book_id, {
          requests: [],
          userId: log.user_id,
          blueprintId: log.blueprint_id,
          blueprintFormat: log.blueprint_format,
        });
      }

      bookStats.get(log.book_id)!.requests.push(log);
    }

    // Calculate per-book metrics
    const bookAnalytics: BookAnalytics[] = [];

    for (const [bookId, data] of bookStats) {
      const book = bookMap.get(bookId);
      const profile = profileMap.get(data.userId);
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

      // Find first and last request dates
      const sortedByDate = [...data.requests].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Check if generation is complete (all pages successful, book marked complete)
      const isComplete = book?.status === "completed";
      const lastCompletedPage = [...completed].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      // Unique page numbers (excluding regenerations from count)
      const uniquePageNumbers = new Set(
        data.requests
          .filter((r) => !r.is_regenerate)
          .map((r) => r.page_number)
      );

      bookAnalytics.push({
        bookId,
        userId: data.userId,
        userEmail: profile?.email || null,
        blueprintId: data.blueprintId,
        blueprintFormat: data.blueprintFormat,
        status: book?.status || "unknown",
        totalPages: uniquePageNumbers.size,
        successfulPages: completed.filter((r) => !r.is_regenerate).length,
        failedPages: failed.filter((r) => !r.is_regenerate).length,
        regenerations: regenerations.length,
        totalCostUsd: Math.round(totalCost * 1000000) / 1000000,
        avgCostPerPage:
          uniquePageNumbers.size > 0
            ? Math.round((totalCost / uniquePageNumbers.size) * 1000000) /
              1000000
            : 0,
        generationStartedAt: sortedByDate[0]?.created_at || "",
        generationCompletedAt: isComplete
          ? lastCompletedPage?.created_at || null
          : null,
        totalDurationMs: totalDuration,
      });
    }

    // Sort
    bookAnalytics.sort((a, b) => {
      const aVal = a[sortBy as keyof BookAnalytics];
      const bVal = b[sortBy as keyof BookAnalytics];

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
    const totalBooks = bookAnalytics.length;
    const totalPages = Math.ceil(totalBooks / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedData = bookAnalytics.slice(startIndex, startIndex + pageSize);

    // Calculate totals
    const totals = {
      totalCostUsd: bookAnalytics.reduce((sum, b) => sum + b.totalCostUsd, 0),
      totalPages: bookAnalytics.reduce((sum, b) => sum + b.totalPages, 0),
      totalRegenerations: bookAnalytics.reduce(
        (sum, b) => sum + b.regenerations,
        0
      ),
    };

    return NextResponse.json({
      data: paginatedData,
      pagination: {
        page,
        pageSize,
        totalBooks,
        totalPages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      totals,
      sortBy,
      sortOrder,
    });
  } catch (error) {
    console.error("Error fetching book analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch book analytics" },
      { status: 500 }
    );
  }
}
