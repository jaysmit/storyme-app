"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

interface BlueprintPage {
  pageNumber: number;
  title: string;
  imageUrl: string | null;
  storyText?: string;
  storyTextTemplate?: string;
  isCover: boolean;
}

interface BlueprintData {
  bookId: string;
  title: string;
  format: string;
  pageCount: number;
  pages: BlueprintPage[];
}

function PreviewContent() {
  const params = useParams();
  const slug = params.slug as string;

  const [blueprint, setBlueprint] = useState<BlueprintData | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchBlueprint();
    }
  }, [slug]);

  async function fetchBlueprint() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/blueprints/${slug}/pages`);
      if (res.ok) {
        const data = await res.json();
        setBlueprint(data);
      } else {
        setError("Book not found");
      }
    } catch (err) {
      console.error("Failed to fetch blueprint:", err);
      setError("Failed to load book");
    }
    setLoading(false);
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!blueprint) return;
      if (e.key === "ArrowRight") {
        setCurrentPage((prev) => Math.min(prev + 1, blueprint.pages.length - 1));
      }
      if (e.key === "ArrowLeft") {
        setCurrentPage((prev) => Math.max(prev - 1, 0));
      }
    },
    [blueprint]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col">
        <Header theme="dark" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-muted">Loading book preview...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !blueprint) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col">
        <Header theme="dark" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-black text-white mb-4">Book not found</h1>
            <p className="text-text-muted mb-8">{error || "This book doesn't exist."}</p>
            <Link
              href="/worlds"
              className="inline-block bg-accent-gold text-brand-dark font-extrabold px-8 py-4 rounded-full"
            >
              Browse all worlds
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const currentPageData = blueprint.pages[currentPage];
  const hasPages = blueprint.pages.length > 0;

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 py-6 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <Link
                href={`/worlds/${slug}`}
                className="inline-flex items-center gap-2 text-text-muted hover:text-white mb-2 transition-colors text-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to story
              </Link>
              <h1 className="text-2xl font-black text-white">{blueprint.title}</h1>
              <p className="text-text-muted text-sm">Original book preview • {blueprint.pageCount} pages</p>
            </div>

            <Link
              href={`/create?story=${slug}`}
              className="bg-accent-gold text-brand-dark font-bold px-6 py-3 rounded-full hover:bg-accent-gold-light transition-colors"
            >
              Create your version
            </Link>
          </div>

          {/* Book viewer */}
          <div className="bg-brand-purple-light rounded-3xl overflow-hidden">
            {/* Main image */}
            <div className="relative aspect-[3/2] bg-black flex items-center justify-center">
              {currentPageData?.imageUrl ? (
                <img
                  src={currentPageData.imageUrl}
                  alt={currentPageData.title || `Page ${currentPageData.pageNumber}`}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-text-muted">No image available</div>
              )}

              {/* Navigation arrows */}
              {hasPages && currentPage > 0 && (
                <button
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
              )}
              {hasPages && currentPage < blueprint.pages.length - 1 && (
                <button
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              )}

              {/* Page indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 px-4 py-2 rounded-full text-white text-sm font-bold">
                {currentPageData?.isCover ? "Cover" : `Page ${currentPageData?.pageNumber}`} of {blueprint.pages.length - 1}
              </div>
            </div>

            {/* Story text panel */}
            {currentPageData && !currentPageData.isCover && (
              <div className="bg-white p-6 border-t-4 border-accent-gold">
                <h3 className="text-xl font-black text-brand-dark mb-3">{currentPageData.title}</h3>
                <p className="text-brand-dark text-lg leading-relaxed">
                  {currentPageData.storyText}
                </p>
                {currentPageData.storyTextTemplate && currentPageData.storyTextTemplate !== currentPageData.storyText && (
                  <p className="mt-4 text-sm text-gray-500 italic">
                    Template: {currentPageData.storyTextTemplate}
                  </p>
                )}
              </div>
            )}

            {/* Thumbnail navigation */}
            <div className="p-4 bg-brand-dark border-t border-brand-purple-muted overflow-x-auto">
              <div className="flex gap-2 justify-center min-w-max">
                {blueprint.pages.map((page, idx) => (
                  <button
                    key={page.pageNumber}
                    onClick={() => setCurrentPage(idx)}
                    className={`flex-shrink-0 rounded-lg overflow-hidden transition-all ${
                      idx === currentPage
                        ? "ring-2 ring-accent-gold scale-105"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    {page.imageUrl ? (
                      <img
                        src={page.imageUrl}
                        alt={page.title}
                        className="w-20 h-12 object-cover"
                      />
                    ) : (
                      <div className="w-20 h-12 bg-brand-purple-muted flex items-center justify-center text-xs text-text-muted">
                        {page.isCover ? "Cover" : page.pageNumber}
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-center text-text-muted text-xs mt-3">
                Use ← → arrow keys to navigate
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PreviewContent />
    </Suspense>
  );
}
