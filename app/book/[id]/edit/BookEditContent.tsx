"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

interface CharacterSnapshot {
  id: string;
  name: string;
  character_type?: string;
  age?: number;
  generated_image_url?: string;
  identity_profile?: {
    hair: { color: string; style: string };
    eyes: { color: string };
    skinTone: string;
  };
}

interface PersonalizedPage {
  page_number: number;
  story_text: string;
  title?: string;
}

interface Book {
  id: string;
  title?: string;
  status: string;
  preview_pages: BookPage[];
  text_overlays?: TextOverlay[];
  personalized_pages?: PersonalizedPage[];
  characters_snapshot?: CharacterSnapshot[];
  metadata?: {
    bookId?: string;
  };
}

interface Props {
  bookId: string;
}

type EditTab = "text" | "image";

const DEFAULT_OVERLAY: Omit<TextOverlay, "pageNumber" | "text"> = {
  position: { x: 50, y: 85 },
  fontSize: 16,
  fontColor: "#FFFFFF",
  backgroundColor: "rgba(0,0,0,0.7)",
  textAlign: "center",
  visible: true,
};

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

const FONT_COLORS = [
  { label: "White", value: "#FFFFFF" },
  { label: "Cream", value: "#FFFDD0" },
  { label: "Light Gray", value: "#D3D3D3" },
  { label: "Gray", value: "#808080" },
  { label: "Black", value: "#000000" },
  { label: "Gold", value: "#F4C95D" },
  { label: "Orange", value: "#FF8C00" },
  { label: "Red", value: "#CC0000" },
  { label: "Pink", value: "#FF69B4" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Navy", value: "#14163A" },
  { label: "Blue", value: "#3B82F6" },
  { label: "Teal", value: "#2DD4BF" },
  { label: "Green", value: "#22C55E" },
  { label: "Brown", value: "#8B4513" },
];

const BG_BASE_COLORS = [
  { label: "Black", value: "0,0,0" },
  { label: "White", value: "255,255,255" },
  { label: "Gold", value: "244,201,93" },
  { label: "Navy", value: "20,22,58" },
  { label: "Purple", value: "139,92,246" },
  { label: "Teal", value: "45,212,191" },
];

const VERTICAL_POSITIONS = [
  { y: 10, label: "Top" },
  { y: 50, label: "Middle" },
  { y: 85, label: "Bottom" },
];

const HORIZONTAL_POSITIONS = [
  { x: 15, label: "Left" },
  { x: 50, label: "Center" },
  { x: 85, label: "Right" },
];

export default function BookEditContent({ bookId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [storyTexts, setStoryTexts] = useState<Map<number, string>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(0.7);
  const [bgBaseColor, setBgBaseColor] = useState("0,0,0");
  const [activeTab, setActiveTab] = useState<EditTab>("text");

  // Image edit state
  const [imageEditPrompt, setImageEditPrompt] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [regenerateProgress, setRegenerateProgress] = useState(0);
  const [regenerateStartTime, setRegenerateStartTime] = useState<number | null>(null);

  // Estimated time for regeneration (in seconds)
  const ESTIMATED_GENERATION_TIME = 45; // 45 seconds estimate

  // Progress timer effect
  useEffect(() => {
    if (!regenerating || !regenerateStartTime) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - regenerateStartTime) / 1000;
      const progress = Math.min((elapsed / ESTIMATED_GENERATION_TIME) * 100, 95);
      setRegenerateProgress(progress);
    }, 500);

    return () => clearInterval(interval);
  }, [regenerating, regenerateStartTime]);

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

        // Check for ?page= parameter to start on specific page
        const pageParam = searchParams.get("page");
        if (pageParam !== null) {
          const pageIndex = parseInt(pageParam, 10);
          const pages = data.book.preview_pages || [];
          // Find the index of the page with this page_number
          const targetIndex = pages.findIndex((p: BookPage) => p.page_number === pageIndex);
          if (targetIndex >= 0) {
            setCurrentPage(targetIndex);
          }
        }

        // Initialize overlays from saved data or create defaults
        const savedOverlays = data.book.text_overlays || [];
        const pages = data.book.preview_pages || [];

        const initialOverlays: TextOverlay[] = pages.map((page: BookPage) => {
          const existing = savedOverlays.find(
            (o: TextOverlay) => o.pageNumber === page.page_number
          );
          if (existing) return existing;

          const personalizedPage = data.book.personalized_pages?.find(
            (p: { page_number: number }) => p.page_number === page.page_number
          );

          return {
            pageNumber: page.page_number,
            text: personalizedPage?.story_text || page.title || "",
            ...DEFAULT_OVERLAY,
          };
        });
        setOverlays(initialOverlays);

        // Load story texts from API
        if (data.book.metadata?.bookId) {
          const storyRes = await fetch(`/api/books/${bookId}/story-text`);
          if (storyRes.ok) {
            const storyData = await storyRes.json();
            const textsMap = new Map<number, string>();
            storyData.pages?.forEach((p: { page_number: number; story_text: string; title?: string }) => {
              textsMap.set(p.page_number, p.story_text);
            });
            setStoryTexts(textsMap);

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
  }, [bookId, router, searchParams]);

  const pages = book?.preview_pages || [];
  const currentPageData = pages[currentPage];
  const currentOverlay = overlays.find(
    (o) => o.pageNumber === currentPageData?.page_number
  );

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

  useEffect(() => {
    if (currentOverlay?.backgroundColor) {
      const bg = currentOverlay.backgroundColor;
      if (bg === "transparent") {
        setBgOpacity(0);
        setBgBaseColor("0,0,0");
      } else if (bg.startsWith("rgba(")) {
        const match = bg.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
        if (match) {
          setBgBaseColor(`${match[1]},${match[2]},${match[3]}`);
          setBgOpacity(parseFloat(match[4]));
        }
      }
    }
  }, [currentOverlay?.backgroundColor, currentPage]);

  const updateBackgroundColor = useCallback((baseColor: string, opacity: number) => {
    setBgBaseColor(baseColor);
    setBgOpacity(opacity);
    if (opacity === 0) {
      updateOverlay({ backgroundColor: "transparent" });
    } else {
      updateOverlay({ backgroundColor: `rgba(${baseColor},${opacity})` });
    }
  }, [updateOverlay]);

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

  const saveOverlays = async () => {
    if (!book) return;
    setSaving(true);
    try {
      await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text_overlays: overlays }),
      });
      router.push(`/books?preview=${bookId}`);
    } catch (error) {
      console.error("Failed to save:", error);
      setSaving(false);
    }
  };

  // Regenerate current page image
  const regenerateImage = async () => {
    if (!book || !currentPageData) return;

    setRegenerating(true);
    setRegenerateError(null);
    setRegenerateProgress(0);
    setRegenerateStartTime(Date.now());

    try {
      // For cover (page 0), retry and regenerate
      if (currentPageData.page_number === 0) {
        const res = await fetch(`/api/books/${bookId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            regenerate: true,
            editInstructions: imageEditPrompt || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to regenerate cover");
        }

        const data = await res.json();

        // Update book state with new cover
        if (data.pages && data.pages.length > 0) {
          setBook((prev) => {
            if (!prev) return prev;
            const newPreviewPages = prev.preview_pages.map((p) =>
              p.page_number === 0 ? { ...p, url: data.pages[0].url } : p
            );
            return { ...prev, preview_pages: newPreviewPages };
          });
        }
      } else {
        // For interior pages
        const pageId = `page-${currentPageData.page_number}`;

        // First retry the page
        await fetch(`/api/books/${bookId}/retry-page`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId }),
        });

        // Then generate it
        const res = await fetch(`/api/books/${bookId}/generate-page`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pageId,
            editInstructions: imageEditPrompt || undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to regenerate page");
        }

        const data = await res.json();

        // Update book state with new page
        if (data.url) {
          setBook((prev) => {
            if (!prev) return prev;
            const newPreviewPages = prev.preview_pages.map((p) =>
              p.page_number === currentPageData.page_number ? { ...p, url: data.url } : p
            );
            return { ...prev, preview_pages: newPreviewPages };
          });
        }
      }

      setImageEditPrompt("");
      setRegenerateProgress(100);
    } catch (error) {
      console.error("Regenerate error:", error);
      setRegenerateError(error instanceof Error ? error.message : "Failed to regenerate");
    }

    setRegenerating(false);
    setRegenerateStartTime(null);
  };

  // Get character info for display
  const getCharacterInfo = (): string => {
    if (!book?.characters_snapshot || book.characters_snapshot.length === 0) {
      return "No character information available.";
    }

    return book.characters_snapshot.map((char, i) => {
      const parts = [`${i + 1}. ${char.name}`];
      if (char.age) parts.push(`${char.age}yo`);
      if (char.character_type) parts.push(char.character_type);
      if (char.identity_profile) {
        const profile = char.identity_profile;
        const traits = [];
        if (profile.hair) traits.push(`${profile.hair.color} ${profile.hair.style} hair`);
        if (profile.eyes) traits.push(`${profile.eyes.color} eyes`);
        if (profile.skinTone) traits.push(`${profile.skinTone} skin`);
        if (traits.length > 0) parts.push(`- ${traits.join(", ")}`);
      }
      return parts.join(" ");
    }).join("\n");
  };

  const goToPage = (index: number) => {
    if (index >= 0 && index < pages.length) {
      setCurrentPage(index);
      setImageEditPrompt(""); // Clear edit prompt when changing pages
      setRegenerateError(null);
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
            <Link href={`/book/${bookId}`} className="text-accent-gold hover:underline">
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
                <h1 className="text-xl font-bold text-white">
                  Edit {currentPageData?.page_number === 0 ? "Cover" : `Page ${currentPageData?.page_number}`}
                </h1>
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
              <div className="relative">
                {/* Left navigation arrow */}
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 w-12 h-12 rounded-full bg-brand-purple-light border border-brand-purple-muted flex items-center justify-center text-white disabled:opacity-30 hover:bg-brand-purple hover:border-accent-gold transition-colors shadow-lg"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>

                {/* Right navigation arrow */}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === pages.length - 1}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-12 h-12 rounded-full bg-brand-purple-light border border-brand-purple-muted flex items-center justify-center text-white disabled:opacity-30 hover:bg-brand-purple hover:border-accent-gold transition-colors shadow-lg"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>

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

                  {/* Text overlay preview (only show when in text tab) */}
                  {activeTab === "text" && currentOverlay?.visible && currentOverlay?.text && (
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

                  {/* Regenerating overlay with progress */}
                  {regenerating && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="text-center w-64">
                        <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white font-bold mb-3">Regenerating image...</p>

                        {/* Progress bar */}
                        <div className="bg-brand-purple-muted rounded-full h-2 overflow-hidden mb-2">
                          <div
                            className="bg-accent-gold h-full transition-all duration-500 ease-out"
                            style={{ width: `${regenerateProgress}%` }}
                          />
                        </div>

                        {/* Time estimate */}
                        <p className="text-sm text-text-muted">
                          {regenerateProgress < 95
                            ? `Estimated: ~${Math.max(0, Math.round(ESTIMATED_GENERATION_TIME - (regenerateProgress / 100) * ESTIMATED_GENERATION_TIME))}s remaining`
                            : "Almost done..."}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
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
                        <img src={page.url} alt={`Page ${index + 1}`} className="w-full h-full object-cover" />
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

            {/* Editor panel with tabs */}
            <div className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl overflow-hidden">
              {/* Tab buttons */}
              <div className="flex border-b border-brand-purple-muted">
                <button
                  onClick={() => setActiveTab("text")}
                  className={`flex-1 px-4 py-3 font-bold text-sm transition-colors ${
                    activeTab === "text"
                      ? "bg-brand-dark text-accent-gold border-b-2 border-accent-gold"
                      : "text-text-muted hover:text-white"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
                    </svg>
                    Text
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("image")}
                  className={`flex-1 px-4 py-3 font-bold text-sm transition-colors ${
                    activeTab === "image"
                      ? "bg-brand-dark text-accent-gold border-b-2 border-accent-gold"
                      : "text-text-muted hover:text-white"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    Image
                  </span>
                </button>
              </div>

              {/* Tab content */}
              <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
                {activeTab === "text" ? (
                  <>
                    {/* TEXT TAB CONTENT */}
                    <h2 className="text-lg font-bold text-white">
                      {currentPageData?.page_number === 0 ? "Cover" : `Page ${currentPageData?.page_number}`} Text
                    </h2>

                    {/* Text content */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">Story Text</label>
                      <textarea
                        value={currentOverlay?.text || ""}
                        onChange={(e) => updateOverlay({ text: e.target.value })}
                        placeholder="Enter text for this page..."
                        className="w-full h-24 px-3 py-2 rounded-lg bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold resize-none"
                      />
                      {storyTexts.get(currentPageData?.page_number) && (
                        <button
                          onClick={() => updateOverlay({ text: storyTexts.get(currentPageData?.page_number) || "" })}
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
                        onClick={() => updateOverlay({ visible: !currentOverlay?.visible })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          currentOverlay?.visible ? "bg-accent-gold" : "bg-brand-purple-muted"
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
                          {isDragging ? "Click on image..." : "Custom"}
                        </button>
                      </div>
                      <p className="text-xs text-text-muted mb-1">Vertical</p>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {VERTICAL_POSITIONS.map((pos) => (
                          <button
                            key={pos.label}
                            onClick={() => updateOverlay({ position: { x: currentOverlay?.position.x || 50, y: pos.y } })}
                            className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                              Math.abs((currentOverlay?.position.y || 0) - pos.y) < 15
                                ? "bg-accent-gold text-brand-dark"
                                : "bg-brand-dark text-text-muted hover:text-white"
                            }`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-text-muted mb-1">Horizontal</p>
                      <div className="grid grid-cols-3 gap-2">
                        {HORIZONTAL_POSITIONS.map((pos) => (
                          <button
                            key={pos.label}
                            onClick={() => updateOverlay({ position: { x: pos.x, y: currentOverlay?.position.y || 85 } })}
                            className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                              Math.abs((currentOverlay?.position.x || 0) - pos.x) < 15
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
                      <label className="block text-sm font-bold text-white mb-2">Font Size</label>
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
                      <label className="block text-sm font-bold text-white mb-2">Text Color</label>
                      <div className="grid grid-cols-5 gap-2">
                        {FONT_COLORS.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => updateOverlay({ fontColor: color.value })}
                            className={`w-8 h-8 rounded-full border-2 transition-colors ${
                              currentOverlay?.fontColor === color.value
                                ? "border-accent-gold ring-2 ring-accent-gold ring-offset-2 ring-offset-brand-purple-light"
                                : "border-white/20 hover:border-white/40"
                            }`}
                            style={{ backgroundColor: color.value }}
                            title={color.label}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Background color */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">Background Color</label>
                      <div className="flex gap-2 mb-3">
                        {BG_BASE_COLORS.map((color) => (
                          <button
                            key={color.label}
                            onClick={() => updateBackgroundColor(color.value, bgOpacity)}
                            className={`w-8 h-8 rounded-full border-2 transition-colors ${
                              bgBaseColor === color.value
                                ? "border-accent-gold ring-2 ring-accent-gold ring-offset-2 ring-offset-brand-purple-light"
                                : "border-white/20 hover:border-white/40"
                            }`}
                            style={{ backgroundColor: `rgb(${color.value})` }}
                            title={color.label}
                          />
                        ))}
                      </div>
                      <label className="block text-sm font-bold text-white mb-2">Background Transparency</label>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-muted w-16">Clear</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={bgOpacity}
                          onChange={(e) => updateBackgroundColor(bgBaseColor, parseFloat(e.target.value))}
                          className="flex-1 h-2 bg-brand-dark rounded-lg appearance-none cursor-pointer accent-accent-gold"
                        />
                        <span className="text-xs text-text-muted w-16 text-right">Solid</span>
                      </div>
                      <div className="text-center text-xs text-text-muted mt-1">
                        {Math.round(bgOpacity * 100)}% opacity
                      </div>
                    </div>

                    {/* Text alignment */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">Alignment</label>
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
                  </>
                ) : (
                  <>
                    {/* IMAGE TAB CONTENT */}
                    <h2 className="text-lg font-bold text-white">
                      Edit {currentPageData?.page_number === 0 ? "Cover" : `Page ${currentPageData?.page_number}`} Image
                    </h2>

                    {/* Character info */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">
                        Characters in this book
                      </label>
                      <div className="bg-brand-dark rounded-lg p-3 text-sm text-text-muted whitespace-pre-line max-h-32 overflow-y-auto">
                        {getCharacterInfo()}
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        Reference these names when describing changes.
                      </p>
                    </div>

                    {/* Page info */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">
                        Current Page
                      </label>
                      <div className="bg-brand-dark rounded-lg p-3 text-sm text-text-muted">
                        <p>
                          <strong className="text-white">
                            {currentPageData?.page_number === 0 ? "Cover" : `Page ${currentPageData?.page_number}`}
                          </strong>
                          {currentPageData?.title && `: ${currentPageData.title}`}
                        </p>
                      </div>
                    </div>

                    {/* Edit instructions */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-2">
                        What would you like to change?
                      </label>
                      <textarea
                        value={imageEditPrompt}
                        onChange={(e) => setImageEditPrompt(e.target.value)}
                        placeholder="Describe the changes you want. For example:&#10;• Make the sky more blue&#10;• Move Leon to the left&#10;• Add more trees in the background&#10;• Make Mum's hair longer"
                        className="w-full h-32 px-3 py-2 rounded-lg bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold resize-none"
                      />
                      <p className="text-xs text-text-muted mt-1">
                        Be specific about characters by name and what changes you want.
                      </p>
                    </div>

                    {/* Error message */}
                    {regenerateError && (
                      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                        <p className="text-red-200 text-sm">{regenerateError}</p>
                      </div>
                    )}

                    {/* Regenerate button with token cost */}
                    <button
                      onClick={regenerateImage}
                      disabled={regenerating}
                      className="w-full py-3 bg-accent-gold text-brand-dark font-bold rounded-full hover:bg-accent-gold-light disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      {regenerating ? (
                        <>
                          <div className="w-5 h-5 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 4v6h-6M1 20v-6h6" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                          </svg>
                          Regenerate (1 token)
                        </>
                      )}
                    </button>

                    <p className="text-xs text-text-muted text-center">
                      Leave the description empty to regenerate without changes.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
