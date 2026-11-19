"use client";

/**
 * GenerationOrchestrator
 *
 * App-wide component that automatically manages book generation.
 * Place this in the main layout to enable automatic recovery.
 *
 * Features:
 * - Checks for incomplete books on mount
 * - Automatically triggers generation for stalled pages
 * - Provides unobtrusive progress indicator
 * - Works across all pages (not just the generation page)
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { GENERATION_CONFIG } from "@/lib/types";
import Link from "next/link";

interface GenerationSummary {
  total: number;
  completed: number;
  failed: number;
  generating: number;
  pending: number;
  percentComplete: number;
}

interface BookGenerationStatus {
  bookId: string;
  status: string;
  summary: GenerationSummary;
  isComplete: boolean;
  hasErrors: boolean;
  title?: string;
}

interface GenerationOrchestratorProps {
  // Show progress indicator even when minimized
  showProgressIndicator?: boolean;
  // Callback when a book completes
  onBookComplete?: (bookId: string) => void;
}

export function GenerationOrchestrator({
  showProgressIndicator = true,
  onBookComplete,
}: GenerationOrchestratorProps) {
  const [activeBooks, setActiveBooks] = useState<BookGenerationStatus[]>([]);
  const [isMinimized, setIsMinimized] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const pathname = usePathname();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const triggerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check for incomplete books
  const checkForIncompleteBooks = useCallback(async () => {
    try {
      const res = await fetch("/api/books?status=incomplete,generating_full");
      if (!res.ok) return;

      const data = await res.json();
      const books = data.books || [];

      // Map to status format
      const statuses: BookGenerationStatus[] = await Promise.all(
        books.map(async (book: { id: string; status: string; title?: string; metadata?: { bookId?: string } }) => {
          // Get detailed generation status
          const statusRes = await fetch(`/api/books/${book.id}/trigger-generation`);
          if (!statusRes.ok) {
            return {
              bookId: book.id,
              status: book.status,
              summary: { total: 0, completed: 0, failed: 0, generating: 0, pending: 0, percentComplete: 0 },
              isComplete: false,
              hasErrors: false,
              title: book.title || book.metadata?.bookId,
            };
          }
          const statusData = await statusRes.json();
          return {
            bookId: book.id,
            status: book.status,
            summary: statusData.summary || { total: 0, completed: 0, failed: 0, generating: 0, pending: 0, percentComplete: 0 },
            isComplete: statusData.isComplete || false,
            hasErrors: statusData.hasErrors || false,
            title: book.title || book.metadata?.bookId,
          };
        })
      );

      // Filter to only books that need work
      const incompleteBooks = statuses.filter(
        (s) => !s.isComplete && (s.summary.pending > 0 || s.summary.generating > 0)
      );

      // Check for newly completed books
      for (const prev of activeBooks) {
        const current = statuses.find((s) => s.bookId === prev.bookId);
        if (current?.isComplete && !prev.isComplete) {
          console.log(`[ORCHESTRATOR] Book ${prev.bookId} completed!`);
          onBookComplete?.(prev.bookId);
        }
      }

      setActiveBooks(incompleteBooks);
      setLastCheck(new Date());
    } catch (error) {
      console.error("[ORCHESTRATOR] Error checking books:", error);
    }
  }, [activeBooks, onBookComplete]);

  // Trigger generation for active books
  const triggerGeneration = useCallback(async () => {
    if (activeBooks.length === 0) return;

    for (const book of activeBooks) {
      if (book.isComplete || book.summary.pending === 0) continue;

      try {
        await fetch(`/api/books/${book.bookId}/trigger-generation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            concurrency: GENERATION_CONFIG.DEFAULT_CONCURRENCY,
          }),
        });
      } catch (error) {
        console.error(`[ORCHESTRATOR] Error triggering ${book.bookId}:`, error);
      }
    }
  }, [activeBooks]);

  // Initial check and setup intervals
  useEffect(() => {
    // Check immediately
    checkForIncompleteBooks();

    // Set up polling interval
    checkIntervalRef.current = setInterval(
      checkForIncompleteBooks,
      GENERATION_CONFIG.POLL_INTERVAL_MS
    );

    // Set up trigger interval (less frequent than polling)
    triggerIntervalRef.current = setInterval(
      triggerGeneration,
      GENERATION_CONFIG.TRIGGER_INTERVAL_MS
    );

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (triggerIntervalRef.current) clearInterval(triggerIntervalRef.current);
    };
  }, [checkForIncompleteBooks, triggerGeneration]);

  // Don't show on certain pages (like the generation page itself which has its own UI)
  const hideOnPaths = ["/create", "/book/"];
  const shouldHide = hideOnPaths.some((path) => pathname.startsWith(path));

  if (!showProgressIndicator || shouldHide || activeBooks.length === 0) {
    return null;
  }

  // Calculate overall progress across all books
  const totalPages = activeBooks.reduce((sum, b) => sum + b.summary.total, 0);
  const completedPages = activeBooks.reduce((sum, b) => sum + b.summary.completed, 0);
  const generatingPages = activeBooks.reduce((sum, b) => sum + b.summary.generating, 0);
  const overallPercent = totalPages > 0 ? Math.round((completedPages / totalPages) * 100) : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isMinimized ? (
        // Minimized pill view
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3 py-2 bg-brand-purple border border-brand-purple-muted rounded-full shadow-lg hover:border-accent-gold transition-colors"
        >
          {/* Animated generating indicator */}
          <div className="relative">
            <div className="w-3 h-3 bg-accent-gold rounded-full animate-pulse" />
            <div className="absolute inset-0 w-3 h-3 bg-accent-gold/50 rounded-full animate-ping" />
          </div>
          <span className="text-sm text-white">
            {generatingPages > 0 ? `Generating... ${overallPercent}%` : `${activeBooks.length} book${activeBooks.length > 1 ? "s" : ""} pending`}
          </span>
        </button>
      ) : (
        // Expanded view
        <div className="bg-brand-purple border border-brand-purple-muted rounded-xl shadow-lg overflow-hidden w-72">
          <div className="flex items-center justify-between p-3 border-b border-brand-purple-muted">
            <span className="text-sm font-medium text-white">Book Generation</span>
            <button
              onClick={() => setIsMinimized(true)}
              className="text-brand-purple-muted hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-3 space-y-3 max-h-64 overflow-y-auto">
            {activeBooks.map((book) => (
              <div key={book.bookId} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/book/${book.bookId}`}
                    className="text-sm text-white hover:text-accent-gold truncate max-w-[180px]"
                  >
                    {book.title || "Untitled Book"}
                  </Link>
                  <span className="text-xs text-brand-purple-muted">
                    {book.summary.percentComplete}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-brand-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-gold transition-all duration-300"
                    style={{ width: `${book.summary.percentComplete}%` }}
                  />
                </div>

                {/* Status text */}
                <div className="text-xs text-brand-purple-muted">
                  {book.summary.generating > 0 && (
                    <span className="text-accent-gold">
                      {book.summary.generating} generating
                    </span>
                  )}
                  {book.summary.pending > 0 && (
                    <span>
                      {book.summary.generating > 0 ? " · " : ""}
                      {book.summary.pending} pending
                    </span>
                  )}
                  {book.summary.failed > 0 && (
                    <span className="text-red-400">
                      {" · "}
                      {book.summary.failed} failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {lastCheck && (
            <div className="px-3 py-2 border-t border-brand-purple-muted">
              <span className="text-xs text-brand-purple-muted">
                Last check: {lastCheck.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
