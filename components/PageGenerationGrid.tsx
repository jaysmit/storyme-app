"use client";

import type { PageStatus } from "@/lib/types";

interface PageGenerationGridProps {
  pageStatuses: PageStatus[];
  onRetry?: (pageId: string) => void;
}

export default function PageGenerationGrid({
  pageStatuses,
  onRetry,
}: PageGenerationGridProps) {
  if (pageStatuses.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
      {pageStatuses.map((page) => (
        <div
          key={page.pageId}
          className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all ${
            page.status === "completed"
              ? "border-accent-teal bg-brand-purple-light"
              : page.status === "generating"
              ? "border-accent-gold bg-brand-purple animate-pulse"
              : page.status === "failed"
              ? "border-red-500 bg-red-500/10"
              : "border-brand-purple-muted bg-brand-purple-light"
          }`}
        >
          {/* Page image or placeholder */}
          {page.status === "completed" && page.url ? (
            <img
              src={page.url}
              alt={`Page ${page.pageNumber}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {page.status === "generating" ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-accent-gold font-bold">Creating...</span>
                </div>
              ) : page.status === "failed" ? (
                <div className="flex flex-col items-center gap-2 px-2 text-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-red-400"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M15 9l-6 6M9 9l6 6" />
                  </svg>
                  <span className="text-xs text-red-400 font-bold">Failed</span>
                  {onRetry && (
                    <button
                      onClick={() => onRetry(page.pageId)}
                      className="text-xs text-accent-gold hover:underline"
                    >
                      Retry
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-6 h-6 rounded-full border-2 border-brand-purple-muted flex items-center justify-center">
                    <span className="text-xs text-text-muted">{page.pageNumber}</span>
                  </div>
                  <span className="text-xs text-text-muted">Pending</span>
                </div>
              )}
            </div>
          )}

          {/* Status badge */}
          <div
            className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
              page.status === "completed"
                ? "bg-accent-teal text-white"
                : page.status === "generating"
                ? "bg-accent-gold text-brand-dark"
                : page.status === "failed"
                ? "bg-red-500 text-white"
                : "bg-brand-purple-muted text-text-muted"
            }`}
          >
            {page.status === "completed" ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : page.status === "generating" ? (
              <span className="animate-pulse">◐</span>
            ) : page.status === "failed" ? (
              "!"
            ) : (
              "○"
            )}
          </div>

          {/* Page label */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <span className="text-xs text-white font-bold">
              {page.pageId === "cover" ? "Cover" : `Page ${page.pageNumber}`}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
