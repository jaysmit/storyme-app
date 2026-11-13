"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import BookViewer from "@/components/BookViewer";
import TokenConfirmModal from "@/components/ui/TokenConfirmModal";
import CharacterFormModal, { type PendingCharacter } from "@/components/ui/CharacterFormModal";
import IdentityConfirmModal from "@/components/ui/IdentityConfirmModal";
import StoryPreviewModal from "@/components/ui/StoryPreviewModal";
import { TOKEN_COSTS } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import type { Character, IdentityProfile, PageStatus } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import { useBookGeneration } from "@/hooks/useBookGeneration";
import PageGenerationGrid from "@/components/PageGenerationGrid";
import GenerationProgressBar from "@/components/GenerationProgressBar";

interface PreviewPage {
  page_number: number;
  url: string;
  title: string;
}

type Step = "characters" | "story" | "preview" | "generate";

// Category icons/emojis
const categoryIcons: Record<string, string> = {
  fantasy: "🐉",
  magical: "✨",
  sports: "🏆",
  adventure: "⛵",
  superhero: "🦸",
  space: "🚀",
};

const categoryColors: Record<string, string> = {
  fantasy: "from-purple-600 to-indigo-800",
  magical: "from-pink-500 to-purple-700",
  sports: "from-green-500 to-teal-700",
  adventure: "from-cyan-500 to-blue-700",
  superhero: "from-red-500 to-orange-600",
  space: "from-indigo-600 to-violet-800",
};

// Fallback images for stories by slug
const storyImages: Record<string, string> = {
  "dragon-castle-valley": "/images/the-dragon-of-castle-valley.jpg",
  "fairy-glade": "/images/the-fairy-glade.jpg",
  "grand-final-day": "/images/grand-final-day.jpg",
  "cloud-ship": "/images/captain-of-the-cloud-ship.jpg",
  "super-squad": "/images/the-super-squad-and-the-sorceress.jpg",
  "galaxy-road-trip": "/images/the-great-galaxy-road-trip.jpg",
  "the-dragon-of-castle-valley": "/images/the-dragon-of-castle-valley.jpg",
  "the-fairy-glade": "/images/the-fairy-glade.jpg",
  "captain-of-the-cloud-ship": "/images/captain-of-the-cloud-ship.jpg",
  "the-super-squad-and-the-sorceress": "/images/the-super-squad-and-the-sorceress.jpg",
  "the-great-galaxy-road-trip": "/images/the-great-galaxy-road-trip.jpg",
  "essendon-five": "/books/essendon-five/cover.png",
};

interface Story {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  category: string;
  page_count: number;
  is_featured?: boolean;
  cover_image_url?: string;
}

const artStyles = [
  { slug: "glow", name: "Enchanted glow", desc: "Rich painted light with golden sparkles", image: "/images/enchanted-glow.jpg" },
  { slug: "watercolour", name: "Watercolour dream", desc: "Soft washes and pastel skies", image: "/images/watercolour-dream.jpg" },
  { slug: "sketch", name: "Pencil sketch", desc: "Hand-drawn graphite on cream paper", image: "/images/pencil-sketch.jpg" },
  { slug: "papercut", name: "Paper-cut", desc: "Layered paper with depth and texture", image: "/images/paper-cut.jpg" },
  { slug: "anim", name: "3D animated", desc: "Cinematic Pixar-style rendering", image: "/images/3d-animated.jpg" },
  { slug: "silhouette", name: "Shadow silhouette", desc: "Bold silhouettes against sunset", image: "/images/shadow-silhouette.jpg" },
  { slug: "bricks", name: "Toy bricks", desc: "LEGO-style brick world", image: "/images/toy-bricks.jpg" },
];

// Step 5: Generate Full Book Component
interface Step5Props {
  bookId: string;
  storyTitle: string;
  characterCount: number;
  artStyleName: string;
  coverUrl?: string;
  onViewBook: (pages: PageStatus[]) => void;
}

function Step5GenerateBook({
  bookId,
  storyTitle,
  characterCount,
  artStyleName,
  coverUrl,
  onViewBook,
}: Step5Props) {
  const {
    pageStatuses,
    progress,
    isGenerating,
    hasInteriorPages,
    startGeneration,
    retryPage,
    error,
  } = useBookGeneration({
    bookId,
    onComplete: (book) => {
      console.log("Book generation complete:", book);
    },
  });

  const allComplete = progress.total > 0 && progress.completed === progress.total;

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-white mb-2">
          Generate Your Book
        </h1>
        <p className="text-lg text-text-muted">
          {isGenerating
            ? "Creating your personalized storybook pages..."
            : allComplete
            ? "Your book is ready!"
            : "Generate all interior pages with your characters"}
        </p>
      </div>

      {/* Book summary card */}
      <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl overflow-hidden max-w-xl mx-auto mb-8">
        <div className="flex items-start gap-4 p-5">
          {coverUrl && (
            <div className="w-24 h-32 rounded-xl overflow-hidden shrink-0">
              <img
                src={coverUrl}
                alt="Book cover"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-white mb-1 truncate">
              {storyTitle}
            </h2>
            <p className="text-text-muted text-sm mb-3">
              {characterCount} character{characterCount !== 1 && "s"} • {artStyleName} style
            </p>

            {!isGenerating && !allComplete && (
              <button
                onClick={startGeneration}
                className="bg-accent-gold text-brand-dark font-extrabold px-6 py-3 rounded-full hover:bg-accent-gold-light transition-colors flex items-center gap-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
                </svg>
                Generate Full Book
              </button>
            )}

            {allComplete && (
              <button
                onClick={() => onViewBook(pageStatuses)}
                className="bg-accent-gold text-brand-dark font-extrabold px-6 py-3 rounded-full hover:bg-accent-gold-light transition-colors flex items-center gap-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                View Complete Book
              </button>
            )}
          </div>
        </div>
      </div>

      {/* No interior pages message */}
      {!hasInteriorPages && pageStatuses.length > 0 && !isGenerating && (
        <div className="bg-brand-purple border border-accent-gold/30 rounded-2xl p-6 max-w-xl mx-auto text-center mb-8">
          <div className="text-4xl mb-3">🎨</div>
          <h3 className="text-xl font-bold text-white mb-2">Interior pages coming soon!</h3>
          <p className="text-text-muted">
            Our artists are still creating the interior page illustrations for this story.
            You&apos;ll be notified when they&apos;re ready!
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 max-w-xl mx-auto mb-8 text-red-300 text-sm text-center">
          {error}
        </div>
      )}

      {/* Progress bar */}
      {pageStatuses.length > 0 && hasInteriorPages && (
        <div className="max-w-xl mx-auto mb-8">
          <GenerationProgressBar
            completed={progress.completed}
            total={progress.total}
            failed={progress.failed}
            generating={progress.generating}
          />
        </div>
      )}

      {/* Page generation grid */}
      {pageStatuses.length > 0 && hasInteriorPages && (
        <div className="max-w-3xl mx-auto">
          <h3 className="text-lg font-bold text-white mb-4">
            Book Pages
          </h3>
          <PageGenerationGrid
            pageStatuses={pageStatuses}
            onRetry={retryPage}
          />
        </div>
      )}

      {/* Purchase options when complete */}
      {allComplete && (
        <div className="mt-12 pt-8 border-t border-brand-purple-muted max-w-3xl mx-auto">
          <h3 className="text-2xl font-black text-white mb-2 text-center">
            Ready to print?
          </h3>
          <p className="text-text-muted mb-8 text-center">
            Order a beautiful printed copy of your personalized book.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Digital */}
            <div className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-5 flex flex-col">
              <span className="text-accent-gold font-handwritten text-lg mb-1">Instant</span>
              <h4 className="text-xl font-black text-white mb-1">Digital</h4>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-black text-white">$14.20</span>
              </div>
              <button className="w-full mt-auto bg-brand-purple text-white font-bold py-2.5 rounded-full hover:bg-accent-gold hover:text-brand-dark transition-colors text-sm">
                Buy digital
              </button>
            </div>

            {/* Softcover */}
            <div className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-5 flex flex-col">
              <span className="text-accent-gold font-handwritten text-lg mb-1">Great value</span>
              <h4 className="text-xl font-black text-white mb-1">Softcover</h4>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-black text-white">$23</span>
                <span className="text-xs text-text-muted">+ shipping</span>
              </div>
              <button className="w-full mt-auto bg-brand-purple text-white font-bold py-2.5 rounded-full hover:bg-accent-gold hover:text-brand-dark transition-colors text-sm">
                Buy softcover
              </button>
            </div>

            {/* Hardcover */}
            <div className="bg-brand-purple border-2 border-accent-gold rounded-2xl p-5 flex flex-col relative">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent-gold text-brand-dark text-xs font-bold px-2.5 py-0.5 rounded-full">
                Most loved
              </div>
              <span className="text-accent-gold font-handwritten text-lg mb-1">Premium</span>
              <h4 className="text-xl font-black text-white mb-1">Hardcover</h4>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-black text-white">$34</span>
                <span className="text-xs text-text-muted">+ shipping</span>
              </div>
              <button className="w-full mt-auto bg-accent-gold text-brand-dark font-bold py-2.5 rounded-full hover:bg-accent-gold-light transition-colors text-sm">
                Buy hardcover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreatePageInner() {
  const searchParams = useSearchParams();
  const resumeBookId = searchParams.get("book");

  const [currentStep, setCurrentStep] = useState<Step>("characters");
  const [resumingBook, setResumingBook] = useState(false);

  // Existing characters from database
  const [existingCharacters, setExistingCharacters] = useState<Character[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set());
  const [loadingCharacters, setLoadingCharacters] = useState(true);

  // Editing existing characters
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingAge, setEditingAge] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<string>("");

  // Character generation state
  const [generatingCharacterId, setGeneratingCharacterId] = useState<string | null>(null);

  // New characters being added
  const [pendingCharacters, setPendingCharacters] = useState<PendingCharacter[]>([]);

  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>("glow");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Book preview state
  const [previewPages, setPreviewPages] = useState<PreviewPage[]>([]);
  const [generatingBook, setGeneratingBook] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showBookViewer, setShowBookViewer] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  // Stories from API
  const [stories, setStories] = useState<Story[]>([]);
  const [blueprints, setBlueprints] = useState<Array<{
    bookId: string;
    title: string;
    coverImage: string | null;
    format: string;
    pageCount: number;
  }>>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [previewStory, setPreviewStory] = useState<Story | null>(null);
  const [isStoryFilterSticky, setIsStoryFilterSticky] = useState(false);
  const storyFilterRef = useRef<HTMLDivElement>(null);
  const storyFilterPlaceholderRef = useRef<HTMLDivElement>(null);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const supabase = createClient();

  // Token state
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [showTokenConfirm, setShowTokenConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: "character" | "book";
    characterId?: string;
    characterObj?: Character;
  } | null>(null);

  // Flip state - tracks which cards show the original photo
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  // Regeneration feedback state
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerateFeedback, setRegenerateFeedback] = useState("");
  const [characterToRegenerate, setCharacterToRegenerate] = useState<Character | null>(null);
  const [regenHairColor, setRegenHairColor] = useState("");
  const [regenEyeColor, setRegenEyeColor] = useState("");
  const [regenSkinTone, setRegenSkinTone] = useState("");

  // Identity confirmation state
  const [showIdentityConfirmModal, setShowIdentityConfirmModal] = useState(false);
  const [characterForIdentityConfirm, setCharacterForIdentityConfirm] = useState<Character | null>(null);
  const [extractedIdentityProfile, setExtractedIdentityProfile] = useState<IdentityProfile | null>(null);
  const [analyzingCharacterId, setAnalyzingCharacterId] = useState<string | null>(null);

  // Step 5: Full book generation state
  const [currentBookId, setCurrentBookId] = useState<string | null>(null);
  const [coverApproved, setCoverApproved] = useState(false);
  const [approvingCover, setApprovingCover] = useState(false);

  // Fetch tokens
  const fetchTokens = async () => {
    try {
      const res = await fetch("/api/tokens");
      if (res.ok) {
        const data = await res.json();
        setTokenBalance(data.tokens || 0);
      }
    } catch {
      // Ignore errors
    }
  };

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === "granted";
    }
    return false;
  };

  // Send browser notification
  const sendNotification = (title: string, body: string) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const notification = new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  // Handle minimize - go back to step 1 but keep generating in background
  const handleMinimizeGeneration = async () => {
    // Request permission if not granted
    if (notificationPermission !== "granted") {
      await requestNotificationPermission();
    }
    setIsMinimized(true);
    setCurrentStep("characters"); // Go back to characters step
  };

  // Fetch stories and blueprints
  useEffect(() => {
    async function fetchStories() {
      setLoadingStories(true);
      try {
        const [storiesRes, blueprintsRes] = await Promise.all([
          fetch("/api/stories"),
          fetch("/api/blueprints"),
        ]);

        if (storiesRes.ok) {
          const data = await storiesRes.json();
          setStories(data.stories || []);
        }

        if (blueprintsRes.ok) {
          const data = await blueprintsRes.json();
          setBlueprints(data.books || []);
        }
      } catch (error) {
        console.error("Failed to fetch stories:", error);
      }
      setLoadingStories(false);
    }
    fetchStories();
  }, []);

  // Handle sticky filter for story selection
  useEffect(() => {
    if (currentStep !== "story") return;
    const handleScroll = () => {
      if (storyFilterPlaceholderRef.current) {
        const rect = storyFilterPlaceholderRef.current.getBoundingClientRect();
        setIsStoryFilterSticky(rect.top <= 72);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [currentStep]);

  // Fetch user and characters on mount
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch existing characters
        const res = await fetch("/api/characters");
        if (res.ok) {
          const data = await res.json();
          setExistingCharacters(data.characters || []);
        }
        // Fetch tokens
        fetchTokens();
      }
      setLoadingCharacters(false);
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setShowLoginPrompt(false);
        // Refetch characters when user logs in
        const res = await fetch("/api/characters");
        if (res.ok) {
          const data = await res.json();
          setExistingCharacters(data.characters || []);
        }
        // Fetch tokens
        fetchTokens();
      } else {
        setExistingCharacters([]);
        setSelectedCharacterIds(new Set());
        setTokenBalance(0);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Resume book from query param
  useEffect(() => {
    if (!resumeBookId || !user) return;

    async function resumeBook() {
      setResumingBook(true);
      try {
        const res = await fetch(`/api/books/${resumeBookId}`);
        if (!res.ok) {
          console.error("Failed to fetch book for resume");
          setResumingBook(false);
          return;
        }

        const { book } = await res.json();
        if (!book) {
          setResumingBook(false);
          return;
        }

        // Set book ID
        setCurrentBookId(book.id);

        // Set selected characters from snapshot or metadata
        if (book.characters_snapshot && Array.isArray(book.characters_snapshot)) {
          const charIds = new Set<string>(book.characters_snapshot.map((c: { id: string }) => c.id));
          setSelectedCharacterIds(charIds);
        } else if (book.metadata?.characterIds && Array.isArray(book.metadata.characterIds)) {
          setSelectedCharacterIds(new Set<string>(book.metadata.characterIds as string[]));
        }

        // Set story selection
        if (book.metadata?.bookId || book.metadata?.storySlug) {
          setSelectedStory(book.metadata.bookId || book.metadata.storySlug);
        }

        // Set art style
        if (book.metadata?.artStyle) {
          setSelectedStyle(book.metadata.artStyle);
        }

        // Set preview pages if available
        if (book.preview_pages && book.preview_pages.length > 0) {
          setPreviewPages(book.preview_pages);
          setShowBookViewer(true);
        }

        // Jump to appropriate step based on book status
        if (book.status === "completed" || book.status === "purchased") {
          setCurrentStep("generate");
          setCoverApproved(true);
        } else if (book.status === "generating_full") {
          setCurrentStep("generate");
          setCoverApproved(true);
        } else if (book.status === "cover_approved") {
          setCurrentStep("generate");
          setCoverApproved(true);
        } else if (book.status === "preview_ready") {
          setCurrentStep("preview");
        } else if (book.metadata?.storySlug || book.metadata?.bookId) {
          // Story selected, go to preview step (style step removed)
          setCurrentStep("preview");
        }

        setResumingBook(false);
      } catch (error) {
        console.error("Error resuming book:", error);
        setResumingBook(false);
      }
    }

    resumeBook();
  }, [resumeBookId, user]);

  const steps: { key: Step; label: string; number: number }[] = [
    { key: "characters", label: "Add characters", number: 1 },
    { key: "story", label: "Choose adventure", number: 2 },
    { key: "preview", label: "Preview cover", number: 3 },
    { key: "generate", label: "Generate book", number: 4 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  // Toggle character selection (max 5 characters)
  const toggleCharacterSelection = (id: string) => {
    setSelectedCharacterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // Max 5 characters per book
        if (next.size >= 5) {
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  // Start editing a character
  const startEditingCharacter = (char: Character, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCharacterId(char.id);
    setEditingName(char.name);
    setEditingAge(char.age ?? null);
    setEditingType(char.character_type || "person");
  };

  // Save character edit
  const saveCharacterEdit = async () => {
    if (!editingCharacterId || !editingName.trim()) return;

    try {
      const res = await fetch(`/api/characters/${editingCharacterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingName.trim(),
          age: editingAge,
          character_type: editingType,
        }),
      });

      if (res.ok) {
        setExistingCharacters((prev) =>
          prev.map((c) =>
            c.id === editingCharacterId
              ? { ...c, name: editingName.trim(), age: editingAge ?? undefined, character_type: editingType as "person" | "pet" | "other" }
              : c
          )
        );
      }
    } catch (error) {
      console.error("Failed to update character:", error);
    }

    setEditingCharacterId(null);
    setEditingName("");
    setEditingAge(null);
    setEditingType("");
  };

  // Delete a character
  const deleteCharacter = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this character?")) return;

    try {
      const res = await fetch(`/api/characters/${id}`, { method: "DELETE" });
      if (res.ok) {
        setExistingCharacters((prev) => prev.filter((c) => c.id !== id));
        setSelectedCharacterIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (error) {
      console.error("Failed to delete character:", error);
    }
  };

  // Toggle flip state for a card
  const toggleFlip = (charId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(charId)) {
        next.delete(charId);
      } else {
        next.add(charId);
      }
      return next;
    });
  };

  // Open regenerate modal with feedback input
  const openRegenerateModal = (char: Character, e: React.MouseEvent) => {
    e.stopPropagation();
    if (generatingCharacterId) return;
    setCharacterToRegenerate(char);
    setRegenerateFeedback("");
    // Pre-fill from identity profile if available
    const profile = char.identity_profile;
    setRegenHairColor(profile?.hair?.color || "");
    setRegenEyeColor(profile?.eyes?.color || "");
    setRegenSkinTone(profile?.skinTone || "");
    setShowRegenerateModal(true);
  };

  // Submit regeneration with feedback
  const submitRegenerate = async () => {
    if (!characterToRegenerate) return;

    // Build combined feedback from selections and text
    const feedbackParts: string[] = [];
    if (regenHairColor) feedbackParts.push(`Hair color: ${regenHairColor}`);
    if (regenEyeColor) feedbackParts.push(`Eye color: ${regenEyeColor}`);
    if (regenSkinTone) feedbackParts.push(`Skin tone: ${regenSkinTone}`);
    if (regenerateFeedback.trim()) feedbackParts.push(regenerateFeedback.trim());

    const combinedFeedback = feedbackParts.join(". ");
    setRegenerateFeedback(combinedFeedback);

    // Also update the identity profile if attributes were changed
    if (regenHairColor || regenEyeColor || regenSkinTone) {
      const currentProfile = characterToRegenerate.identity_profile;
      const updatedProfile = {
        version: (currentProfile?.version || 0) + 1,
        extractedAt: currentProfile?.extractedAt || new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        hair: {
          color: regenHairColor || currentProfile?.hair?.color || "",
          style: currentProfile?.hair?.style || "",
          texture: currentProfile?.hair?.texture,
          length: currentProfile?.hair?.length,
        },
        eyes: {
          color: regenEyeColor || currentProfile?.eyes?.color || "",
          shape: currentProfile?.eyes?.shape,
        },
        skinTone: regenSkinTone || currentProfile?.skinTone || "",
        faceShape: currentProfile?.faceShape,
        distinctiveFeatures: currentProfile?.distinctiveFeatures || [],
        uncertainAttributes: [],
      };

      // Save updated profile
      await fetch(`/api/characters/${characterToRegenerate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity_profile: updatedProfile,
          identity_confirmed: true,
        }),
      });

      // Update local state
      setExistingCharacters((prev) =>
        prev.map((c) =>
          c.id === characterToRegenerate.id
            ? { ...c, identity_profile: updatedProfile, identity_confirmed: true }
            : c
        )
      );
    }

    setShowRegenerateModal(false);
    setPendingAction({ type: "character", characterId: characterToRegenerate.id, characterObj: characterToRegenerate });
    setShowTokenConfirm(true);
  };

  // Request to generate caricature (shows confirmation first)
  const requestGenerateCaricature = (char: Character) => {
    if (generatingCharacterId) return; // Already generating

    // Show confirmation modal
    setPendingAction({ type: "character", characterId: char.id, characterObj: char });
    setShowTokenConfirm(true);
  };

  // Actually generate caricature after confirmation
  const generateCaricature = async (charId: string, feedback?: string) => {
    setGeneratingCharacterId(charId);

    // Update local state to show generating
    setExistingCharacters((prev) =>
      prev.map((c) => (c.id === charId ? { ...c, generation_status: "generating" } : c))
    );

    try {
      const res = await fetch(`/api/characters/${charId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artStyle: selectedStyle,
          feedback: feedback || undefined,
        }),
      });

      if (res.ok) {
        const { character: updatedChar, tokensRemaining } = await res.json();
        setExistingCharacters((prev) =>
          prev.map((c) => (c.id === charId ? updatedChar : c))
        );
        setTokenBalance(tokensRemaining);
      } else {
        const error = await res.json();
        alert(`Failed to generate: ${error.error || error.message || "Unknown error"}`);
        setExistingCharacters((prev) =>
          prev.map((c) => (c.id === charId ? { ...c, generation_status: "failed" } : c))
        );
      }
    } catch (error) {
      console.error("Failed to generate caricature:", error);
      alert("Failed to generate caricature. Please try again.");
      setExistingCharacters((prev) =>
        prev.map((c) => (c.id === charId ? { ...c, generation_status: "failed" } : c))
      );
    }

    setGeneratingCharacterId(null);
    setCharacterToRegenerate(null);
    setRegenerateFeedback("");
  };

  // Analyze photo for identity profile, then show confirmation modal
  const analyzeAndGenerate = async (char: Character) => {
    // Start identity analysis
    setAnalyzingCharacterId(char.id);
    setCharacterForIdentityConfirm(char);
    setShowIdentityConfirmModal(true);

    try {
      const res = await fetch(`/api/characters/${char.id}/analyze`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setExtractedIdentityProfile(data.identityProfile);
        // Update character in list with new identity data
        if (data.character) {
          setExistingCharacters((prev) =>
            prev.map((c) => (c.id === char.id ? data.character : c))
          );
        }
      } else {
        // Analysis failed - still show modal but with no profile
        console.error("Identity analysis failed");
        setExtractedIdentityProfile(null);
      }
    } catch (error) {
      console.error("Identity analysis error:", error);
      setExtractedIdentityProfile(null);
    }

    setAnalyzingCharacterId(null);
  };

  // Handle identity profile confirmation
  const handleIdentityConfirm = async (profile: IdentityProfile) => {
    if (!characterForIdentityConfirm) return;

    // Save confirmed profile
    try {
      await fetch(`/api/characters/${characterForIdentityConfirm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity_profile: profile,
          identity_confirmed: true,
        }),
      });

      // Update local state
      setExistingCharacters((prev) =>
        prev.map((c) =>
          c.id === characterForIdentityConfirm.id
            ? { ...c, identity_profile: profile, identity_confirmed: true }
            : c
        )
      );
    } catch (error) {
      console.error("Failed to save identity profile:", error);
    }

    // Close modal and trigger generation
    setShowIdentityConfirmModal(false);
    requestGenerateCaricature(characterForIdentityConfirm);
    setCharacterForIdentityConfirm(null);
    setExtractedIdentityProfile(null);
  };

  // Handle identity skip (proceed without confirmed profile)
  const handleIdentitySkip = () => {
    if (!characterForIdentityConfirm) return;
    setShowIdentityConfirmModal(false);
    requestGenerateCaricature(characterForIdentityConfirm);
    setCharacterForIdentityConfirm(null);
    setExtractedIdentityProfile(null);
  };

  // Close identity modal without proceeding
  const handleIdentityClose = () => {
    setShowIdentityConfirmModal(false);
    setCharacterForIdentityConfirm(null);
    setExtractedIdentityProfile(null);
    setAnalyzingCharacterId(null);
  };

  // Handle confirmation
  const handleConfirmGeneration = async () => {
    if (!pendingAction) return;

    setShowTokenConfirm(false);

    if (pendingAction.type === "character" && pendingAction.characterId) {
      await generateCaricature(pendingAction.characterId, regenerateFeedback || undefined);
    } else if (pendingAction.type === "book") {
      await actuallyGenerateBookPreview();
    }

    setPendingAction(null);
  };

  // Add photo to pending characters
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setPendingCharacters((prev) => [
          ...prev,
          {
            id: pendingId,
            name: "",
            photoBase64: base64,
            characterType: "person",
            petType: "",
            customType: "",
            age: null,
            height_cm: null,
            saving: false,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );

      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          setPendingCharacters((prev) => [
            ...prev,
            {
              id: pendingId,
              name: "",
              photoBase64: base64,
              characterType: "person",
              petType: "",
              customType: "",
              age: null,
              height_cm: null,
              saving: false,
            },
          ]);
        };
        reader.readAsDataURL(file);
      });
    },
    []
  );

  // Update pending character fields
  function updatePending(id: string, updates: Partial<PendingCharacter>) {
    setPendingCharacters((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }

  // Remove pending character
  function removePending(id: string) {
    setPendingCharacters((prev) => prev.filter((p) => p.id !== id));
  }

  // Get the first pending character for the modal
  const currentPendingCharacter = pendingCharacters.length > 0 ? pendingCharacters[0] : null;
  const remainingPendingCount = pendingCharacters.length > 1 ? pendingCharacters.length - 1 : 0;

  // Save pending character to database
  async function savePendingCharacter(pending: PendingCharacter) {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    setPendingCharacters((prev) =>
      prev.map((p) => (p.id === pending.id ? { ...p, saving: true } : p))
    );

    let petTypeToSave: string | undefined;
    if (pending.characterType === "pet") {
      petTypeToSave = pending.petType;
    } else if (pending.characterType === "other") {
      petTypeToSave = pending.customType.trim();
    }

    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pending.name.trim(),
          photoBase64: pending.photoBase64,
          characterType: pending.characterType,
          petType: petTypeToSave,
          age: pending.age,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newChar = data.character;
        // Add to existing characters and auto-select
        setExistingCharacters((prev) => [newChar, ...prev]);
        setSelectedCharacterIds((prev) => new Set([...prev, newChar.id]));
        setPendingCharacters((prev) => prev.filter((p) => p.id !== pending.id));

        // Trigger identity analysis then generation flow
        analyzeAndGenerate(newChar);
      } else {
        setPendingCharacters((prev) =>
          prev.map((p) => (p.id === pending.id ? { ...p, saving: false } : p))
        );
      }
    } catch (error) {
      console.error("Failed to save character:", error);
      setPendingCharacters((prev) =>
        prev.map((p) => (p.id === pending.id ? { ...p, saving: false } : p))
      );
    }
  }

  // Get selected characters for the story
  const selectedCharacters = existingCharacters.filter((c) =>
    selectedCharacterIds.has(c.id)
  );

  // Helper to generate placeholder image URL
  const getPlaceholderUrl = (text: string) => {
    return `/api/placeholder/900/900?text=${encodeURIComponent(text)}`;
  };

  // Story cover titles for demo
  const storyCoverTitles: Record<string, string> = {
    "dragon-castle-valley": "The Dragon of Castle Valley",
    "fairy-glade": "The Fairy Glade",
    "grand-final-day": "Grand Final Day",
    "cloud-ship": "Captain of the Cloud Ship",
    "super-squad": "The Super Squad",
    "galaxy-road-trip": "The Great Galaxy Road Trip",
  };

  // Request book preview (shows confirmation first)
  const generateBookPreview = () => {
    if (!selectedStory) return;

    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    // Show confirmation modal
    setPendingAction({ type: "book" });
    setShowTokenConfirm(true);
  };

  // Actually generate book preview after confirmation
  const actuallyGenerateBookPreview = async () => {
    setGeneratingBook(true);
    setBookError(null);
    setGenerationProgress(0);
    setGenerationStartTime(Date.now());
    setIsMinimized(false);
    setShowNotification(false);

    try {
      // First, check if all selected characters have illustrations
      const charsWithoutIllustrations = selectedCharacters.filter(c => !c.generated_image_url);
      if (charsWithoutIllustrations.length > 0) {
        const names = charsWithoutIllustrations.map(c => c.name).join(", ");
        throw new Error(`Characters need illustrations first: ${names}`);
      }

      if (selectedCharacters.length === 0) {
        throw new Error("Please select at least one character");
      }

      const response = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storySlug: selectedStory,
          artStyle: selectedStyle,
          characterIds: selectedCharacters.map((c) => c.id),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to create book");
      }

      const { book } = await response.json();
      setCurrentBookId(book.id);
      setGenerationProgress(10);

      const genResponse = await fetch(`/api/books/${book.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storySlug: selectedStory,
          artStyle: selectedStyle,
          characterIds: selectedCharacters.map((c) => c.id),
        }),
      });

      if (!genResponse.ok) {
        const errorData = await genResponse.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Failed to generate cover");
      }

      const { pages, tokensRemaining } = await genResponse.json();
      setPreviewPages(pages);
      setGenerationProgress(100);
      setTokenBalance(tokensRemaining);

      // If minimized, show notification and banner
      if (isMinimized) {
        sendNotification(
          "Your cover is ready!",
          "Your personalized storybook cover has been created. Tap to view it."
        );
        setShowNotification(true);
        // Don't auto-show book viewer when minimized - let user click notification
      } else {
        setShowBookViewer(true);
      }
    } catch (error) {
      console.error("Book generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Generation failed";
      setBookError(errorMessage);

      // Send error notification if minimized
      if (isMinimized) {
        sendNotification(
          "Generation failed",
          errorMessage
        );
      }
    }

    setGeneratingBook(false);
    setGenerationStartTime(null);
  };

  const simulateDemoGeneration = async () => {
    setGenerationProgress(50);
    await new Promise((r) => setTimeout(r, 1500));
    setGenerationProgress(100);

    const title = storyCoverTitles[selectedStory || "dragon-castle-valley"] || "Your Story";
    const coverPage: PreviewPage = {
      page_number: 0,
      url: getPlaceholderUrl(title),
      title: title,
    };
    setPreviewPages([coverPage]);
    setShowBookViewer(true);
  };

  const canProceed = () => {
    switch (currentStep) {
      case "characters":
        return selectedCharacterIds.size > 0;
      case "story":
        return selectedStory !== null;
      case "preview":
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].key);
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      {/* Notification banner - shows when cover is ready after minimizing */}
      {showNotification && previewPages.length > 0 && (
        <div className="bg-gradient-to-r from-accent-gold to-accent-teal">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <div>
                <p className="font-bold text-brand-dark">Your cover page is ready!</p>
                <p className="text-brand-dark/70 text-sm">Click to view your personalized illustration</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowNotification(false);
                  setCurrentStep("preview");
                  setShowBookViewer(true);
                  setIsMinimized(false);
                }}
                className="px-5 py-2 bg-brand-dark text-white font-bold rounded-full hover:bg-brand-purple transition-colors"
              >
                View Cover
              </button>
              <button
                onClick={() => setShowNotification(false)}
                className="p-2 text-brand-dark/60 hover:text-brand-dark transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background generation indicator - shows when minimized but still generating */}
      {generatingBook && isMinimized && (
        <div className="bg-brand-purple border-b border-accent-gold/30">
          <div className="max-w-4xl mx-auto px-6 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
              <p className="text-white text-sm">
                <span className="font-bold">Creating your cover page...</span>
                <span className="text-text-muted ml-2">You&apos;ll be notified when ready</span>
              </p>
            </div>
            <button
              onClick={() => {
                setIsMinimized(false);
                setCurrentStep("preview");
              }}
              className="text-accent-gold text-sm font-bold hover:underline"
            >
              View progress
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-brand-purple border-b border-brand-purple-muted">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center">
                <button
                  onClick={() =>
                    i <= currentStepIndex && setCurrentStep(step.key)
                  }
                  disabled={i > currentStepIndex}
                  className={`flex items-center gap-3 ${
                    i <= currentStepIndex
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-50"
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === currentStepIndex
                        ? "bg-accent-gold text-brand-dark"
                        : i < currentStepIndex
                        ? "bg-accent-teal text-white"
                        : "bg-brand-purple-muted text-text-muted"
                    }`}
                  >
                    {i < currentStepIndex ? "✓" : step.number}
                  </span>
                  <span
                    className={`hidden sm:block text-sm font-bold ${
                      i === currentStepIndex ? "text-white" : "text-text-muted"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
                {i < steps.length - 1 && (
                  <div
                    className={`hidden sm:block w-16 h-0.5 mx-4 ${
                      i < currentStepIndex
                        ? "bg-accent-teal"
                        : "bg-brand-purple-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Add Characters */}
          {currentStep === "characters" && (
            <div>
              <div className="mb-8">
                <h1 className="text-4xl font-black text-white mb-2">
                  Choose your characters
                </h1>
                <p className="text-lg text-text-muted">
                  Select up to 5 characters for your story. Each character needs an illustration.
                </p>
                {selectedCharacterIds.size > 0 && (
                  <p className="text-sm text-accent-gold mt-2 font-bold">
                    {selectedCharacterIds.size}/5 characters selected
                  </p>
                )}
              </div>

              {/* Existing Characters Section */}
              {user && existingCharacters.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-4">
                    Your characters ({selectedCharacterIds.size} selected)
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {existingCharacters.map((char) => {
                      const isSelected = selectedCharacterIds.has(char.id);
                      const isEditing = editingCharacterId === char.id;
                      const isGenerating = generatingCharacterId === char.id || char.generation_status === "generating";
                      const hasGeneratedImage = !!char.generated_image_url;
                      const isFlipped = flippedCards.has(char.id);

                      return (
                        <div
                          key={char.id}
                          className={`relative bg-brand-purple-light border-2 rounded-2xl overflow-hidden transition-all ${
                            isSelected
                              ? "border-accent-gold ring-2 ring-accent-gold"
                              : "border-brand-purple-muted hover:border-accent-gold/50"
                          }`}
                        >
                          {/* Clickable image area for selection */}
                          <button
                            onClick={() => toggleCharacterSelection(char.id)}
                            className="w-full bg-brand-dark aspect-square relative"
                          >
                            {isGenerating ? (
                              // Generating state
                              <div className="w-full h-full flex flex-col items-center justify-center">
                                <div className="w-10 h-10 border-3 border-accent-gold border-t-transparent rounded-full animate-spin mb-2" />
                                <p className="text-white font-bold text-sm">Creating...</p>
                              </div>
                            ) : hasGeneratedImage ? (
                              // Show caricature by default, original when flipped
                              <>
                                <img
                                  src={isFlipped ? char.original_photo_url : char.generated_image_url!}
                                  alt={`${char.name} - ${isFlipped ? "Original" : "Illustrated"}`}
                                  className="w-full h-full object-cover"
                                />
                                {/* Label */}
                                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-[10px] text-white font-medium">
                                  {isFlipped ? "Original" : "Illustrated"}
                                </div>
                              </>
                            ) : (
                              // No generated image - show original with pending message
                              <>
                                <img
                                  src={char.original_photo_url}
                                  alt={char.name}
                                  className="w-full h-full object-cover opacity-60"
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                                  <p className="text-white font-bold text-sm">Illustration pending</p>
                                </div>
                              </>
                            )}
                          </button>

                          {/* Flip button (only when has generated image) */}
                          {hasGeneratedImage && !isGenerating && (
                            <button
                              onClick={(e) => toggleFlip(char.id, e)}
                              className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center transition-colors z-10"
                              title={isFlipped ? "Show illustration" : "Show original"}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 1l4 4-4 4" />
                                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                                <path d="M7 23l-4-4 4-4" />
                                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                              </svg>
                            </button>
                          )}

                          {/* Regenerate button (only when has generated image) */}
                          {hasGeneratedImage && !isGenerating && (
                            <button
                              onClick={(e) => openRegenerateModal(char, e)}
                              className="absolute top-2 right-10 w-7 h-7 rounded-full bg-black/60 text-accent-gold hover:bg-accent-gold hover:text-brand-dark flex items-center justify-center transition-colors z-10"
                              title="Regenerate with changes"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 4v6h6M23 20v-6h-6" />
                                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                              </svg>
                            </button>
                          )}

                          {/* Selected checkmark */}
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-accent-gold flex items-center justify-center pointer-events-none z-10">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14163A" strokeWidth="3">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </div>
                          )}

                          {/* Name and controls */}
                          <div className="p-3">
                            {isEditing ? (
                              <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  placeholder="Name"
                                  className="w-full px-2 py-1.5 rounded bg-brand-dark border border-brand-purple-muted text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent-gold"
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    value={editingAge ?? ""}
                                    onChange={(e) => setEditingAge(e.target.value ? parseInt(e.target.value) : null)}
                                    placeholder="Age"
                                    min="0"
                                    max="120"
                                    className="w-16 px-2 py-1.5 rounded bg-brand-dark border border-brand-purple-muted text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent-gold"
                                  />
                                  <select
                                    value={editingType}
                                    onChange={(e) => setEditingType(e.target.value)}
                                    className="flex-1 px-2 py-1.5 rounded bg-brand-dark border border-brand-purple-muted text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent-gold"
                                  >
                                    <option value="person">Person</option>
                                    <option value="pet">Pet</option>
                                    <option value="other">Other</option>
                                  </select>
                                </div>
                                <div className="flex gap-1 pt-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCharacterId(null);
                                    }}
                                    className="flex-1 py-1.5 rounded text-xs font-bold text-text-muted hover:text-white border border-brand-purple-muted"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      saveCharacterEdit();
                                    }}
                                    className="flex-1 py-1.5 rounded text-xs font-bold bg-accent-gold text-brand-dark hover:bg-accent-gold-light"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-1">
                                <div className="min-w-0 flex-1">
                                  <p className="text-white font-bold text-sm truncate">{char.name}</p>
                                  <p className="text-xs text-text-muted">
                                    {char.age ? `${char.age} · ` : ""}<span className="capitalize">{char.pet_type || char.character_type}</span>
                                  </p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={(e) => startEditingCharacter(char, e)}
                                    className="w-6 h-6 rounded-full bg-brand-dark text-text-muted hover:text-white flex items-center justify-center"
                                    title="Edit"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => deleteCharacter(char.id, e)}
                                    className="w-6 h-6 rounded-full bg-brand-dark text-text-muted hover:text-red-400 flex items-center justify-center"
                                    title="Delete"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add New Characters Section */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4">
                  {existingCharacters.length > 0 ? "Add new characters" : "Add characters"}
                </h2>

                {/* Upload area */}
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer block hover:border-accent-gold ${
                    dragOver
                      ? "border-accent-gold bg-accent-gold/10"
                      : "border-brand-purple-muted"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="w-16 h-16 rounded-full bg-brand-purple-muted mx-auto mb-3 flex items-center justify-center">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#F4C95D"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                  <p className="text-white font-bold mb-1">
                    Add new character
                  </p>
                  <p className="text-text-muted text-sm">
                    Upload a clear, front-facing photo
                  </p>
                </label>

              </div>

              {/* Login prompt for non-logged in users */}
              {!user && !loadingCharacters && (
                <div className="bg-brand-purple border border-brand-purple-muted rounded-2xl p-6 text-center">
                  <p className="text-text-muted mb-4">
                    Sign in to access your saved characters or create new ones.
                  </p>
                  <Link
                    href="/login?redirect=/create"
                    className="inline-block bg-accent-gold text-brand-dark font-bold px-6 py-3 rounded-full hover:bg-accent-gold-light transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
              )}

              {/* Loading state */}
              {loadingCharacters && (
                <div className="text-center py-8">
                  <div className="w-10 h-10 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-text-muted">Loading characters...</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Choose Story */}
          {currentStep === "story" && (
            <div>
              {/* Header */}
              <div className="text-center mb-10">
                <h1 className="text-4xl font-black text-white mb-3">
                  Choose your adventure
                </h1>
                <p className="text-lg text-text-muted max-w-2xl mx-auto">
                  Pick a world for your characters to explore. Each adventure has unique settings and stories waiting to be told.
                </p>
              </div>

              {/* Filter placeholder (maintains layout when filter becomes sticky) */}
              <div ref={storyFilterPlaceholderRef} className={isStoryFilterSticky ? "h-14" : ""} />

              {/* Category filter dropdown - sticky */}
              {(() => {
                // Combine stories and blueprints
                const prioritySlugs = ["essendon-five"];
                const allStories: (Story & { format?: string })[] = [
                  // Add V2 blueprints as stories
                  ...blueprints
                    .filter((b) => !stories.some((s) => s.slug === b.bookId))
                    .map((b) => ({
                      id: b.bookId,
                      slug: b.bookId,
                      title: b.title,
                      tagline: `A premium ${b.format.toUpperCase()} adventure with ${b.pageCount} pages`,
                      category: b.bookId === "essendon-five" ? "sports" : "fantasy",
                      page_count: b.pageCount,
                      cover_image_url: b.coverImage,
                      is_featured: true,
                      format: b.format,
                    } as Story & { format?: string })),
                  ...stories,
                ].sort((a, b) => {
                  const aIsPriority = prioritySlugs.includes(a.slug);
                  const bIsPriority = prioritySlugs.includes(b.slug);
                  if (aIsPriority && !bIsPriority) return -1;
                  if (!aIsPriority && bIsPriority) return 1;
                  if (a.is_featured && !b.is_featured) return -1;
                  if (!a.is_featured && b.is_featured) return 1;
                  return 0;
                });

                const categories = [...new Set(allStories.map((s) => s.category).filter(Boolean))];
                const filteredStories = selectedCategory
                  ? allStories.filter((s) => s.category === selectedCategory)
                  : allStories;
                const featuredStories = filteredStories.filter((s) => s.is_featured);
                const otherStories = filteredStories.filter((s) => !s.is_featured);

                const selectedCategoryLabel = selectedCategory
                  ? `${categoryIcons[selectedCategory] || "📖"} ${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}`
                  : "All worlds";

                return (
                  <>
                    <div
                      ref={storyFilterRef}
                      className={`${
                        isStoryFilterSticky
                          ? "fixed top-[72px] left-0 right-0 z-40 bg-brand-dark/95 backdrop-blur-md border-b border-brand-purple-muted py-3 px-6"
                          : "mb-10"
                      } transition-all`}
                    >
                      <div className={isStoryFilterSticky ? "max-w-5xl mx-auto" : ""}>
                        <div className="relative inline-block">
                          <button
                            onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                            className="flex items-center gap-3 px-5 py-3 bg-brand-purple-light text-white font-bold rounded-full border border-brand-purple-muted hover:border-accent-gold transition-colors"
                          >
                            <span>{selectedCategoryLabel}</span>
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className={`transition-transform ${categoryDropdownOpen ? "rotate-180" : ""}`}
                            >
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>

                          {/* Dropdown menu */}
                          {categoryDropdownOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setCategoryDropdownOpen(false)}
                              />
                              <div className="absolute top-full left-0 mt-2 z-50 bg-brand-purple-light border border-brand-purple-muted rounded-2xl shadow-xl overflow-hidden min-w-[200px]">
                                <button
                                  onClick={() => {
                                    setSelectedCategory(null);
                                    setCategoryDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-5 py-3 font-bold transition-colors flex items-center gap-2 ${
                                    selectedCategory === null
                                      ? "bg-accent-gold text-brand-dark"
                                      : "text-white hover:bg-brand-purple"
                                  }`}
                                >
                                  All worlds
                                </button>
                                {categories.map((cat) => (
                                  <button
                                    key={cat}
                                    onClick={() => {
                                      setSelectedCategory(cat === selectedCategory ? null : cat!);
                                      setCategoryDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-5 py-3 font-bold transition-colors flex items-center gap-2 ${
                                      selectedCategory === cat
                                        ? "bg-accent-gold text-brand-dark"
                                        : "text-white hover:bg-brand-purple"
                                    }`}
                                  >
                                    <span>{categoryIcons[cat!] || "📖"}</span>
                                    <span className="capitalize">{cat}</span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Show count */}
                        <span className="ml-4 text-text-muted text-sm">
                          {filteredStories.length} {filteredStories.length === 1 ? "story" : "stories"}
                        </span>
                      </div>
                    </div>

                    {loadingStories ? (
                      <div className="text-center py-20">
                        <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-text-muted">Loading story worlds...</p>
                      </div>
                    ) : (
                      <>
                        {/* Featured stories */}
                        {featuredStories.length > 0 && (
                          <div className="mb-10">
                            <h2 className="text-xl font-black text-white mb-5 flex items-center gap-2">
                              <span className="text-accent-gold">★</span> Featured Adventures
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {featuredStories.map((story) => {
                                const isSelected = selectedStory === story.slug;
                                const gradient = categoryColors[story.category || ""] || "from-purple-600 to-indigo-800";
                                const icon = categoryIcons[story.category || ""] || "📖";
                                const imageUrl = story.cover_image_url || storyImages[story.slug] || null;

                                return (
                                  <div key={story.slug} className="group relative">
                                    <button
                                      onClick={() => setSelectedStory(story.slug)}
                                      className={`block w-full text-left transition-all ${
                                        isSelected ? "ring-4 ring-accent-gold rounded-3xl" : ""
                                      }`}
                                    >
                                      <div className="relative rounded-3xl overflow-hidden ring-2 ring-accent-gold">
                                        <div className={`aspect-[4/3] bg-gradient-to-br ${gradient} relative`}>
                                          {imageUrl ? (
                                            <img src={imageUrl} alt={story.title} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                              <span className="text-8xl opacity-50">{icon}</span>
                                            </div>
                                          )}
                                          <div className={`absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                                            <span className={`bg-accent-gold text-brand-dark font-extrabold px-6 py-3 rounded-full transform transition-transform ${isSelected ? "scale-100" : "scale-90 group-hover:scale-100"}`}>
                                              {isSelected ? "✓ Selected" : "Select this world"}
                                            </span>
                                          </div>
                                          <div className="absolute top-4 right-14 bg-accent-gold text-brand-dark text-xs font-bold px-3 py-1 rounded-full">
                                            {story.format === "v2" ? "★ Premium" : "★ Featured"}
                                          </div>
                                          <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full capitalize flex items-center gap-1">
                                            <span>{icon}</span>
                                            {story.category}
                                          </div>
                                        </div>
                                        <div className="bg-brand-purple-light p-5">
                                          <h3 className={`text-lg font-black mb-1 transition-colors ${isSelected ? "text-accent-gold" : "text-white group-hover:text-accent-gold"}`}>
                                            {story.title}
                                          </h3>
                                          <p className="text-text-muted text-sm line-clamp-2">{story.tagline}</p>
                                          <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
                                            <span>{story.page_count} pages</span>
                                            <span className="flex items-center gap-1">
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                              </svg>
                                              Ages 4-10
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                    {/* Maximize button - separate from select */}
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setPreviewStory(story);
                                      }}
                                      className="absolute top-4 right-4 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors z-10"
                                      aria-label="Preview story"
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                                      </svg>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Other stories */}
                        {otherStories.length > 0 && (
                          <div>
                            <h2 className="text-xl font-black text-white mb-5">
                              {featuredStories.length > 0 ? "More Adventures" : "All Adventures"}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {otherStories.map((story) => {
                                const isSelected = selectedStory === story.slug;
                                const gradient = categoryColors[story.category || ""] || "from-purple-600 to-indigo-800";
                                const icon = categoryIcons[story.category || ""] || "📖";
                                const imageUrl = story.cover_image_url || storyImages[story.slug] || null;

                                return (
                                  <div key={story.slug} className="group relative">
                                    <button
                                      onClick={() => setSelectedStory(story.slug)}
                                      className={`block w-full text-left transition-all ${
                                        isSelected ? "ring-4 ring-accent-gold rounded-3xl" : ""
                                      }`}
                                    >
                                      <div className="relative rounded-3xl overflow-hidden">
                                        <div className={`aspect-[4/3] bg-gradient-to-br ${gradient} relative`}>
                                          {imageUrl ? (
                                            <img src={imageUrl} alt={story.title} className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                              <span className="text-8xl opacity-50">{icon}</span>
                                            </div>
                                          )}
                                          <div className={`absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                                            <span className={`bg-accent-gold text-brand-dark font-extrabold px-6 py-3 rounded-full transform transition-transform ${isSelected ? "scale-100" : "scale-90 group-hover:scale-100"}`}>
                                              {isSelected ? "✓ Selected" : "Select this world"}
                                            </span>
                                          </div>
                                          <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full capitalize flex items-center gap-1">
                                            <span>{icon}</span>
                                            {story.category}
                                          </div>
                                        </div>
                                        <div className="bg-brand-purple-light p-5">
                                          <h3 className={`text-lg font-black mb-1 transition-colors ${isSelected ? "text-accent-gold" : "text-white group-hover:text-accent-gold"}`}>
                                            {story.title}
                                          </h3>
                                          <p className="text-text-muted text-sm line-clamp-2">{story.tagline}</p>
                                          <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
                                            <span>{story.page_count} pages</span>
                                            <span className="flex items-center gap-1">
                                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                              </svg>
                                              Ages 4-10
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                    {/* Maximize button - separate from select */}
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setPreviewStory(story);
                                      }}
                                      className="absolute top-4 right-4 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors z-10"
                                      aria-label="Preview story"
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                                      </svg>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {filteredStories.length === 0 && (
                          <div className="text-center py-20">
                            <p className="text-text-muted text-lg">
                              No stories found in this category.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                );
              })()}

              {/* Story Preview Modal */}
              <StoryPreviewModal
                story={previewStory}
                isOpen={!!previewStory}
                onClose={() => setPreviewStory(null)}
                onSelect={(slug) => setSelectedStory(slug)}
                showSelectButton={true}
              />
            </div>
          )}

          {/* Step 3: Preview */}
          {currentStep === "preview" && (
            <div>
              {showBookViewer && previewPages.length > 0 ? (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h1 className="text-4xl font-black text-white mb-2">
                        Your book cover
                      </h1>
                      <p className="text-lg text-text-muted">
                        Here&apos;s the cover of your personalized storybook!
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowBookViewer(false);
                        setPreviewPages([]);
                      }}
                      className="px-4 py-2 rounded-full border border-brand-purple-muted text-text-muted hover:text-white transition-colors text-sm font-bold"
                    >
                      Generate again
                    </button>
                  </div>

                  <BookViewer
                    pages={previewPages}
                    title={stories.find((s) => s.slug === selectedStory)?.title || "Your Story"}
                  />

                  {/* Approve Cover & Continue */}
                  <div className="mt-8 text-center">
                    <h3 className="text-2xl font-black text-white mb-2">
                      Love your cover?
                    </h3>
                    <p className="text-text-muted mb-6">
                      Approve your cover to continue generating the full book.
                    </p>

                    <button
                      onClick={async () => {
                        if (!currentBookId) return;
                        setApprovingCover(true);
                        try {
                          const res = await fetch(`/api/books/${currentBookId}/approve-cover`, {
                            method: "POST",
                          });
                          if (!res.ok) {
                            const data = await res.json();
                            throw new Error(data.error || "Failed to approve cover");
                          }
                          setCoverApproved(true);
                          setCurrentStep("generate");
                        } catch (err) {
                          const errorMsg = err instanceof Error ? err.message : "Unknown error";
                          setBookError(errorMsg);
                        }
                        setApprovingCover(false);
                      }}
                      disabled={approvingCover || !currentBookId}
                      className={`px-8 py-4 rounded-full font-extrabold text-lg transition-colors flex items-center gap-3 mx-auto ${
                        approvingCover || !currentBookId
                          ? "bg-brand-purple-muted text-text-muted cursor-not-allowed"
                          : "bg-accent-gold text-brand-dark hover:bg-accent-gold-light"
                      }`}
                    >
                      {approvingCover ? (
                        <>
                          <div className="w-5 h-5 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          Approve Cover & Generate Book
                        </>
                      )}
                    </button>

                    <p className="text-text-muted text-sm mt-4">
                      Don&apos;t like this cover?{" "}
                      <button
                        onClick={() => {
                          setShowBookViewer(false);
                          setPreviewPages([]);
                          setCurrentBookId(null);
                        }}
                        className="text-accent-gold hover:underline"
                      >
                        Generate a new one
                      </button>
                    </p>
                  </div>

                  {/* Purchase options - shown after full book is generated */}
                  <div className="mt-12 pt-8 border-t border-brand-purple-muted">
                    <h3 className="text-xl font-black text-white mb-2 text-center text-text-muted">
                      Or skip to purchase
                    </h3>
                    <p className="text-text-muted mb-6 text-center text-sm">
                      We&apos;ll generate all pages in your chosen style when you order.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Digital */}
                      <div className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-5 flex flex-col">
                        <span className="text-accent-gold font-handwritten text-lg mb-1">Instant</span>
                        <h4 className="text-xl font-black text-white mb-1">Digital book</h4>
                        <div className="flex items-baseline gap-1 mb-3">
                          <span className="text-3xl font-black text-white">$14.20</span>
                        </div>
                        <ul className="text-sm text-text-muted space-y-1.5 mb-4 flex-1">
                          <li className="flex gap-2">
                            <span className="text-accent-teal">✦</span>
                            PDF and e-reader version
                          </li>
                          <li className="flex gap-2">
                            <span className="text-accent-teal">✦</span>
                            Read on any screen
                          </li>
                        </ul>
                        <button className="w-full bg-brand-purple text-white font-bold py-3 rounded-full hover:bg-accent-gold hover:text-brand-dark transition-colors">
                          Buy digital
                        </button>
                      </div>

                      {/* Softcover */}
                      <div className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-5 flex flex-col">
                        <span className="text-accent-gold font-handwritten text-lg mb-1">Great value</span>
                        <h4 className="text-xl font-black text-white mb-1">Softcover</h4>
                        <div className="flex items-baseline gap-1 mb-3">
                          <span className="text-3xl font-black text-white">$23</span>
                          <span className="text-xs text-text-muted">+ shipping</span>
                        </div>
                        <ul className="text-sm text-text-muted space-y-1.5 mb-4 flex-1">
                          <li className="flex gap-2">
                            <span className="text-accent-teal">✦</span>
                            Matte paperback
                          </li>
                          <li className="flex gap-2">
                            <span className="text-accent-teal">✦</span>
                            Includes digital copy
                          </li>
                        </ul>
                        <button className="w-full bg-brand-purple text-white font-bold py-3 rounded-full hover:bg-accent-gold hover:text-brand-dark transition-colors">
                          Buy softcover
                        </button>
                      </div>

                      {/* Hardcover - Featured */}
                      <div className="bg-brand-purple border-2 border-accent-gold rounded-2xl p-5 flex flex-col relative">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-gold text-brand-dark text-xs font-bold px-3 py-1 rounded-full">
                          Most loved
                        </div>
                        <span className="text-accent-gold font-handwritten text-lg mb-1">Premium</span>
                        <h4 className="text-xl font-black text-white mb-1">Deluxe hardcover</h4>
                        <div className="flex items-baseline gap-1 mb-3">
                          <span className="text-3xl font-black text-white">$34</span>
                          <span className="text-xs text-text-muted">+ shipping</span>
                        </div>
                        <ul className="text-sm text-text-muted space-y-1.5 mb-4 flex-1">
                          <li className="flex gap-2">
                            <span className="text-accent-gold">✦</span>
                            Gold-foil hardcover
                          </li>
                          <li className="flex gap-2">
                            <span className="text-accent-gold">✦</span>
                            Premium paper
                          </li>
                          <li className="flex gap-2">
                            <span className="text-accent-gold">✦</span>
                            Dedication page
                          </li>
                          <li className="flex gap-2">
                            <span className="text-accent-gold">✦</span>
                            Includes digital copy
                          </li>
                        </ul>
                        <button className="w-full bg-accent-gold text-brand-dark font-extrabold py-3 rounded-full hover:bg-accent-gold-light transition-colors">
                          Buy hardcover
                        </button>
                      </div>

                      {/* Treasure Chest Bundle */}
                      <div className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-5 flex flex-col">
                        <span className="text-accent-pink font-handwritten text-lg mb-1">For gifting</span>
                        <h4 className="text-xl font-black text-white mb-1">Treasure chest</h4>
                        <div className="flex items-baseline gap-1 mb-3">
                          <span className="text-3xl font-black text-white">$119</span>
                          <span className="text-xs text-text-muted">+ shipping</span>
                        </div>
                        <ul className="text-sm text-text-muted space-y-1.5 mb-4 flex-1">
                          <li className="flex gap-2">
                            <span className="text-accent-pink">✦</span>
                            Hardcover in keepsake box
                          </li>
                          <li className="flex gap-2">
                            <span className="text-accent-pink">✦</span>
                            Character poster print
                          </li>
                          <li className="flex gap-2">
                            <span className="text-accent-pink">✦</span>
                            Gift message + date
                          </li>
                        </ul>
                        <button className="w-full bg-brand-purple text-white font-bold py-3 rounded-full hover:bg-accent-gold hover:text-brand-dark transition-colors">
                          Buy bundle
                        </button>
                      </div>
                    </div>

                    <p className="text-center text-text-muted text-sm mt-6">
                      Secure checkout · Satisfaction guaranteed · Ships worldwide
                    </p>
                  </div>
                </div>
              ) : generatingBook && !isMinimized ? (
                <div className="text-center">
                  <h1 className="text-4xl font-black text-white mb-2">
                    Creating your cover page
                  </h1>
                  <p className="text-lg text-text-muted mb-8">
                    Our AI artists are crafting your personalized illustration...
                  </p>
                  <BookViewer
                    pages={[]}
                    title=""
                    isGenerating={true}
                    generatingProgress={generationProgress}
                    generationStartTime={generationStartTime || undefined}
                    onMinimize={handleMinimizeGeneration}
                  />
                </div>
              ) : (
                <div className="text-center">
                  <h1 className="text-4xl font-black text-white mb-2">
                    Your book is ready to preview
                  </h1>
                  <p className="text-lg text-text-muted mb-8">
                    We'll generate your storybook pages with your characters.
                  </p>

                  <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl overflow-hidden max-w-lg mx-auto">
                    {/* Story cover image */}
                    {(() => {
                      const story = stories.find((s) => s.slug === selectedStory);
                      const coverImage = story?.cover_image_url || storyImages[selectedStory || ""];
                      return coverImage ? (
                        <div className="aspect-[4/3] bg-brand-dark">
                          <img
                            src={coverImage}
                            alt={story?.title || "Story cover"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[4/3] bg-gradient-to-br from-purple-600 to-indigo-800 flex items-center justify-center">
                          <span className="text-8xl opacity-50">📚</span>
                        </div>
                      );
                    })()}

                    <div className="p-6">
                      <h2 className="text-2xl font-black text-white mb-2">
                        {stories.find((s) => s.slug === selectedStory)?.title}
                      </h2>
                      <p className="text-text-muted mb-4">
                        {selectedCharacters.length} character{selectedCharacters.length !== 1 && "s"} ·{" "}
                        {artStyles.find((s) => s.slug === selectedStyle)?.name} style
                      </p>

                      {/* Character preview row */}
                      <div className="flex justify-center gap-2 mb-6">
                        {selectedCharacters.slice(0, 5).map((char) => (
                          <div
                            key={char.id}
                            className="w-12 h-12 rounded-full overflow-hidden bg-brand-dark border-2 border-accent-gold"
                            title={char.name}
                          >
                            <img
                              src={char.generated_image_url || char.original_photo_url}
                              alt={char.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                        {selectedCharacters.length > 5 && (
                          <div className="w-12 h-12 rounded-full bg-brand-purple-muted flex items-center justify-center text-text-muted text-sm font-bold">
                            +{selectedCharacters.length - 5}
                          </div>
                        )}
                      </div>

                      {bookError && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-red-300 text-sm">
                          {bookError}
                        </div>
                      )}

                      <button
                        onClick={generateBookPreview}
                        className="bg-accent-gold text-brand-dark font-extrabold px-8 py-4 rounded-full hover:bg-accent-gold-light transition-colors w-full flex items-center justify-center gap-2"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
                        </svg>
                        Generate Cover
                      </button>
                      <p className="text-xs text-text-muted mt-4">
                        This will use AI to generate your personalized book cover.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Generate Full Book */}
          {currentStep === "generate" && currentBookId && (
            <Step5GenerateBook
              bookId={currentBookId}
              storyTitle={stories.find((s) => s.slug === selectedStory)?.title || "Your Story"}
              characterCount={selectedCharacters.length}
              artStyleName={artStyles.find((s) => s.slug === selectedStyle)?.name || "Enchanted glow"}
              coverUrl={previewPages.find((p) => p.page_number === 0)?.url}
              onViewBook={(pages) => {
                setPreviewPages(pages.map((p) => ({
                  page_number: p.pageNumber,
                  url: p.url || "",
                  title: p.pageId === "cover" ? "Cover" : `Page ${p.pageNumber}`,
                })));
                setShowBookViewer(true);
              }}
            />
          )}

        </div>
      </main>

      {/* Fixed Navigation buttons at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-brand-dark/95 backdrop-blur-sm border-t border-brand-purple-muted z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className={`px-6 py-3 rounded-full font-bold transition-colors ${
              currentStepIndex === 0
                ? "bg-brand-purple-muted/50 text-text-muted/50 cursor-not-allowed"
                : "text-white border border-brand-purple-muted hover:border-accent-gold hover:text-accent-gold"
            }`}
          >
            ← Back
          </button>

          {currentStep !== "preview" && currentStep !== "generate" ? (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className={`px-8 py-3 rounded-full font-extrabold transition-colors ${
                canProceed()
                  ? "bg-accent-gold text-brand-dark hover:bg-accent-gold-light"
                  : "bg-brand-purple-muted/50 text-text-muted/50 cursor-not-allowed"
              }`}
            >
              Continue →
            </button>
          ) : (
            <div /> // Empty div to maintain flex spacing
          )}
        </div>
      </div>

      {/* Spacer for fixed bottom nav */}
      <div className="h-20" />

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">✨</div>
            <h2 className="text-2xl font-black text-white mb-2">
              Ready to create your book?
            </h2>
            <p className="text-text-muted mb-6">
              Sign in or create a free account to save characters and generate your personalized storybook.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/register"
                className="w-full px-4 py-4 rounded-full bg-accent-gold text-brand-dark font-extrabold hover:bg-accent-gold-light transition-colors text-center"
              >
                Create free account
              </Link>
              <Link
                href="/login?redirect=/create"
                className="w-full px-4 py-3 rounded-full border border-brand-purple-muted text-white hover:border-accent-gold transition-colors font-bold text-center"
              >
                Sign in
              </Link>
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="text-text-muted hover:text-white transition-colors text-sm mt-2"
              >
                Continue browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Feedback Modal */}
      {showRegenerateModal && characterToRegenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRegenerateModal(false)}
          />
          <div className="relative bg-brand-purple rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-brand-purple-muted max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-1">
              Regenerate {characterToRegenerate.name}&apos;s illustration
            </h3>
            <p className="text-text-muted text-sm mb-5">
              Adjust attributes or add custom instructions
            </p>

            {/* Attribute dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">Hair color</label>
                <select
                  value={regenHairColor}
                  onChange={(e) => setRegenHairColor(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-brand-dark border border-brand-purple-muted text-white focus:outline-none focus:ring-2 focus:ring-accent-gold text-sm"
                >
                  <option value="">Keep current</option>
                  <option value="black">Black</option>
                  <option value="dark brown">Dark brown</option>
                  <option value="light brown">Light brown</option>
                  <option value="blonde">Blonde</option>
                  <option value="sandy blonde">Sandy blonde</option>
                  <option value="auburn">Auburn</option>
                  <option value="red">Red</option>
                  <option value="ginger">Ginger</option>
                  <option value="gray">Gray</option>
                  <option value="white">White</option>
                  <option value="silver">Silver</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1.5">Eye color</label>
                <select
                  value={regenEyeColor}
                  onChange={(e) => setRegenEyeColor(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-brand-dark border border-brand-purple-muted text-white focus:outline-none focus:ring-2 focus:ring-accent-gold text-sm"
                >
                  <option value="">Keep current</option>
                  <option value="blue">Blue</option>
                  <option value="bright blue">Bright blue</option>
                  <option value="light blue">Light blue</option>
                  <option value="green">Green</option>
                  <option value="hazel">Hazel</option>
                  <option value="brown">Brown</option>
                  <option value="dark brown">Dark brown</option>
                  <option value="amber">Amber</option>
                  <option value="gray">Gray</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-white mb-1.5">Skin tone</label>
                <select
                  value={regenSkinTone}
                  onChange={(e) => setRegenSkinTone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-brand-dark border border-brand-purple-muted text-white focus:outline-none focus:ring-2 focus:ring-accent-gold text-sm"
                >
                  <option value="">Keep current</option>
                  <option value="fair">Fair</option>
                  <option value="light">Light</option>
                  <option value="medium">Medium</option>
                  <option value="olive">Olive</option>
                  <option value="tan">Tan</option>
                  <option value="brown">Brown</option>
                  <option value="dark brown">Dark brown</option>
                  <option value="deep brown">Deep brown</option>
                </select>
              </div>
            </div>

            {/* Current values hint */}
            {characterToRegenerate.identity_profile && (
              <p className="text-xs text-text-muted mb-4">
                Current: {characterToRegenerate.identity_profile.hair?.color || "?"} hair, {characterToRegenerate.identity_profile.eyes?.color || "?"} eyes, {characterToRegenerate.identity_profile.skinTone || "?"} skin
              </p>
            )}

            {/* Custom instructions */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-white mb-1.5">Additional instructions (optional)</label>
              <textarea
                value={regenerateFeedback}
                onChange={(e) => setRegenerateFeedback(e.target.value)}
                placeholder="e.g., Make the smile bigger, add glasses, make hair curlier..."
                className="w-full h-20 px-3 py-2 rounded-lg bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold resize-none text-sm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRegenerateModal(false)}
                className="flex-1 py-3 rounded-full border border-brand-purple-muted text-white font-bold hover:bg-brand-purple-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitRegenerate}
                className="flex-1 py-3 rounded-full bg-accent-gold text-brand-dark font-bold hover:bg-accent-gold/90 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4v6h6M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Token Confirm Modal */}
      <TokenConfirmModal
        isOpen={showTokenConfirm}
        onClose={() => {
          setShowTokenConfirm(false);
          setPendingAction(null);
          setRegenerateFeedback("");
        }}
        onConfirm={handleConfirmGeneration}
        actionName={
          pendingAction?.type === "character"
            ? `generate illustration for ${pendingAction.characterObj?.name || "character"}`
            : "generate book cover"
        }
        tokenCost={
          pendingAction?.type === "character"
            ? TOKEN_COSTS.CHARACTER_ILLUSTRATION
            : TOKEN_COSTS.BOOK_COVER
        }
        currentBalance={tokenBalance}
        loading={pendingAction?.type === "character" ? !!generatingCharacterId : generatingBook}
      />

      {/* Character Form Modal - shows when photos are uploaded */}
      <CharacterFormModal
        pendingCharacter={currentPendingCharacter}
        onUpdate={updatePending}
        onSave={savePendingCharacter}
        onCancel={removePending}
        remainingCount={remainingPendingCount}
      />

      {/* Identity Confirmation Modal - shows after photo analysis */}
      <IdentityConfirmModal
        isOpen={showIdentityConfirmModal}
        character={characterForIdentityConfirm}
        identityProfile={extractedIdentityProfile}
        onConfirm={handleIdentityConfirm}
        onSkip={handleIdentitySkip}
        onClose={handleIdentityClose}
        isAnalyzing={!!analyzingCharacterId}
      />

      <Footer />
    </div>
  );
}

// Wrap with Suspense to handle useSearchParams during prerendering
export default function CreatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CreatePageInner />
    </Suspense>
  );
}
