"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import BookViewer from "@/components/BookViewer";
import TokenConfirmModal from "@/components/ui/TokenConfirmModal";
import CharacterFormModal, { type PendingCharacter } from "@/components/ui/CharacterFormModal";
import { TOKEN_COSTS } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import type { Character } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

interface PreviewPage {
  page_number: number;
  url: string;
  title: string;
}

type Step = "characters" | "story" | "style" | "preview";

const stories = [
  {
    slug: "dragon-castle-valley",
    title: "The Dragon of Castle Valley",
    tagline: "A dragon guards the road to the glowing castle.",
    cast: 4,
    category: "fantasy",
    image: "/images/the-dragon-of-castle-valley.jpg",
  },
  {
    slug: "fairy-glade",
    title: "The Fairy Glade",
    tagline: "Follow the fireflies to where the fairies are waiting.",
    cast: 4,
    category: "magical",
    image: "/images/the-fairy-glade.jpg",
  },
  {
    slug: "grand-final-day",
    title: "Grand Final Day",
    tagline: "One game, one final siren, one family cheering.",
    cast: 5,
    category: "sports",
    image: "/images/grand-final-day.jpg",
  },
  {
    slug: "cloud-ship",
    title: "Captain of the Cloud Ship",
    tagline: "Take the helm of a flying ship through the clouds.",
    cast: 4,
    category: "adventure",
    image: "/images/captain-of-the-cloud-ship.jpg",
  },
  {
    slug: "super-squad",
    title: "The Super Squad",
    tagline: "Suit up to save the city from a cheeky sorceress.",
    cast: 4,
    category: "superhero",
    image: "/images/the-super-squad-and-the-sorceress.jpg",
  },
  {
    slug: "galaxy-road-trip",
    title: "The Great Galaxy Road Trip",
    tagline: "Blast off through the solar system and back before bedtime.",
    cast: 4,
    category: "space",
    image: "/images/the-great-galaxy-road-trip.jpg",
  },
];

const artStyles = [
  { slug: "glow", name: "Enchanted glow", desc: "Rich painted light with golden sparkles", image: "/images/enchanted-glow.jpg" },
  { slug: "watercolour", name: "Watercolour dream", desc: "Soft washes and pastel skies", image: "/images/watercolour-dream.jpg" },
  { slug: "sketch", name: "Pencil sketch", desc: "Hand-drawn graphite on cream paper", image: "/images/pencil-sketch.jpg" },
  { slug: "papercut", name: "Paper-cut", desc: "Layered paper with depth and texture", image: "/images/paper-cut.jpg" },
  { slug: "anim", name: "3D animated", desc: "Cinematic Pixar-style rendering", image: "/images/3d-animated.jpg" },
  { slug: "silhouette", name: "Shadow silhouette", desc: "Bold silhouettes against sunset", image: "/images/shadow-silhouette.jpg" },
  { slug: "bricks", name: "Toy bricks", desc: "LEGO-style brick world", image: "/images/toy-bricks.jpg" },
];

export default function CreatePage() {
  const [currentStep, setCurrentStep] = useState<Step>("characters");

  // Existing characters from database
  const [existingCharacters, setExistingCharacters] = useState<Character[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set());
  const [loadingCharacters, setLoadingCharacters] = useState(true);

  // Editing existing characters
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

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

  const steps: { key: Step; label: string; number: number }[] = [
    { key: "characters", label: "Add characters", number: 1 },
    { key: "story", label: "Choose adventure", number: 2 },
    { key: "style", label: "Pick enchantment", number: 3 },
    { key: "preview", label: "Preview book", number: 4 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  // Toggle character selection
  const toggleCharacterSelection = (id: string) => {
    setSelectedCharacterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
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
  };

  // Save character name edit
  const saveCharacterEdit = async () => {
    if (!editingCharacterId || !editingName.trim()) return;

    try {
      const res = await fetch(`/api/characters/${editingCharacterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim() }),
      });

      if (res.ok) {
        setExistingCharacters((prev) =>
          prev.map((c) => (c.id === editingCharacterId ? { ...c, name: editingName.trim() } : c))
        );
      }
    } catch (error) {
      console.error("Failed to update character:", error);
    }

    setEditingCharacterId(null);
    setEditingName("");
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
    setShowRegenerateModal(true);
  };

  // Submit regeneration with feedback
  const submitRegenerate = () => {
    if (!characterToRegenerate) return;
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
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newChar = data.character;
        // Add to existing characters and auto-select
        setExistingCharacters((prev) => [newChar, ...prev]);
        setSelectedCharacterIds((prev) => new Set([...prev, newChar.id]));
        setPendingCharacters((prev) => prev.filter((p) => p.id !== pending.id));

        // Auto-trigger generation (show token confirm)
        requestGenerateCaricature(newChar);
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
    return `/api/placeholder/900/506?text=${encodeURIComponent(text)}`;
  };

  // Demo story scenes for preview
  const demoScenes: Record<string, PreviewPage[]> = {
    "dragon-castle-valley": [
      { page_number: 1, url: getPlaceholderUrl("The Journey Begins"), title: "The Journey Begins" },
      { page_number: 2, url: getPlaceholderUrl("Meeting the Dragon"), title: "Meeting the Dragon" },
      { page_number: 3, url: getPlaceholderUrl("Happily Ever After"), title: "Happily Ever After" },
    ],
    "fairy-glade": [
      { page_number: 1, url: getPlaceholderUrl("Following Fireflies"), title: "Following Fireflies" },
      { page_number: 2, url: getPlaceholderUrl("Meeting the Fairies"), title: "Meeting the Fairies" },
      { page_number: 3, url: getPlaceholderUrl("Magic Forever"), title: "Magic Forever" },
    ],
    "grand-final-day": [
      { page_number: 1, url: getPlaceholderUrl("Game Day Morning"), title: "Game Day Morning" },
      { page_number: 2, url: getPlaceholderUrl("The Winning Play"), title: "The Winning Play" },
      { page_number: 3, url: getPlaceholderUrl("Champions"), title: "Champions" },
    ],
    "cloud-ship": [
      { page_number: 1, url: getPlaceholderUrl("Taking the Helm"), title: "Taking the Helm" },
      { page_number: 2, url: getPlaceholderUrl("Above the Clouds"), title: "Above the Clouds" },
      { page_number: 3, url: getPlaceholderUrl("Safe Harbor"), title: "Safe Harbor" },
    ],
    "super-squad": [
      { page_number: 1, url: getPlaceholderUrl("The Call to Action"), title: "The Call to Action" },
      { page_number: 2, url: getPlaceholderUrl("Using Powers"), title: "Using Powers" },
      { page_number: 3, url: getPlaceholderUrl("Heroes Celebrated"), title: "Heroes Celebrated" },
    ],
    "galaxy-road-trip": [
      { page_number: 1, url: getPlaceholderUrl("Blast Off"), title: "Blast Off" },
      { page_number: 2, url: getPlaceholderUrl("Planet Hopping"), title: "Planet Hopping" },
      { page_number: 3, url: getPlaceholderUrl("Home Before Bedtime"), title: "Home Before Bedtime" },
    ],
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

    try {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storySlug: selectedStory,
          artStyle: selectedStyle,
          characterIds: selectedCharacters.map((c) => c.id),
        }),
      });

      if (response.ok) {
        const { book } = await response.json();
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

        if (genResponse.ok) {
          const { pages, tokensRemaining } = await genResponse.json();
          setPreviewPages(pages);
          setShowBookViewer(true);
          setGenerationProgress(100);
          setTokenBalance(tokensRemaining);
        } else {
          throw new Error("Generation failed");
        }
      } else {
        console.log("API not available, using demo mode");
        await simulateDemoGeneration();
      }
    } catch (error) {
      console.log("Using demo mode due to:", error);
      await simulateDemoGeneration();
    }

    setGeneratingBook(false);
  };

  const simulateDemoGeneration = async () => {
    for (let i = 1; i <= 3; i++) {
      setGenerationProgress((i / 3) * 100);
      await new Promise((r) => setTimeout(r, 1000));
    }

    const pages = demoScenes[selectedStory || "dragon-castle-valley"] || demoScenes["dragon-castle-valley"];
    setPreviewPages(pages);
    setShowBookViewer(true);
  };

  const canProceed = () => {
    switch (currentStep) {
      case "characters":
        return selectedCharacterIds.size > 0;
      case "story":
        return selectedStory !== null;
      case "style":
        return selectedStyle !== null;
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
                  Select existing characters or add new ones for your story.
                </p>
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
                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveCharacterEdit();
                                    if (e.key === "Escape") {
                                      setEditingCharacterId(null);
                                      setEditingName("");
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 rounded bg-brand-dark border border-brand-purple-muted text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent-gold min-w-0"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    saveCharacterEdit();
                                  }}
                                  className="text-accent-gold hover:text-accent-gold-light shrink-0"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 6L9 17l-5-5" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-1">
                                <div className="min-w-0 flex-1">
                                  <p className="text-white font-bold text-sm truncate">{char.name}</p>
                                  <p className="text-xs text-text-muted capitalize">
                                    {char.pet_type || char.character_type}
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
              <h1 className="text-4xl font-black text-white mb-2">
                Choose your adventure
              </h1>
              <p className="text-lg text-text-muted mb-8">
                Pick a world for your characters to explore.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stories.map((story) => (
                  <button
                    key={story.slug}
                    onClick={() => setSelectedStory(story.slug)}
                    className={`text-left bg-brand-purple-light border rounded-2xl overflow-hidden transition-all ${
                      selectedStory === story.slug
                        ? "border-accent-gold ring-2 ring-accent-gold"
                        : "border-brand-purple-muted hover:border-accent-gold/50"
                    }`}
                  >
                    <div className="h-40 bg-gradient-to-br from-[#2C4F3E] to-[#1B1446] overflow-hidden">
                      <img
                        src={story.image}
                        alt={story.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-5">
                      <span className="text-xs font-bold text-accent-gold uppercase">
                        {story.category} · {story.cast} characters
                      </span>
                      <h3 className="text-xl font-black text-white mt-1">
                        {story.title}
                      </h3>
                      <p className="text-text-muted text-sm mt-1">
                        {story.tagline}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Pick Art Style */}
          {currentStep === "style" && (
            <div>
              <h1 className="text-4xl font-black text-white mb-2">
                Pick an enchantment
              </h1>
              <p className="text-lg text-text-muted mb-8">
                Choose the art style for your storybook.
              </p>

              {/* Large preview */}
              <div className="mb-8 bg-brand-purple-light border border-brand-purple-muted rounded-3xl overflow-hidden">
                <div className="h-64 md:h-80 bg-gradient-to-br from-[#6B5BB0] to-[#1E1B4B] overflow-hidden">
                  <img
                    src={artStyles.find((s) => s.slug === selectedStyle)?.image}
                    alt={artStyles.find((s) => s.slug === selectedStyle)?.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-2xl font-black text-white">
                    {artStyles.find((s) => s.slug === selectedStyle)?.name}
                  </h3>
                  <p className="text-text-muted mt-1">
                    {artStyles.find((s) => s.slug === selectedStyle)?.desc}
                  </p>
                </div>
              </div>

              {/* Style selector */}
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {artStyles.map((style) => (
                  <button
                    key={style.slug}
                    onClick={() => setSelectedStyle(style.slug)}
                    className={`text-left flex flex-col gap-2 transition-opacity ${
                      selectedStyle === style.slug
                        ? "opacity-100"
                        : "opacity-50 hover:opacity-80"
                    }`}
                  >
                    <div
                      className={`aspect-square rounded-xl bg-brand-dark overflow-hidden ${
                        selectedStyle === style.slug
                          ? "ring-3 ring-accent-gold"
                          : "ring-1 ring-brand-purple-muted"
                      }`}
                    >
                      <img
                        src={style.image}
                        alt={style.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span
                      className={`text-xs font-bold leading-tight ${
                        selectedStyle === style.slug
                          ? "text-white"
                          : "text-text-muted"
                      }`}
                    >
                      {style.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Preview */}
          {currentStep === "preview" && (
            <div>
              {showBookViewer && previewPages.length > 0 ? (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h1 className="text-4xl font-black text-white mb-2">
                        Your book preview
                      </h1>
                      <p className="text-lg text-text-muted">
                        Here's a preview of your personalized storybook!
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

                  {/* Purchase options */}
                  <div className="mt-8">
                    <h3 className="text-2xl font-black text-white mb-2 text-center">
                      Love your preview? Choose your book
                    </h3>
                    <p className="text-text-muted mb-8 text-center">
                      Every option includes 3 free amendments.
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
              ) : generatingBook ? (
                <div className="text-center">
                  <h1 className="text-4xl font-black text-white mb-2">
                    Creating your storybook
                  </h1>
                  <p className="text-lg text-text-muted mb-8">
                    Our AI artists are bringing your story to life...
                  </p>
                  <BookViewer
                    pages={[]}
                    title=""
                    isGenerating={true}
                    generatingProgress={generationProgress}
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

                  <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-8 max-w-lg mx-auto">
                    <div className="text-6xl mb-4">📚</div>
                    <h2 className="text-2xl font-black text-white mb-2">
                      {stories.find((s) => s.slug === selectedStory)?.title}
                    </h2>
                    <p className="text-text-muted mb-6">
                      {selectedCharacters.length} character{selectedCharacters.length !== 1 && "s"} ·{" "}
                      {artStyles.find((s) => s.slug === selectedStyle)?.name} style
                    </p>

                    {/* Character preview row */}
                    <div className="flex justify-center gap-2 mb-6">
                      {selectedCharacters.slice(0, 5).map((char) => (
                        <div
                          key={char.id}
                          className="w-12 h-12 rounded-full overflow-hidden bg-brand-dark border-2 border-accent-gold"
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
                      Generate Preview
                    </button>
                    <p className="text-xs text-text-muted mt-4">
                      This will use AI to generate 3 preview pages for your book.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-12 flex justify-between items-center">
            <button
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              className={`px-6 py-3 rounded-full font-bold transition-colors ${
                currentStepIndex === 0
                  ? "opacity-0 pointer-events-none"
                  : "text-white border border-brand-purple-muted hover:border-accent-gold"
              }`}
            >
              ← Back
            </button>

            {currentStep !== "preview" && (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className={`px-8 py-4 rounded-full font-extrabold transition-colors ${
                  canProceed()
                    ? "bg-accent-gold text-brand-dark hover:bg-accent-gold-light"
                    : "bg-brand-purple-muted text-text-muted cursor-not-allowed"
                }`}
              >
                Continue →
              </button>
            )}
          </div>
        </div>
      </main>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRegenerateModal(false)}
          />
          <div className="relative bg-brand-purple rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border border-brand-purple-muted">
            <h3 className="text-lg font-bold text-white mb-2">
              Regenerate {characterToRegenerate.name}&apos;s illustration
            </h3>
            <p className="text-text-muted text-sm mb-4">
              Describe any changes you&apos;d like to see in the new illustration:
            </p>

            <textarea
              value={regenerateFeedback}
              onChange={(e) => setRegenerateFeedback(e.target.value)}
              placeholder="e.g., Make the eyes bigger, add a bigger smile, make the hair curlier..."
              className="w-full h-24 px-3 py-2 rounded-lg bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold resize-none"
              autoFocus
            />

            <div className="flex gap-3 mt-4">
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
            : "generate 3 book preview pages"
        }
        tokenCost={
          pendingAction?.type === "character"
            ? TOKEN_COSTS.CHARACTER_ILLUSTRATION
            : TOKEN_COSTS.BOOK_PREVIEW_FULL
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

      <Footer />
    </div>
  );
}
