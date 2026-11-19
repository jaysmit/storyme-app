"use client";

/**
 * useBookGeneration Hook
 *
 * Client-side hook for managing book generation.
 * Works with the server-side generation system:
 * - Polls for status updates
 * - Triggers generation via the trigger-generation endpoint
 * - Handles progress display and callbacks
 *
 * Key principles:
 * - Database is the source of truth
 * - Duplicate prevention happens server-side
 * - This hook focuses on UI state and coordination
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { type PageStatus, type Book, GENERATION_CONFIG } from "@/lib/types";

interface Progress {
  total: number;
  completed: number;
  failed: number;
  generating: number;
  pending: number;
  percentComplete: number;
}

interface UseBookGenerationOptions {
  bookId: string;
  onComplete?: (book: Book) => void;
  onError?: (error: string) => void;
  onPageComplete?: (pageId: string, url: string) => void;
  // Polling configuration
  pollInterval?: number;
  triggerInterval?: number;
}

interface UseBookGenerationReturn {
  pageStatuses: PageStatus[];
  progress: Progress;
  isGenerating: boolean;
  hasInteriorPages: boolean;
  startGeneration: () => Promise<void>;
  retryPage: (pageId: string) => Promise<void>;
  retryAllFailed: () => Promise<void>;
  triggerGeneration: () => Promise<void>;
  error: string | null;
  tokenBalance: number;
  isComplete: boolean;
  hasErrors: boolean;
}

export function useBookGeneration({
  bookId,
  onComplete,
  onError,
  onPageComplete,
  pollInterval = GENERATION_CONFIG.POLL_INTERVAL_MS,
  triggerInterval = GENERATION_CONFIG.TRIGGER_INTERVAL_MS,
}: UseBookGenerationOptions): UseBookGenerationReturn {
  const [pageStatuses, setPageStatuses] = useState<PageStatus[]>([]);
  const [progress, setProgress] = useState<Progress>({
    total: 0,
    completed: 0,
    failed: 0,
    generating: 0,
    pending: 0,
    percentComplete: 0,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasInteriorPages, setHasInteriorPages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);

  const isStartedRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const triggerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatusesRef = useRef<string>(""); // Track changes

  // Calculate progress from page statuses
  const updateProgress = useCallback((statuses: PageStatus[]) => {
    const total = statuses.length;
    const completed = statuses.filter((p) => p.status === "completed").length;
    const failed = statuses.filter((p) => p.status === "failed").length;
    const generating = statuses.filter((p) => p.status === "generating").length;
    const pending = statuses.filter((p) => p.status === "pending" || p.status === "retrying").length;
    const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

    setProgress({ total, completed, failed, generating, pending, percentComplete });

    // Check if all done (no more pending or generating)
    const complete = total > 0 && pending === 0 && generating === 0;
    setIsComplete(complete);
    setHasErrors(failed > 0);

    if (complete && failed === 0) {
      setIsGenerating(false);
      if (onComplete) {
        // Fetch final book state
        fetch(`/api/books/${bookId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.book) {
              onComplete(data.book);
            }
          })
          .catch(console.error);
      }
    }

    return { total, completed, failed, generating, pending, percentComplete };
  }, [bookId, onComplete]);

  // Poll for status updates
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/books/${bookId}/trigger-generation`);
      if (!res.ok) return;

      const data = await res.json();
      if (data.pageStatuses) {
        // Check for newly completed pages
        const newStatusJson = JSON.stringify(data.pageStatuses);
        if (newStatusJson !== previousStatusesRef.current) {
          previousStatusesRef.current = newStatusJson;

          // Find newly completed pages
          if (onPageComplete) {
            for (const page of data.pageStatuses) {
              const prev = pageStatuses.find((p) => p.pageId === page.pageId);
              if (page.status === "completed" && prev?.status !== "completed" && page.url) {
                onPageComplete(page.pageId, page.url);
              }
            }
          }

          setPageStatuses(data.pageStatuses);
          updateProgress(data.pageStatuses);
        }

        // Update other state from response
        if (data.isComplete !== undefined) {
          setIsComplete(data.isComplete);
        }
        if (data.hasErrors !== undefined) {
          setHasErrors(data.hasErrors);
        }
      }
    } catch (err) {
      console.error("Error polling status:", err);
    }
  }, [bookId, pageStatuses, updateProgress, onPageComplete]);

  // Trigger generation (idempotent - safe to call repeatedly)
  const triggerGeneration = useCallback(async () => {
    try {
      const res = await fetch(`/api/books/${bookId}/trigger-generation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concurrency: GENERATION_CONFIG.DEFAULT_CONCURRENCY,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("Trigger error:", data.error);
        return;
      }

      const data = await res.json();
      console.log(`[HOOK] Triggered ${data.triggered} pages`);

      if (data.pageStatuses) {
        setPageStatuses(data.pageStatuses);
        updateProgress(data.pageStatuses);
      }
    } catch (err) {
      console.error("Error triggering generation:", err);
    }
  }, [bookId, updateProgress]);

  // Start polling when generating
  useEffect(() => {
    if (isGenerating) {
      // Poll immediately
      pollStatus();
      // Then set up interval
      pollIntervalRef.current = setInterval(pollStatus, pollInterval);

      // Also trigger periodically to ensure generation continues
      triggerIntervalRef.current = setInterval(triggerGeneration, triggerInterval);
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      if (triggerIntervalRef.current) {
        clearInterval(triggerIntervalRef.current);
        triggerIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (triggerIntervalRef.current) {
        clearInterval(triggerIntervalRef.current);
      }
    };
  }, [isGenerating, pollStatus, pollInterval, triggerGeneration, triggerInterval]);

  // Start generation - calls start-full-generation endpoint
  const startGeneration = useCallback(async () => {
    if (isStartedRef.current) return;
    isStartedRef.current = true;
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch(`/api/books/${bookId}/start-full-generation`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to start generation");
      }

      if (!data.hasInteriorPages) {
        setHasInteriorPages(false);
        setIsGenerating(false);
        setPageStatuses(data.pageStatuses || []);
        updateProgress(data.pageStatuses || []);
        isStartedRef.current = false;
        return;
      }

      setHasInteriorPages(true);
      setPageStatuses(data.pageStatuses || []);
      updateProgress(data.pageStatuses || []);

      console.log(`[HOOK] Generation started - ${data.triggeredPages?.length || 0} pages triggered (concurrency: ${data.concurrency})`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      setIsGenerating(false);
      isStartedRef.current = false;
      if (onError) {
        onError(errorMsg);
      }
    }
  }, [bookId, onError, updateProgress]);

  // Retry a single failed page
  const retryPage = useCallback(async (pageId: string) => {
    try {
      // Update local state to show retrying
      setPageStatuses((prev) =>
        prev.map((p) =>
          p.pageId === pageId
            ? { ...p, status: "retrying", error: undefined }
            : p
        )
      );

      const res = await fetch(`/api/books/${bookId}/retry-page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to retry page");
      }

      // Trigger generation to process the retried page
      await triggerGeneration();

      // Resume polling if not already
      if (!isGenerating) {
        setIsGenerating(true);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error(`Error retrying ${pageId}:`, errorMsg);
      // Revert status
      setPageStatuses((prev) =>
        prev.map((p) =>
          p.pageId === pageId
            ? { ...p, status: "failed", error: errorMsg }
            : p
        )
      );
    }
  }, [bookId, isGenerating, triggerGeneration]);

  // Retry all failed pages
  const retryAllFailed = useCallback(async () => {
    const failedPages = pageStatuses.filter((p) => p.status === "failed");
    if (failedPages.length === 0) return;

    // Update all failed to retrying
    setPageStatuses((prev) =>
      prev.map((p) =>
        p.status === "failed"
          ? { ...p, status: "retrying", error: undefined }
          : p
      )
    );

    try {
      // Retry each failed page
      for (const page of failedPages) {
        await fetch(`/api/books/${bookId}/retry-page`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: page.pageId }),
        });
      }

      // Trigger generation to process retried pages
      await triggerGeneration();

      // Resume polling
      if (!isGenerating) {
        setIsGenerating(true);
      }
    } catch (err) {
      console.error("Error retrying all failed:", err);
    }
  }, [bookId, pageStatuses, isGenerating, triggerGeneration]);

  // Check for resume on mount
  useEffect(() => {
    const checkResume = async () => {
      try {
        const res = await fetch(`/api/books/${bookId}/trigger-generation`);
        if (!res.ok) return;

        const data = await res.json();

        // Check if book has incomplete generation
        if (data.pageStatuses && data.pageStatuses.length > 0) {
          setPageStatuses(data.pageStatuses);
          const { pending, generating } = updateProgress(data.pageStatuses);
          setHasInteriorPages(true);

          // Set state from response
          if (data.isComplete !== undefined) {
            setIsComplete(data.isComplete);
          }
          if (data.hasErrors !== undefined) {
            setHasErrors(data.hasErrors);
          }

          // If there's work to do, start polling
          if (pending > 0 || generating > 0) {
            console.log(`[HOOK] Resuming generation - ${pending} pending, ${generating} generating`);
            setIsGenerating(true);
            isStartedRef.current = true;

            // Trigger to ensure generation continues
            await fetch(`/api/books/${bookId}/trigger-generation`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                concurrency: GENERATION_CONFIG.DEFAULT_CONCURRENCY,
              }),
            });
          }
        }
      } catch (err) {
        console.error("Error checking resume:", err);
      }
    };

    checkResume();
  }, [bookId, updateProgress]);

  return {
    pageStatuses,
    progress,
    isGenerating,
    hasInteriorPages,
    startGeneration,
    retryPage,
    retryAllFailed,
    triggerGeneration,
    error,
    tokenBalance,
    isComplete,
    hasErrors,
  };
}
