"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Page {
  page_number: number;
  url: string;
  title: string;
  story_text?: string;
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
  showActions?: boolean; // Show edit/view buttons
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
    if (savedOverlay) return savedOverlay;

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
            {/* Action buttons */}
            {showActions && bookId && (
              <>
                <Link
                  href={`/book/${bookId}/edit`}
                  className="px-3 py-1.5 bg-brand-purple border border-brand-purple-muted text-white text-sm font-bold rounded-full hover:bg-brand-purple-light transition-colors flex items-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </Link>
                <Link
                  href={`/book/${bookId}`}
                  className="px-3 py-1.5 bg-accent-gold text-brand-dark text-sm font-bold rounded-full hover:bg-accent-gold-light transition-colors flex items-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Full Page
                </Link>
              </>
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
        <div className={`relative ${isFullscreen ? "flex-1" : ""}`}>
          {/* Page image */}
          <div className={`relative ${isFullscreen ? "h-full" : "aspect-[16/9]"} bg-brand-dark`}>
            <img
              src={page.url}
              alt={page.title}
              className="w-full h-full object-contain"
            />

            {/* Text overlay - positioned on page */}
            {currentOverlay?.visible && currentOverlay?.text && (
              <div
                className="absolute px-4 py-3 rounded-lg max-w-[80%] pointer-events-none"
                style={{
                  left: `${currentOverlay.position.x}%`,
                  top: `${currentOverlay.position.y}%`,
                  transform: "translate(-50%, -50%)",
                  fontSize: `${currentOverlay.fontSize}px`,
                  color: currentOverlay.fontColor,
                  backgroundColor: currentOverlay.backgroundColor,
                  textAlign: currentOverlay.textAlign,
                  lineHeight: 1.4,
                }}
              >
                {currentOverlay.text}
              </div>
            )}

            {/* Page number indicator - subtle bottom left */}
            <div className="absolute bottom-3 left-3 bg-black/50 px-2 py-1 rounded text-xs text-white/70">
              Page {page.page_number}
            </div>

            {/* Navigation arrows */}
            {currentPage > 0 && (
              <button
                onClick={prevPage}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            )}
            {currentPage < pages.length - 1 && (
              <button
                onClick={nextPage}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Thumbnails */}
        <div className="p-4 border-t border-brand-purple-muted">
          <div className="flex justify-center gap-3">
            {pages.map((p, i) => (
              <button
                key={p.page_number}
                onClick={() => goToPage(i)}
                className={`relative rounded-lg overflow-hidden transition-all ${
                  i === currentPage
                    ? "ring-2 ring-accent-gold scale-105"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={p.url}
                  alt={p.title}
                  className="w-20 h-12 object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{p.page_number}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Page indicator */}
          <div className="text-center mt-4 text-sm text-text-muted">
            Page {currentPage + 1} of {pages.length} • Use ← → keys to navigate
          </div>
        </div>
      </div>
    </div>
  );
}
