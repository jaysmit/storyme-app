"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { PageStatus, Book } from "@/lib/types";

const POLL_INTERVAL = 3000; // 3 seconds - server handles generation, we just poll

interface Progress {
  total: number;
  completed: number;
  failed: number;
  generating: number;
  pending: number;
}

interface UseBookGenerationOptions {
  bookId: string;
  onComplete?: (book: Book) => void;
  onError?: (error: string) => void;
  onPageComplete?: (pageId: string, url: string) => void;
}

interface UseBookGenerationReturn {
  pageStatuses: PageStatus[];
  progress: Progress;
  isGenerating: boolean;
  hasInteriorPages: boolean;
  startGeneration: () => Promise<void>;
  retryPage: (pageId: string) => Promise<void>;
  retryAllFailed: () => Promise<void>;
  error: string | null;
  tokenBalance: number;
}

export function useBookGeneration({
  bookId,
  onComplete,
  onError,
  onPageComplete,
}: UseBookGenerationOptions): UseBookGenerationReturn {
  const [pageStatuses, setPageStatuses] = useState<PageStatus[]>([]);
  const [progress, setProgress] = useState<Progress>({
    total: 0,
    completed: 0,
    failed: 0,
    generating: 0,
    pending: 0,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasInteriorPages, setHasInteriorPages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState(0);

  const isStartedRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatusesRef = useRef<string>(""); // Track changes

  // Calculate progress from page statuses
  const updateProgress = useCallback((statuses: PageStatus[]) => {
    const total = statuses.length;
    const completed = statuses.filter((p) => p.status === "completed").length;
    const failed = statuses.filter((p) => p.status === "failed").length;
    const generating = statuses.filter((p) => p.status === "generating").length;
    const pending = statuses.filter((p) => p.status === "pending").length;

    setProgress({ total, completed, failed, generating, pending });

    // Check if all done (no more pending or generating)
    if (total > 0 && pending === 0 && generating === 0) {
      setIsGenerating(false);
      if (failed === 0 && onComplete) {
        // All pages completed successfully - fetch final book state
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

    return { total, completed, failed, generating, pending };
  }, [bookId, onComplete]);

  // Poll for status updates - server handles generation
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/books/${bookId}/status`);
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
      }
    } catch (err) {
      console.error("Error polling status:", err);
    }
  }, [bookId, pageStatuses, updateProgress, onPageComplete]);

  // Start polling when generating
  useEffect(() => {
    if (isGenerating) {
      // Poll immediately
      pollStatus();
      // Then set up interval
      pollIntervalRef.current = setInterval(pollStatus, POLL_INTERVAL);
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isGenerating, pollStatus]);

  // Start generation - server handles everything
  const startGeneration = useCallback(async () => {
    if (isStartedRef.current) return;
    isStartedRef.current = true;
    setIsGenerating(true);
    setError(null);

    try {
      // This now triggers the server to start generation AND kick off initial pages
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

      console.log(`Generation started - server triggered ${data.triggeredPages?.length || 0} initial pages`);
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
            ? { ...p, status: "pending", error: undefined }
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
  }, [bookId, isGenerating]);

  // Retry all failed pages
  const retryAllFailed = useCallback(async () => {
    const failedPages = pageStatuses.filter((p) => p.status === "failed");
    if (failedPages.length === 0) return;

    // Update all failed to pending
    setPageStatuses((prev) =>
      prev.map((p) =>
        p.status === "failed"
          ? { ...p, status: "pending", error: undefined }
          : p
      )
    );

    // Trigger the cron endpoint to process them, or just trigger each
    try {
      // Trigger generation for first few failed pages to kick off chain
      const toTrigger = failedPages.slice(0, 3);
      for (const page of toTrigger) {
        fetch(`/api/books/${bookId}/generate-page`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: page.pageId, fromCron: true }),
        }).catch(console.error);
      }

      // Resume polling
      if (!isGenerating) {
        setIsGenerating(true);
      }
    } catch (err) {
      console.error("Error retrying all failed:", err);
    }
  }, [bookId, pageStatuses, isGenerating]);

  // Check for resume on mount - if book is mid-generation, start polling
  useEffect(() => {
    const checkResume = async () => {
      try {
        const res = await fetch(`/api/books/${bookId}/status`);
        if (!res.ok) return;

        const data = await res.json();

        // If book is in generating_full status with pending/generating pages, resume polling
        if (
          (data.status === "generating_full" || data.status === "incomplete") &&
          data.pageStatuses
        ) {
          setPageStatuses(data.pageStatuses);
          const { pending, generating } = updateProgress(data.pageStatuses);
          setHasInteriorPages(true);

          // If there's work in progress, start polling
          if (pending > 0 || generating > 0) {
            setIsGenerating(true);
            isStartedRef.current = true;
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
    error,
    tokenBalance,
  };
}
