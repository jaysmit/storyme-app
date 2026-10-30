"use client";

import { useState, useEffect, useCallback } from "react";

interface Page {
  page_number: number;
  url: string;
  title: string;
}

interface BookViewerProps {
  pages: Page[];
  title: string;
  onClose?: () => void;
  isGenerating?: boolean;
  generatingProgress?: number;
}

export default function BookViewer({
  pages,
  title,
  onClose,
  isGenerating = false,
  generatingProgress = 0,
}: BookViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    return (
      <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-8 text-center">
        <div className="max-w-md mx-auto">
          {/* Animated book icon */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#F4C95D"
                strokeWidth="1.5"
                className="animate-pulse"
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                <path d="M8 7h8M8 11h8M8 15h4" />
              </svg>
            </div>
            <div className="absolute inset-0 border-4 border-accent-gold border-t-transparent rounded-full animate-spin" />
          </div>

          <h2 className="text-2xl font-black text-white mb-2">
            Creating your storybook...
          </h2>
          <p className="text-text-muted mb-6">
            Our AI artists are bringing your characters to life in beautiful illustrations.
          </p>

          {/* Progress bar */}
          <div className="bg-brand-dark rounded-full h-3 overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-accent-gold to-accent-teal transition-all duration-500"
              style={{ width: `${generatingProgress}%` }}
            />
          </div>
          <p className="text-sm text-text-muted">
            Generating page {Math.ceil((generatingProgress / 100) * 3)} of 3...
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

            {/* Page title overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <span className="text-accent-gold text-sm font-bold">Page {page.page_number}</span>
              <h4 className="text-2xl font-black text-white">{page.title}</h4>
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
