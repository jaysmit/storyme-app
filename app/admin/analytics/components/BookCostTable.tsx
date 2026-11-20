"use client";

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

interface Pagination {
  page: number;
  pageSize: number;
  totalBooks: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface Totals {
  totalCostUsd: number;
  totalPages: number;
  totalRegenerations: number;
}

interface BookCostTableProps {
  data: BookData[];
  pagination: Pagination | null;
  totals: Totals | null;
  isLoading: boolean;
  sortBy: string;
  sortOrder: string;
  onSort: (column: string) => void;
  onPageChange: (page: number) => void;
}

function formatCurrency(value: number): string {
  if (value >= 1) {
    return `$${value.toFixed(2)}`;
  }
  return `$${value.toFixed(4)}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    generating_full: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    incomplete: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    preview_ready: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    draft: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };

  const style = styles[status] || styles.draft;

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function SortIcon({ column, currentSort, sortOrder }: { column: string; currentSort: string; sortOrder: string }) {
  const isActive = column === currentSort;
  return (
    <svg
      className={`w-4 h-4 ml-1 inline transition-transform ${isActive ? "text-accent-gold" : "text-text-muted"} ${
        isActive && sortOrder === "asc" ? "rotate-180" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default function BookCostTable({
  data,
  pagination,
  totals,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
}: BookCostTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-brand-purple-muted bg-brand-purple/20 overflow-hidden">
        <div className="p-6 animate-pulse">
          <div className="h-6 w-32 bg-brand-purple-muted rounded mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-brand-purple-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const columns = [
    { key: "blueprintId", label: "Book" },
    { key: "userEmail", label: "User" },
    { key: "status", label: "Status" },
    { key: "totalCostUsd", label: "Cost" },
    { key: "totalPages", label: "Pages" },
    { key: "regenerations", label: "Regens" },
    { key: "generationStartedAt", label: "Started" },
  ];

  return (
    <div className="rounded-xl border border-brand-purple-muted bg-brand-purple/20 overflow-hidden">
      <div className="p-4 border-b border-brand-purple-muted">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-text-light">Books by Cost</h3>
            {pagination && (
              <p className="text-sm text-text-muted mt-1">
                Showing {(pagination.page - 1) * pagination.pageSize + 1}-
                {Math.min(pagination.page * pagination.pageSize, pagination.totalBooks)} of{" "}
                {pagination.totalBooks} books
              </p>
            )}
          </div>
          {totals && (
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-text-muted">Total: </span>
                <span className="font-bold text-accent-gold">{formatCurrency(totals.totalCostUsd)}</span>
              </div>
              <div>
                <span className="text-text-muted">Pages: </span>
                <span className="font-bold text-text-light">{totals.totalPages}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-brand-purple-muted">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider cursor-pointer hover:text-text-light transition-colors"
                  onClick={() => onSort(col.key)}
                >
                  {col.label}
                  <SortIcon column={col.key} currentSort={sortBy} sortOrder={sortOrder} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-purple-muted">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-text-muted">
                  No books found for the selected period
                </td>
              </tr>
            ) : (
              data.map((book) => (
                <tr key={book.bookId} className="hover:bg-brand-purple-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-text-light truncate max-w-[180px]">
                        {book.blueprintId || "Unknown"}
                      </p>
                      <p className="text-xs text-text-muted">
                        {book.blueprintFormat || "v1"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-text-muted truncate max-w-[150px] block">
                      {book.userEmail || "Unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(book.status)}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-accent-gold">
                      {formatCurrency(book.totalCostUsd)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-text-light">{book.successfulPages}</span>
                    {book.failedPages > 0 && (
                      <span className="text-xs text-red-400 ml-1">({book.failedPages} failed)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-text-muted">{book.regenerations}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-text-muted">{formatDate(book.generationStartedAt)}</p>
                      {book.totalDurationMs > 0 && (
                        <p className="text-xs text-text-muted">
                          {formatDuration(book.totalDurationMs)} total
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="p-4 border-t border-brand-purple-muted flex items-center justify-between">
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={!pagination.hasPrev}
            className="px-4 py-2 rounded-lg bg-brand-purple-muted text-text-light text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-purple-light transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-text-muted">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasNext}
            className="px-4 py-2 rounded-lg bg-brand-purple-muted text-text-light text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-purple-light transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
