"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Page {
  page_number: number;
  url: string;
  title: string;
  story_text?: string;
}

interface PageStatus {
  pageId: string;
  pageNumber: number;
  status: "pending" | "generating" | "completed" | "failed";
  url?: string;
  error?: string;
}

interface TextOverlay {
  pageNumber: number;
  text: string;
  position: { x: number; y: number }; // percentage from top-left
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  textAlign: "left" | "center" | "right";
  visible: boolean;
}

// Default overlay styling for pages without custom overlays
const DEFAULT_OVERLAY_STYLE = {
  position: { x: 50, y: 85 }, // Center bottom
  fontSize: 18,
  fontColor: "#FFFFFF",
  backgroundColor: "rgba(0,0,0,0.7)",
  textAlign: "center" as const,
  visible: true,
};

type BookCategory = "cover" | "book" | "generating" | "incomplete";

interface BookViewerProps {
  pages: Page[];
  title: string;
  onClose?: () => void;
  isGenerating?: boolean;
  generatingProgress?: number;
  onMinimize?: () => void;
  generationStartTime?: number;
  textOverlays?: TextOverlay[];
  bookId?: string; // For edit/view links
  showActions?: boolean; // Show action bar at bottom
  bookCategory?: BookCategory; // Type of book for action buttons
  pageStatuses?: PageStatus[]; // For showing generation status on thumbnails
  onRetryPage?: (pageId: string, pageNumber: number) => void; // Callback to retry a failed page
  regeneratingPages?: Set<string>; // Pages currently being regenerated
  onRegenerateAll?: () => void; // Callback to regenerate all missing pages
  isRegenerating?: boolean; // Whether regeneration is in progress
}

export default function BookViewer({
  pages,
  title,
  onClose,
  isGenerating = false,
  generatingProgress = 0,
  onMinimize,
  generationStartTime,
  textOverlays = [],
  bookId,
  showActions = false,
  bookCategory = "book",
  pageStatuses = [],
  onRetryPage,
  regeneratingPages = new Set(),
  onRegenerateAll,
  isRegenerating = false,
}: BookViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Track elapsed time during generation
  useEffect(() => {
    if (!isGenerating || !generationStartTime) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - generationStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isGenerating, generationStartTime]);

  const goToPage = useCallback((index: number) => {
    if (index >= 0 && index < pages.length) {
      setCurrentPage(index);
    }
  }, [pages.length]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        nextPage();
      } else if (e.key === "ArrowLeft") {
        prevPage();
      } else if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else if (onClose) {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPage, prevPage, isFullscreen, onClose]);

  if (isGenerating) {
    const expectedSeconds = 45; // Expected time ~45 seconds
    const remainingSeconds = Math.max(0, expectedSeconds - elapsedSeconds);
    const progressPercent = Math.min(95, (elapsedSeconds / expectedSeconds) * 100);

    return (
      <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-8">
        <div className="max-w-md mx-auto">
          {/* Animated cover page icon */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            {/* Book cover illustration */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Book shape */}
                <div className="w-20 h-24 bg-gradient-to-br from-accent-gold to-amber-600 rounded-r-lg shadow-lg transform -rotate-3">
                  <div className="absolute inset-1 bg-cream/20 rounded-r-lg" />
                  <div className="absolute top-3 left-3 right-3 space-y-1.5">
                    <div className="h-1.5 bg-white/40 rounded animate-pulse" />
                    <div className="h-1.5 bg-white/30 rounded w-3/4 animate-pulse" style={{ animationDelay: "0.2s" }} />
                  </div>
                  {/* Sparkles */}
                  <div className="absolute -top-2 -right-2 text-xl animate-bounce">✨</div>
                  <div className="absolute -bottom-1 -left-1 text-lg animate-bounce" style={{ animationDelay: "0.5s" }}>✨</div>
                </div>
              </div>
            </div>
            {/* Rotating ring */}
            <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: "3s" }}>
              <circle
                cx="64"
                cy="64"
                r="58"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="100 260"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F4C95D" />
                  <stop offset="100%" stopColor="#2DD4BF" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h2 className="text-2xl font-black text-white mb-2 text-center">
            Creating your cover page
          </h2>
          <p className="text-text-muted mb-6 text-center">
            Our AI artists are crafting your personalized illustration...
          </p>

          {/* Progress section */}
          <div className="bg-brand-dark/50 rounded-2xl p-4 mb-4">
            {/* Segmented progress bar */}
            <div className="flex gap-1 mb-3">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                    i < Math.floor(progressPercent / 10)
                      ? "bg-gradient-to-r from-accent-gold to-accent-teal"
                      : i === Math.floor(progressPercent / 10)
                      ? "bg-accent-gold/50 animate-pulse"
                      : "bg-brand-purple-muted"
                  }`}
                />
              ))}
            </div>

            {/* Time info */}
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">
                {elapsedSeconds}s elapsed
              </span>
              <span className="text-accent-gold font-bold">
                {remainingSeconds > 0 ? `~${remainingSeconds}s remaining` : "Almost done..."}
              </span>
            </div>
          </div>

          {/* Minimize button */}
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="w-full py-3 px-4 rounded-xl bg-brand-purple hover:bg-brand-purple-muted border border-brand-purple-muted transition-colors flex items-center justify-center gap-3 group"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-accent-gold"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="text-white font-bold">Notify me when ready</span>
              <span className="text-text-muted text-sm group-hover:text-white transition-colors">
                Continue browsing
              </span>
            </button>
          )}

          <p className="text-center text-text-muted text-xs mt-4">
            You&apos;ll receive a notification when your cover is ready
          </p>
        </div>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-8 text-center">
        <div className="text-6xl mb-4">📚</div>
        <h2 className="text-2xl font-black text-white mb-2">No pages yet</h2>
        <p className="text-text-muted">Generate your book preview to see the pages here.</p>
      </div>
    );
  }

  const page = pages[currentPage];

  // Get text overlay for current page (from saved overlays or use story_text with defaults)
  const getPageOverlay = (pageNum: number, storyText?: string, pageTitle?: string): TextOverlay | null => {
    // First check for saved overlay
    const savedOverlay = textOverlays.find((o) => o.pageNumber === pageNum);
    if (savedOverlay) {
      // If saved overlay has text, use it; otherwise fall back to story text
      if (savedOverlay.text) {
        return savedOverlay;
      }
      // Use saved styling but with story text content
      if (storyText) {
        return { ...savedOverlay, text: storyText };
      }
      return savedOverlay;
    }

    // For cover page (page 0), show the book title
    if (pageNum === 0) {
      return {
        pageNumber: 0,
        text: title, // Use the book title
        position: { x: 50, y: 50 }, // Center of cover
        fontSize: 28,
        fontColor: "#FFFFFF",
        backgroundColor: "rgba(0,0,0,0.6)",
        textAlign: "center",
        visible: true,
      };
    }

    // If no saved overlay but we have story text, create a default one
    if (storyText) {
      return {
        pageNumber: pageNum,
        text: storyText,
        ...DEFAULT_OVERLAY_STYLE,
      };
    }

    return null;
  };

  const currentOverlay = getPageOverlay(page.page_number, page.story_text, page.title);

  return (
    <div className={`${isFullscreen ? "fixed inset-0 z-50 bg-brand-dark p-4" : ""}`}>
      <div className={`bg-brand-purple-light border border-brand-purple-muted rounded-3xl overflow-hidden ${isFullscreen ? "h-full flex flex-col" : ""}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-brand-purple-muted">
          <div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-sm text-text-muted">Preview • {pages.length} pages</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Category badge */}
            {showActions && (
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                bookCategory === "cover" ? "bg-accent-teal/20 text-accent-teal" :
                bookCategory === "book" ? "bg-green-500/20 text-green-400" :
                bookCategory === "generating" ? "bg-amber-500/20 text-amber-400" :
                "bg-red-500/20 text-red-400"
              }`}>
                {bookCategory === "cover" ? "Cover Ready" :
                 bookCategory === "book" ? "Complete" :
                 bookCategory === "generating" ? "Generating" :
                 "Needs Recovery"}
              </span>
            )}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg hover:bg-brand-purple-muted transition-colors text-text-muted hover:text-white"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
              )}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-brand-purple-muted transition-colors text-text-muted hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className={`relative ${isFullscreen ? "flex-1 flex flex-col" : ""}`}>
          {/* Page image */}
          <div className={`relative ${isFullscreen ? "flex-1" : "aspect-[3/2]"} bg-black flex items-center justify-center`}>
            <img
              src={page.url}
              alt={page.title}
              className="max-w-full max-h-full object-contain"
            />

            {/* Page indicator - center bottom of image */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-full text-white text-sm font-bold">
              {page.page_number === 0 ? "Cover" : `Page ${page.page_number}`} of {pages.length - 1}
            </div>

            {/* Navigation arrows */}
            {currentPage > 0 && (
              <button
                onClick={prevPage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}
            {currentPage < pages.length - 1 && (
              <button
                onClick={nextPage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}
          </div>

          {/* Story text panel - below image (not on cover) */}
          {page.page_number !== 0 && page.story_text && (
            <div className="bg-white p-6 border-t-4 border-accent-gold">
              {page.title && (
                <h3 className="text-xl font-black text-brand-dark mb-3">{page.title}</h3>
              )}
              <p className="text-brand-dark text-lg leading-relaxed">
                {page.story_text}
              </p>
            </div>
          )}
        </div>

        {/* Thumbnails with status indicators */}
        <div className="p-4 border-t border-brand-purple-muted">
          <div className="flex justify-center gap-2 flex-wrap">
            {pages.map((p, i) => {
              const status = pageStatuses.find((s) => s.pageNumber === p.page_number);
              const isRegenerating = status && regeneratingPages.has(status.pageId);
              const pageStatus = status?.status || "completed";
              const canRetry = (pageStatus === "failed" || pageStatus === "pending" || pageStatus === "generating") && !isRegenerating;

              // Border color based on status
              const getBorderClass = () => {
                if (i === currentPage) return "ring-2 ring-accent-gold scale-105";
                switch (pageStatus) {
                  case "completed": return "ring-2 ring-green-500";
                  case "generating": return "ring-2 ring-amber-500";
                  case "failed": return "ring-2 ring-red-500";
                  case "pending": return "ring-2 ring-gray-500";
                  default: return "";
                }
              };

              return (
                <div key={p.page_number} className="relative group">
                  <button
                    onClick={() => goToPage(i)}
                    className={`relative rounded-lg overflow-hidden transition-all ${getBorderClass()} ${
                      i !== currentPage ? "opacity-80 hover:opacity-100" : ""
                    }`}
                  >
                    <img
                      src={p.url}
                      alt={p.title}
                      className="w-16 h-10 object-cover"
                    />

                    {/* Page number */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] font-bold text-center py-0.5">
                      {p.page_number === 0 ? "Cover" : `P${p.page_number}`}
                    </div>

                    {/* Status overlay for non-completed pages */}
                    {pageStatus !== "completed" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {(pageStatus === "generating" || isRegenerating) && (
                          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                        )}
                        {pageStatus === "failed" && !isRegenerating && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        )}
                        {pageStatus === "pending" && !isRegenerating && (
                          <div className="w-3 h-3 rounded-full bg-gray-400" />
                        )}
                      </div>
                    )}
                  </button>

                  {/* Retry button overlay on hover for failed/pending/stuck pages */}
                  {canRetry && onRetryPage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetryPage(status!.pageId, p.page_number);
                      }}
                      className="absolute inset-0 bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      title={pageStatus === "generating" ? "Page stuck - click to retry" : "Retry generation"}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                        <path d="M23 4v6h-6M1 20v-6h6" />
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Page indicator and legend */}
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-text-muted">
            <span>Page {currentPage + 1} of {pages.length}</span>
            {pageStatuses.length > 0 && (
              <>
                <span className="text-brand-purple-muted">|</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Done</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Working</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Failed</span>
                </div>
              </>
            )}
          </div>

          {/* Use ← → arrow keys */}
          <p className="text-center text-text-muted text-xs mt-2">
            Use ← → arrow keys to navigate
          </p>
        </div>

        {/* Action bar - shown when showActions is true */}
        {showActions && bookId && (
          <div className="p-4 border-t border-brand-purple-muted bg-brand-dark/50">
            <div className="flex items-center justify-center gap-3">
              {/* Cover actions */}
              {bookCategory === "cover" && (
                <>
                  <Link
                    href={`/book/${bookId}/edit?page=0`}
                    className="px-4 py-2.5 border border-brand-purple-muted text-white font-bold rounded-full hover:border-accent-gold hover:text-accent-gold transition-colors flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit Cover
                  </Link>
                  <Link
                    href={`/create?book=${bookId}`}
                    className="px-6 py-2.5 bg-accent-gold text-brand-dark font-bold rounded-full hover:bg-accent-gold-light transition-colors flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Generate Book
                  </Link>
                </>
              )}

              {/* Completed book actions */}
              {bookCategory === "book" && (
                <>
                  <Link
                    href={`/book/${bookId}/edit`}
                    className="px-4 py-2.5 border border-brand-purple-muted text-white font-bold rounded-full hover:border-accent-gold hover:text-accent-gold transition-colors flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit Book
                  </Link>
                  <Link
                    href={`/book/${bookId}/print`}
                    className="px-6 py-2.5 bg-accent-gold text-brand-dark font-bold rounded-full hover:bg-accent-gold-light transition-colors flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <rect x="6" y="14" width="12" height="8" />
                    </svg>
                    Print Book
                  </Link>
                </>
              )}

              {/* Generating/Incomplete actions */}
              {(bookCategory === "generating" || bookCategory === "incomplete") && (
                <>
                  <Link
                    href={`/book/${bookId}/edit`}
                    className="px-4 py-2.5 border border-brand-purple-muted text-white font-bold rounded-full hover:border-accent-gold hover:text-accent-gold transition-colors flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit Pages
                  </Link>
                  {onRegenerateAll && (
                    <button
                      onClick={onRegenerateAll}
                      disabled={isRegenerating}
                      className={`px-6 py-2.5 font-bold rounded-full transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        bookCategory === "incomplete"
                          ? "bg-red-500 text-white hover:bg-red-400"
                          : "bg-amber-500 text-brand-dark hover:bg-amber-400"
                      }`}
                    >
                      {isRegenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 4v6h-6M1 20v-6h6" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                          </svg>
                          {bookCategory === "incomplete" ? "Recover Pages" : "Regenerate All"}
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
