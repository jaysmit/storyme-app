"use client";

import { useState, useEffect, useCallback } from "react";
import KPICards from "./components/KPICards";
import DateRangePicker from "./components/DateRangePicker";
import CostChart from "./components/CostChart";
import UserTable from "./components/UserTable";
import BookCostTable from "./components/BookCostTable";

interface Summary {
  totalCostUsd: number;
  avgCostPerRequest: number;
  avgCostPerBook: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  totalUsers: number;
  activeUsersLast7Days: number;
  activeUsersLast30Days: number;
  totalBooks: number;
  completedBooks: number;
  avgPagesPerBook: number;
  totalRegenerations: number;
  regenerationRate: number;
}

interface DailyData {
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

interface UserData {
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

interface BookData {
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

export default function AnalyticsDashboard() {
  // Date range state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Data state
  const [summary, setSummary] = useState<Summary | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [userData, setUserData] = useState<UserData[]>([]);
  const [userPagination, setUserPagination] = useState<{
    page: number;
    pageSize: number;
    totalUsers: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null>(null);
  const [bookData, setBookData] = useState<BookData[]>([]);
  const [bookPagination, setBookPagination] = useState<{
    page: number;
    pageSize: number;
    totalBooks: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null>(null);
  const [bookTotals, setBookTotals] = useState<{
    totalCostUsd: number;
    totalPages: number;
    totalRegenerations: number;
  } | null>(null);

  // Loading state
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingBooks, setLoadingBooks] = useState(true);

  // Sort state
  const [userSortBy, setUserSortBy] = useState("totalCostUsd");
  const [userSortOrder, setUserSortOrder] = useState("desc");
  const [userPage, setUserPage] = useState(1);

  const [bookSortBy, setBookSortBy] = useState("generationStartedAt");
  const [bookSortOrder, setBookSortOrder] = useState("desc");
  const [bookPage, setBookPage] = useState(1);

  // Build query string
  const buildQueryString = useCallback(
    (extra: Record<string, string | number> = {}) => {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      Object.entries(extra).forEach(([key, value]) => {
        params.set(key, String(value));
      });
      return params.toString();
    },
    [startDate, endDate]
  );

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const qs = buildQueryString();
      const res = await fetch(`/api/admin/analytics/summary?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setLoadingSummary(false);
    }
  }, [buildQueryString]);

  // Fetch daily data
  const fetchDaily = useCallback(async () => {
    setLoadingDaily(true);
    try {
      const qs = buildQueryString({ limit: 30 });
      const res = await fetch(`/api/admin/analytics/daily?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setDailyData(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching daily data:", error);
    } finally {
      setLoadingDaily(false);
    }
  }, [buildQueryString]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const qs = buildQueryString({
        page: userPage,
        pageSize: 10,
        sortBy: userSortBy,
        sortOrder: userSortOrder,
      });
      const res = await fetch(`/api/admin/analytics/users?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setUserData(data.data || []);
        setUserPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  }, [buildQueryString, userPage, userSortBy, userSortOrder]);

  // Fetch books
  const fetchBooks = useCallback(async () => {
    setLoadingBooks(true);
    try {
      const qs = buildQueryString({
        page: bookPage,
        pageSize: 10,
        sortBy: bookSortBy,
        sortOrder: bookSortOrder,
      });
      const res = await fetch(`/api/admin/analytics/books?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setBookData(data.data || []);
        setBookPagination(data.pagination);
        setBookTotals(data.totals);
      }
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoadingBooks(false);
    }
  }, [buildQueryString, bookPage, bookSortBy, bookSortOrder]);

  // Initial load and date range changes
  useEffect(() => {
    fetchSummary();
    fetchDaily();
  }, [fetchSummary, fetchDaily]);

  // User table changes
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Book table changes
  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Handle date range change
  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    // Reset pagination
    setUserPage(1);
    setBookPage(1);
  };

  // Handle user sort
  const handleUserSort = (column: string) => {
    if (column === userSortBy) {
      setUserSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setUserSortBy(column);
      setUserSortOrder("desc");
    }
    setUserPage(1);
  };

  // Handle book sort
  const handleBookSort = (column: string) => {
    if (column === bookSortBy) {
      setBookSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setBookSortBy(column);
      setBookSortOrder("desc");
    }
    setBookPage(1);
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchSummary();
    fetchDaily();
    fetchUsers();
    fetchBooks();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-light">
            API Cost Analytics
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Monitor OpenAI API usage, costs, and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onRangeChange={handleDateRangeChange}
          />
          <button
            onClick={handleRefresh}
            className="p-2 rounded-lg bg-brand-purple border border-brand-purple-muted text-text-light hover:bg-brand-purple-light transition-colors"
            title="Refresh data"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards summary={summary} isLoading={loadingSummary} />

      {/* Cost Chart */}
      <CostChart data={dailyData} isLoading={loadingDaily} />

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <UserTable
          data={userData}
          pagination={userPagination}
          isLoading={loadingUsers}
          sortBy={userSortBy}
          sortOrder={userSortOrder}
          onSort={handleUserSort}
          onPageChange={setUserPage}
        />
        <BookCostTable
          data={bookData}
          pagination={bookPagination}
          totals={bookTotals}
          isLoading={loadingBooks}
          sortBy={bookSortBy}
          sortOrder={bookSortOrder}
          onSort={handleBookSort}
          onPageChange={setBookPage}
        />
      </div>

      {/* Footer note */}
      <div className="text-center py-6 border-t border-brand-purple-muted">
        <p className="text-xs text-text-muted">
          Cost estimates are based on OpenAI pricing as of November 2026.
          Actual billed amounts may vary slightly.
        </p>
      </div>
    </div>
  );
}
