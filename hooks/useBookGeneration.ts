"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { PageStatus, Book } from "@/lib/types";

const MAX_CONCURRENT = 5;
const POLL_INTERVAL = 2000; // 2 seconds
const PAGE_TIMEOUT_MS = 180000; // 3 minutes - if a page takes longer, consider it stuck
const MAX_AUTO_RETRIES = 3; // Maximum automatic retry attempts per page

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

  // Track active generation requests
  const activeRequestsRef = useRef(new Set<string>());
  const isStartedRef = useRef(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track page start times for timeout detection
  const pageStartTimesRef = useRef<Map<string, number>>(new Map());
  // Track auto-retry counts per page
  const autoRetryCountsRef = useRef<Map<string, number>>(new Map());

  // Calculate progress from page statuses
  const updateProgress = useCallback((statuses: PageStatus[]) => {
    const total = statuses.length;
    const completed = statuses.filter((p) => p.status === "completed").length;
    const failed = statuses.filter((p) => p.status === "failed").length;
    const generating = statuses.filter((p) => p.status === "generating").length;
    const pending = statuses.filter((p) => p.status === "pending").length;

    setProgress({ total, completed, failed, generating, pending });

    // Check if all done
    if (total > 0 && completed + failed === total) {
      setIsGenerating(false);
      if (failed === 0 && onComplete) {
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
  }, [bookId, onComplete]);

  // Generate a single page
  const generatePage = useCallback(async (pageId: string, isAutoRetry = false) => {
    if (activeRequestsRef.current.has(pageId)) {
      return; // Already generating
    }

    activeRequestsRef.current.add(pageId);
    // Track when this page started generating
    pageStartTimesRef.current.set(pageId, Date.now());

    if (isAutoRetry) {
      const currentCount = autoRetryCountsRef.current.get(pageId) || 0;
      autoRetryCountsRef.current.set(pageId, currentCount + 1);
      console.log(`Auto-retrying page ${pageId} (attempt ${currentCount + 1}/${MAX_AUTO_RETRIES})`);
    }

    try {
      const res = await fetch(`/api/books/${bookId}/generate-page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate page");
      }

      if (data.tokensRemaining !== undefined) {
        setTokenBalance(data.tokensRemaining);
      }

      if (data.status === "completed" && data.url) {
        // Clear tracking for this page
        pageStartTimesRef.current.delete(pageId);
        autoRetryCountsRef.current.delete(pageId);

        // Update local state
        setPageStatuses((prev) =>
          prev.map((p) =>
            p.pageId === pageId
              ? { ...p, status: "completed", url: data.url }
              : p
          )
        );
        if (onPageComplete) {
          onPageComplete(pageId, data.url);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error(`Error generating ${pageId}:`, errorMsg);

      // Clear start time tracking
      pageStartTimesRef.current.delete(pageId);

      // Update local state to failed
      setPageStatuses((prev) =>
        prev.map((p) =>
          p.pageId === pageId
            ? { ...p, status: "failed", error: errorMsg }
            : p
        )
      );
    } finally {
      activeRequestsRef.current.delete(pageId);
    }
  }, [bookId, onPageComplete]);

  // Check for stuck or failed pages and auto-retry
  const checkAndAutoRetry = useCallback(() => {
    const now = Date.now();

    // Check for stuck pages (generating too long)
    for (const [pageId, startTime] of pageStartTimesRef.current.entries()) {
      const elapsed = now - startTime;
      if (elapsed > PAGE_TIMEOUT_MS) {
        const retryCount = autoRetryCountsRef.current.get(pageId) || 0;
        if (retryCount < MAX_AUTO_RETRIES) {
          console.log(`Page ${pageId} appears stuck (${Math.round(elapsed / 1000)}s), attempting auto-retry...`);
          // Clear the tracking so we can retry
          pageStartTimesRef.current.delete(pageId);
          activeRequestsRef.current.delete(pageId);
          // Trigger retry
          generatePage(pageId, true);
        } else {
          console.log(`Page ${pageId} stuck and max retries (${MAX_AUTO_RETRIES}) reached`);
          pageStartTimesRef.current.delete(pageId);
        }
      }
    }

    // Check for failed pages that can be auto-retried
    const failedPages = pageStatuses.filter(
      (p) => p.status === "failed" && !activeRequestsRef.current.has(p.pageId)
    );

    for (const page of failedPages) {
      const retryCount = autoRetryCountsRef.current.get(page.pageId) || 0;
      if (retryCount < MAX_AUTO_RETRIES) {
        console.log(`Auto-retrying failed page ${page.pageId}...`);
        // Reset status to pending locally for retry
        setPageStatuses((prev) =>
          prev.map((p) =>
            p.pageId === page.pageId
              ? { ...p, status: "pending", error: undefined }
              : p
          )
        );
        // Trigger generation with retry flag
        generatePage(page.pageId, true);
      }
    }
  }, [pageStatuses, generatePage]);

  // Process pending pages with concurrency limit
  const processPendingPages = useCallback(async () => {
    // First, check for any stuck/failed pages to auto-retry
    checkAndAutoRetry();

    const pending = pageStatuses.filter(
      (p) => p.status === "pending" && !activeRequestsRef.current.has(p.pageId)
    );

    const available = MAX_CONCURRENT - activeRequestsRef.current.size;
    const toProcess = pending.slice(0, available);

    // Start generating pages in parallel
    await Promise.all(toProcess.map((p) => generatePage(p.pageId)));
  }, [pageStatuses, generatePage, checkAndAutoRetry]);

  // Poll for status updates
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/books/${bookId}/status`);
      if (!res.ok) return;

      const data = await res.json();
      if (data.pageStatuses) {
        setPageStatuses(data.pageStatuses);
        updateProgress(data.pageStatuses);
      }

      // Check for stuck/failed pages and auto-retry
      checkAndAutoRetry();
    } catch (err) {
      console.error("Error polling status:", err);
    }
  }, [bookId, updateProgress, checkAndAutoRetry]);

  // Start polling when generating
  useEffect(() => {
    if (isGenerating) {
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

  // Process pending pages when statuses change
  useEffect(() => {
    if (isGenerating && pageStatuses.length > 0) {
      processPendingPages();
    }
  }, [isGenerating, pageStatuses, processPendingPages]);

  // Start generation
  const startGeneration = useCallback(async () => {
    if (isStartedRef.current) return;
    isStartedRef.current = true;
    setIsGenerating(true);
    setError(null);

    try {
      // Initialize generation
      const res = await fetch(`/api/books/${bookId}/start-full-generation`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start generation");
      }

      if (!data.hasInteriorPages) {
        setHasInteriorPages(false);
        setIsGenerating(false);
        setPageStatuses(data.pageStatuses || []);
        updateProgress(data.pageStatuses || []);
        // Reset so user can retry if needed
        isStartedRef.current = false;
        return;
      }

      setHasInteriorPages(true);
      setPageStatuses(data.pageStatuses || []);
      updateProgress(data.pageStatuses || []);
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

  // Retry a failed page
  const retryPage = useCallback(async (pageId: string) => {
    try {
      const res = await fetch(`/api/books/${bookId}/retry-page`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to retry page");
      }

      // Update local state
      setPageStatuses((prev) =>
        prev.map((p) =>
          p.pageId === pageId
            ? { ...p, status: "pending", error: undefined }
            : p
        )
      );

      // Trigger generation
      await generatePage(pageId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error(`Error retrying ${pageId}:`, errorMsg);
    }
  }, [bookId, generatePage]);

  // Check for resume on mount
  useEffect(() => {
    const checkResume = async () => {
      try {
        const res = await fetch(`/api/books/${bookId}/status`);
        if (!res.ok) return;

        const data = await res.json();

        // If book is in generating_full status, resume
        if (data.status === "generating_full" && data.pageStatuses) {
          setPageStatuses(data.pageStatuses);
          updateProgress(data.pageStatuses);
          setHasInteriorPages(true);
          setIsGenerating(true);
          isStartedRef.current = true;
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
    error,
    tokenBalance,
  };
}
