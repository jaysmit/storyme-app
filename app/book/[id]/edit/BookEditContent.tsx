"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/ui/Header";

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

interface BookPage {
  page_number: number;
  url: string;
  title?: string;
}

interface Book {
  id: string;
  title?: string;
  status: string;
  preview_pages: BookPage[];
  text_overlays?: TextOverlay[];
  personalized_pages?: Array<{ pageNumber: number; text: string }>;
  metadata?: {
    bookId?: string;
  };
}

interface Props {
  bookId: string;
}

const DEFAULT_OVERLAY: Omit<TextOverlay, "pageNumber" | "text"> = {
  position: { x: 50, y: 85 }, // Center bottom
  fontSize: 16,
  fontColor: "#FFFFFF",
  backgroundColor: "rgba(0,0,0,0.7)",
  textAlign: "center",
  visible: true,
};

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];
const COLORS = [
  { label: "White", value: "#FFFFFF" },
  { label: "Black", value: "#000000" },
  { label: "Gold", value: "#F4C95D" },
  { label: "Navy", value: "#14163A" },
  { label: "Red", value: "#CC0000" },
];
const BG_COLORS = [
  { label: "Dark", value: "rgba(0,0,0,0.7)" },
  { label: "Light", value: "rgba(255,255,255,0.8)" },
  { label: "None", value: "transparent" },
  { label: "Gold", value: "rgba(244,201,93,0.9)" },
  { label: "Navy", value: "rgba(20,22,58,0.9)" },
];

export default function BookEditContent({ bookId }: Props) {
  const router = useRouter();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [storyTexts, setStoryTexts] = useState<Map<number, string>>(new Map());
  const [isDragging, setIsDragging] = useState(false);

  // Load book data
  useEffect(() => {
    async function fetchBook() {
      setLoading(true);
      try {
        const res = await fetch(`/api/books/${bookId}`);
        if (!res.ok) {
          router.push("/books");
          return;
        }
        const data = await res.json();
        setBook(data.book);

        // Initialize overlays from saved data or create defaults
        const savedOverlays = data.book.text_overlays || [];
        const pages = data.book.preview_pages || [];

        // Create overlay for each page
        const initialOverlays: TextOverlay[] = pages.map((page: BookPage) => {
          const existing = savedOverlays.find(
            (o: TextOverlay) => o.pageNumber === page.page_number
          );
          if (existing) return existing;

          // Get personalized text if available
          const personalizedPage = data.book.personalized_pages?.find(
            (p: { pageNumber: number }) => p.pageNumber === page.page_number
          );

          return {
            pageNumber: page.page_number,
            text: personalizedPage?.text || page.title || "",
            ...DEFAULT_OVERLAY,
          };
        });
        setOverlays(initialOverlays);

        // Load story texts
        if (data.book.metadata?.bookId) {
          const storyRes = await fetch(`/api/books/${bookId}/story-text`);
          if (storyRes.ok) {
            const storyData = await storyRes.json();
            const textsMap = new Map<number, string>();
            storyData.pages?.forEach((p: { pageNumber: number; text: string }) => {
              textsMap.set(p.pageNumber, p.text);
            });
            setStoryTexts(textsMap);

            // Update overlays with story text if not already set
            setOverlays((prev) =>
              prev.map((o) => ({
                ...o,
                text: o.text || textsMap.get(o.pageNumber) || "",
              }))
            );
          }
        }
      } catch (error) {
        console.error("Failed to fetch book:", error);
        router.push("/books");
      }
      setLoading(false);
    }

    fetchBook();
  }, [bookId, router]);

  // Get current overlay
  const pages = book?.preview_pages || [];
  const currentPageData = pages[currentPage];
  const currentOverlay = overlays.find(
    (o) => o.pageNumber === currentPageData?.page_number
  );

  // Update overlay for current page
  const updateOverlay = useCallback(
    (updates: Partial<TextOverlay>) => {
      if (!currentPageData) return;
      setOverlays((prev) =>
        prev.map((o) =>
          o.pageNumber === currentPageData.page_number ? { ...o, ...updates } : o
        )
      );
    },
    [currentPageData]
  );

  // Handle drag to position text
  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      updateOverlay({ position: { x, y } });
      setIsDragging(false);
    },
    [isDragging, updateOverlay]
  );

  // Save overlays
  const saveOverlays = async () => {
    if (!book) return;
    setSaving(true);
    try {
      await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text_overlays: overlays }),
      });
    } catch (error) {
      console.error("Failed to save:", error);
    }
    setSaving(false);
  };

  // Navigation
  const goToPage = (index: number) => {
    if (index >= 0 && index < pages.length) {
      setCurrentPage(index);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col">
        <Header theme="dark" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-muted">Loading book...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!book || pages.length === 0) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col">
        <Header theme="dark" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-text-muted mb-4">No pages to edit yet.</p>
            <Link
              href={`/book/${bookId}`}
              className="text-accent-gold hover:underline"
            >
              Back to book
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 py-6 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link
                href={`/book/${bookId}`}
                className="w-10 h-10 rounded-full bg-brand-purple-light border border-brand-purple-muted flex items-center justify-center text-white hover:bg-brand-purple transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Edit Text Overlays</h1>
                <p className="text-sm text-text-muted">
                  Page {currentPage + 1} of {pages.length}
                </p>
              </div>
            </div>
            <button
              onClick={saveOverlays}
              disabled={saving}
              className="px-6 py-2 bg-accent-gold text-brand-dark font-bold rounded-full hover:bg-accent-gold-light disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <path d="M17 21v-8H7v8M7 3v5h8" />
                  </svg>
                  Save Changes
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main preview */}
            <div className="lg:col-span-2">
              <div
                className={`relative aspect-[3/2] bg-brand-purple-light rounded-2xl overflow-hidden ${
                  isDragging ? "cursor-crosshair" : ""
                }`}
                onClick={handleImageClick}
              >
                {currentPageData?.url ? (
                  <img
                    src={currentPageData.url}
                    alt={`Page ${currentPage + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted">
                    No image
                  </div>
                )}

                {/* Text overlay preview */}
                {currentOverlay?.visible && currentOverlay?.text && (
                  <div
                    className="absolute px-4 py-2 rounded-lg max-w-[80%] transition-all"
                    style={{
                      left: `${currentOverlay.position.x}%`,
                      top: `${currentOverlay.position.y}%`,
                      transform: "translate(-50%, -50%)",
                      fontSize: `${currentOverlay.fontSize}px`,
                      color: currentOverlay.fontColor,
                      backgroundColor: currentOverlay.backgroundColor,
                      textAlign: currentOverlay.textAlign,
                    }}
                  >
                    {currentOverlay.text}
                  </div>
                )}

                {/* Drag mode indicator */}
                {isDragging && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <p className="text-white font-bold bg-black/60 px-4 py-2 rounded-full">
                      Click to position text
                    </p>
                  </div>
                )}
              </div>

              {/* Page navigation */}
              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="w-10 h-10 rounded-full bg-brand-purple-light border border-brand-purple-muted flex items-center justify-center text-white disabled:opacity-30 hover:bg-brand-purple transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>

                {/* Thumbnails */}
                <div className="flex gap-2 overflow-x-auto py-2 max-w-md">
                  {pages.map((page, index) => (
                    <button
                      key={page.page_number}
                      onClick={() => goToPage(index)}
                      className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                        index === currentPage
                          ? "border-accent-gold"
                          : "border-transparent hover:border-brand-purple-muted"
                      }`}
                    >
                      {page.url ? (
                        <img
                          src={page.url}
                          alt={`Page ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-brand-purple-light flex items-center justify-center text-xs text-text-muted">
                          {index + 1}
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === pages.length - 1}
                  className="w-10 h-10 rounded-full bg-brand-purple-light border border-brand-purple-muted flex items-center justify-center text-white disabled:opacity-30 hover:bg-brand-purple transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Editor panel */}
            <div className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-bold text-white">
                Page {currentPage + 1} Text
              </h2>

              {/* Text content */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  Story Text
                </label>
                <textarea
                  value={currentOverlay?.text || ""}
                  onChange={(e) => updateOverlay({ text: e.target.value })}
                  placeholder="Enter text for this page..."
                  className="w-full h-24 px-3 py-2 rounded-lg bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold resize-none"
                />
                {storyTexts.get(currentPageData?.page_number) && (
                  <button
                    onClick={() =>
                      updateOverlay({
                        text: storyTexts.get(currentPageData?.page_number) || "",
                      })
                    }
                    className="text-xs text-accent-gold hover:underline mt-1"
                  >
                    Reset to original story text
                  </button>
                )}
              </div>

              {/* Visibility toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">Show Text</span>
                <button
                  onClick={() =>
                    updateOverlay({ visible: !currentOverlay?.visible })
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    currentOverlay?.visible
                      ? "bg-accent-gold"
                      : "bg-brand-purple-muted"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                      currentOverlay?.visible ? "right-0.5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Position */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-white">Position</label>
                  <button
                    onClick={() => setIsDragging(!isDragging)}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${
                      isDragging
                        ? "bg-accent-gold text-brand-dark"
                        : "bg-brand-dark text-text-muted hover:text-white"
                    }`}
                  >
                    {isDragging ? "Click on image..." : "Move"}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { x: 50, y: 10, label: "Top" },
                    { x: 50, y: 50, label: "Center" },
                    { x: 50, y: 85, label: "Bottom" },
                  ].map((pos) => (
                    <button
                      key={pos.label}
                      onClick={() =>
                        updateOverlay({ position: { x: pos.x, y: pos.y } })
                      }
                      className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                        Math.abs(
                          (currentOverlay?.position.y || 0) - pos.y
                        ) < 10
                          ? "bg-accent-gold text-brand-dark"
                          : "bg-brand-dark text-text-muted hover:text-white"
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font size */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  Font Size
                </label>
                <div className="flex flex-wrap gap-2">
                  {FONT_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => updateOverlay({ fontSize: size })}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        currentOverlay?.fontSize === size
                          ? "bg-accent-gold text-brand-dark"
                          : "bg-brand-dark text-text-muted hover:text-white"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font color */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  Text Color
                </label>
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => updateOverlay({ fontColor: color.value })}
                      className={`w-8 h-8 rounded-full border-2 transition-colors ${
                        currentOverlay?.fontColor === color.value
                          ? "border-accent-gold"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              {/* Background color */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  Background
                </label>
                <div className="flex flex-wrap gap-2">
                  {BG_COLORS.map((color) => (
                    <button
                      key={color.label}
                      onClick={() =>
                        updateOverlay({ backgroundColor: color.value })
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        currentOverlay?.backgroundColor === color.value
                          ? "bg-accent-gold text-brand-dark"
                          : "bg-brand-dark text-text-muted hover:text-white"
                      }`}
                    >
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text alignment */}
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  Alignment
                </label>
                <div className="flex gap-2">
                  {(["left", "center", "right"] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => updateOverlay({ textAlign: align })}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                        currentOverlay?.textAlign === align
                          ? "bg-accent-gold text-brand-dark"
                          : "bg-brand-dark text-text-muted hover:text-white"
                      }`}
                    >
                      {align.charAt(0).toUpperCase() + align.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
