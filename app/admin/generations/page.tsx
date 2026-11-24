"use client";

import { useState, useEffect, useCallback } from "react";

interface PageStatus {
  pageId: string;
  pageNumber: number;
  status: "pending" | "generating" | "completed" | "failed" | "retrying";
  url?: string;
  error?: string;
  claimedBy?: string;
  claimedAt?: string;
  generationId?: string;
}

interface Book {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  preview_pages: { page_number: number; url: string }[];
  page_statuses?: PageStatus[];
  generation_config?: {
    bookId?: string;
    expectedPageCount?: number;
  };
  characters_snapshot?: { id: string; name: string }[];
  metadata?: {
    storySlug?: string;
    bookId?: string;
  };
}

interface GenerationLog {
  id: string;
  user_id: string;
  book_id: string;
  event_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
  page_number?: number;
  character_count?: number;
  blueprint_id?: string;
  is_regenerate?: boolean;
  output_url?: string;
  estimated_cost_usd?: string;
  model_used?: string;
  metadata?: Record<string, unknown>;
}

interface Stats {
  activeGenerations: number;
  pendingPages: number;
  failedPages: number;
  completedLast24h: number;
  failedLast24h: number;
  averageDurationMs: number;
  totalCostLast24h: number;
}

const storyTitles: Record<string, string> = {
  "dragon-castle-valley": "Dragon of Castle Valley",
  "essendon-five": "Grand Final Day",
  "fairy-glade": "Fairy Glade",
  "grand-final-day": "Grand Final Day",
};

function getBookTitle(book: Book): string {
  const slug = book.metadata?.bookId || book.metadata?.storySlug || "";
  return storyTitles[slug] || slug || "Unknown Book";
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTimeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    generating: "bg-blue-500/20 text-blue-400",
    completed: "bg-green-500/20 text-green-400",
    failed: "bg-red-500/20 text-red-400",
    retrying: "bg-orange-500/20 text-orange-400",
    started: "bg-blue-500/20 text-blue-400",
    draft: "bg-gray-500/20 text-gray-400",
    preview_ready: "bg-teal-500/20 text-teal-400",
    cover_approved: "bg-teal-500/20 text-teal-400",
    generating_full: "bg-blue-500/20 text-blue-400",
    incomplete: "bg-red-500/20 text-red-400",
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors[status] || "bg-gray-500/20 text-gray-400"}`}>
      {status === "generating" && (
        <span className="inline-block w-2 h-2 border border-current border-t-transparent rounded-full animate-spin mr-1" />
      )}
      {status}
    </span>
  );
}

export default function GenerationsPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [view, setView] = useState<"books" | "logs">("books");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/generations");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch data");
      }
      const data = await res.json();
      setBooks(data.books);
      setLogs(data.logs);
      setStats(data.stats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const filteredLogs = selectedBook
    ? logs.filter((log) => log.book_id === selectedBook)
    : logs;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light">Generation Monitor</h1>
          <p className="text-text-muted text-sm mt-1">
            Real-time view of book generations and API calls
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded border-brand-purple-muted bg-brand-dark text-accent-gold focus:ring-accent-gold"
            />
            Auto-refresh (5s)
          </label>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-brand-purple text-white rounded-lg hover:bg-brand-purple-light transition-colors text-sm font-medium"
          >
            Refresh Now
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-brand-dark rounded-xl p-4 border border-brand-purple-muted">
            <p className="text-text-muted text-xs uppercase tracking-wider">Active</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{stats.activeGenerations}</p>
          </div>
          <div className="bg-brand-dark rounded-xl p-4 border border-brand-purple-muted">
            <p className="text-text-muted text-xs uppercase tracking-wider">Pending Pages</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.pendingPages}</p>
          </div>
          <div className="bg-brand-dark rounded-xl p-4 border border-brand-purple-muted">
            <p className="text-text-muted text-xs uppercase tracking-wider">Failed Pages</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{stats.failedPages}</p>
          </div>
          <div className="bg-brand-dark rounded-xl p-4 border border-brand-purple-muted">
            <p className="text-text-muted text-xs uppercase tracking-wider">Completed (24h)</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{stats.completedLast24h}</p>
          </div>
          <div className="bg-brand-dark rounded-xl p-4 border border-brand-purple-muted">
            <p className="text-text-muted text-xs uppercase tracking-wider">Failed (24h)</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{stats.failedLast24h}</p>
          </div>
          <div className="bg-brand-dark rounded-xl p-4 border border-brand-purple-muted">
            <p className="text-text-muted text-xs uppercase tracking-wider">Avg Duration</p>
            <p className="text-2xl font-bold text-text-light mt-1">{formatDuration(stats.averageDurationMs)}</p>
          </div>
          <div className="bg-brand-dark rounded-xl p-4 border border-brand-purple-muted">
            <p className="text-text-muted text-xs uppercase tracking-wider">Cost (24h)</p>
            <p className="text-2xl font-bold text-accent-gold mt-1">${stats.totalCostLast24h.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex gap-2 border-b border-brand-purple-muted">
        <button
          onClick={() => setView("books")}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 -mb-px ${
            view === "books"
              ? "text-accent-gold border-accent-gold"
              : "text-text-muted border-transparent hover:text-text-light"
          }`}
        >
          Active Books ({books.length})
        </button>
        <button
          onClick={() => setView("logs")}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 -mb-px ${
            view === "logs"
              ? "text-accent-gold border-accent-gold"
              : "text-text-muted border-transparent hover:text-text-light"
          }`}
        >
          API Logs ({filteredLogs.length})
        </button>
      </div>

      {/* Books View */}
      {view === "books" && (
        <div className="space-y-4">
          {books.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              No active generations
            </div>
          ) : (
            books.map((book) => (
              <div
                key={book.id}
                className={`bg-brand-dark rounded-xl border transition-colors ${
                  selectedBook === book.id
                    ? "border-accent-gold"
                    : "border-brand-purple-muted hover:border-brand-purple-light"
                }`}
              >
                {/* Book Header */}
                <button
                  onClick={() => setSelectedBook(selectedBook === book.id ? null : book.id)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    {/* Cover thumbnail */}
                    <div className="w-16 h-12 rounded-lg overflow-hidden bg-brand-purple flex-shrink-0">
                      {book.preview_pages?.find((p) => p.page_number === 0)?.url ? (
                        <img
                          src={book.preview_pages.find((p) => p.page_number === 0)?.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-text-light">{getBookTitle(book)}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={book.status} />
                        <span className="text-text-muted text-xs">
                          {book.characters_snapshot?.length || 0} characters
                        </span>
                        <span className="text-text-muted text-xs">•</span>
                        <span className="text-text-muted text-xs">
                          Updated {formatTimeAgo(book.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Page progress */}
                    {book.page_statuses && book.page_statuses.length > 0 && (
                      <div className="text-right">
                        <div className="text-sm text-text-light">
                          {book.page_statuses.filter((p) => p.status === "completed").length}/{book.generation_config?.expectedPageCount || book.page_statuses.length} pages
                        </div>
                        <div className="w-32 h-2 bg-brand-purple-muted rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-accent-gold transition-all"
                            style={{
                              width: `${
                                (book.page_statuses.filter((p) => p.status === "completed").length /
                                  (book.generation_config?.expectedPageCount || book.page_statuses.length)) *
                                100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`text-text-muted transition-transform ${
                        selectedBook === book.id ? "rotate-180" : ""
                      }`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Details */}
                {selectedBook === book.id && (
                  <div className="border-t border-brand-purple-muted p-4 space-y-4">
                    {/* Page Status Grid */}
                    {book.page_statuses && book.page_statuses.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-text-muted mb-2">Page Status</h4>
                        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-12 gap-2">
                          {book.page_statuses.map((page) => (
                            <div
                              key={page.pageId}
                              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs ${
                                page.status === "completed"
                                  ? "bg-green-500/20 text-green-400"
                                  : page.status === "generating"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : page.status === "failed"
                                  ? "bg-red-500/20 text-red-400"
                                  : page.status === "retrying"
                                  ? "bg-orange-500/20 text-orange-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                              }`}
                              title={`Page ${page.pageNumber}: ${page.status}${page.error ? ` - ${page.error}` : ""}`}
                            >
                              <span className="font-bold">{page.pageNumber}</span>
                              {page.status === "generating" && (
                                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mt-0.5" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Failed Pages Details */}
                    {book.page_statuses?.some((p) => p.status === "failed") && (
                      <div>
                        <h4 className="text-sm font-medium text-red-400 mb-2">Failed Pages</h4>
                        <div className="space-y-2">
                          {book.page_statuses
                            .filter((p) => p.status === "failed")
                            .map((page) => (
                              <div
                                key={page.pageId}
                                className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm"
                              >
                                <span className="text-red-400 font-medium">Page {page.pageNumber}:</span>
                                <span className="text-text-muted ml-2">{page.error || "Unknown error"}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Book ID for debugging */}
                    <div className="text-xs text-text-muted font-mono">
                      ID: {book.id}
                    </div>

                    {/* View logs for this book */}
                    <button
                      onClick={() => {
                        setView("logs");
                      }}
                      className="text-sm text-accent-gold hover:underline"
                    >
                      View API logs for this book →
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Logs View */}
      {view === "logs" && (
        <div className="space-y-2">
          {selectedBook && (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-text-muted text-sm">Filtered by book:</span>
              <span className="px-2 py-1 bg-brand-purple rounded text-xs text-text-light">
                {selectedBook.slice(0, 8)}...
              </span>
              <button
                onClick={() => setSelectedBook(null)}
                className="text-xs text-accent-gold hover:underline"
              >
                Clear filter
              </button>
            </div>
          )}

          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              No logs in the last 24 hours
            </div>
          ) : (
            <div className="bg-brand-dark rounded-xl border border-brand-purple-muted overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-brand-purple-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-text-muted font-medium">Time</th>
                    <th className="px-4 py-3 text-left text-text-muted font-medium">Event</th>
                    <th className="px-4 py-3 text-left text-text-muted font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-text-muted font-medium">Page</th>
                    <th className="px-4 py-3 text-left text-text-muted font-medium">Duration</th>
                    <th className="px-4 py-3 text-left text-text-muted font-medium">Cost</th>
                    <th className="px-4 py-3 text-left text-text-muted font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-purple-muted">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-brand-purple-muted/20">
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                        {formatTimeAgo(log.started_at)}
                      </td>
                      <td className="px-4 py-3 text-text-light">
                        {log.event_type}
                        {log.is_regenerate && (
                          <span className="ml-1 text-xs text-orange-400">(regen)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {log.page_number !== undefined && log.page_number !== null
                          ? log.page_number === 0
                            ? "Cover"
                            : `Page ${log.page_number}`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {log.duration_ms ? formatDuration(log.duration_ms) : "-"}
                      </td>
                      <td className="px-4 py-3 text-accent-gold">
                        {log.estimated_cost_usd ? `$${parseFloat(log.estimated_cost_usd).toFixed(3)}` : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {log.error_message ? (
                          <span className="text-red-400 text-xs" title={log.error_message}>
                            {log.error_message.slice(0, 50)}
                            {log.error_message.length > 50 ? "..." : ""}
                          </span>
                        ) : log.output_url ? (
                          <a
                            href={log.output_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-gold text-xs hover:underline"
                          >
                            View image
                          </a>
                        ) : (
                          <span className="text-text-muted text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
