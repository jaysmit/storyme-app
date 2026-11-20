"use client";

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

interface Pagination {
  page: number;
  pageSize: number;
  totalUsers: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface UserTableProps {
  data: UserData[];
  pagination: Pagination | null;
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
    year: "numeric",
  });
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

export default function UserTable({
  data,
  pagination,
  isLoading,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
}: UserTableProps) {
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
    { key: "email", label: "User" },
    { key: "totalCostUsd", label: "Total Cost" },
    { key: "totalRequests", label: "Requests" },
    { key: "successRate", label: "Success" },
    { key: "totalBooks", label: "Books" },
    { key: "tokensRemaining", label: "Tokens" },
    { key: "lastRequestAt", label: "Last Active" },
  ];

  return (
    <div className="rounded-xl border border-brand-purple-muted bg-brand-purple/20 overflow-hidden">
      <div className="p-4 border-b border-brand-purple-muted">
        <h3 className="text-lg font-bold text-text-light">Users by Cost</h3>
        {pagination && (
          <p className="text-sm text-text-muted mt-1">
            Showing {(pagination.page - 1) * pagination.pageSize + 1}-
            {Math.min(pagination.page * pagination.pageSize, pagination.totalUsers)} of{" "}
            {pagination.totalUsers} users
          </p>
        )}
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
                  No users found for the selected period
                </td>
              </tr>
            ) : (
              data.map((user) => (
                <tr key={user.userId} className="hover:bg-brand-purple-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-text-light truncate max-w-[200px]">
                        {user.email || "Unknown"}
                      </p>
                      {user.name && (
                        <p className="text-xs text-text-muted truncate max-w-[200px]">
                          {user.name}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-accent-gold">
                      {formatCurrency(user.totalCostUsd)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-text-light">{user.totalRequests}</span>
                    {user.failedRequests > 0 && (
                      <span className="text-xs text-red-400 ml-1">
                        ({user.failedRequests} failed)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm ${
                        user.successRate >= 90
                          ? "text-green-400"
                          : user.successRate >= 70
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {user.successRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-text-light">{user.totalBooks}</span>
                    {user.completedBooks > 0 && (
                      <span className="text-xs text-text-muted ml-1">
                        ({user.completedBooks} done)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm ${
                        user.tokensRemaining > 5
                          ? "text-accent-gold"
                          : user.tokensRemaining > 0
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {user.tokensRemaining}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-text-muted">
                      {formatDate(user.lastRequestAt)}
                    </span>
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
