"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import { createClient } from "@/lib/supabase/client";
import type { Character } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

// Reference image with ID for insertion into description
interface ReferenceImage {
  id: string;        // "#01", "#02", etc.
  url: string;       // Data URL or Supabase URL
  name: string;      // Original filename
  uploadedAt: Date;
}

type Step = "crew" | "describe" | "style" | "reference" | "generate" | "edit";

const steps: { key: Step; label: string; number: number }[] = [
  { key: "crew", label: "Choose crew", number: 1 },
  { key: "describe", label: "Describe book", number: 2 },
  { key: "style", label: "Choose style", number: 3 },
  { key: "reference", label: "Add references", number: 4 },
  { key: "generate", label: "Generate", number: 5 },
  { key: "edit", label: "Edit & refine", number: 6 },
];

// Pre-defined art styles
const artStyles = [
  { id: "glow", name: "Enchanted Glow", desc: "Rich painted light with golden sparkles", preview: "/images/enchanted-glow.jpg" },
  { id: "watercolour", name: "Watercolour Dream", desc: "Soft washes and pastel skies", preview: "/images/watercolour-dream.jpg" },
  { id: "sketch", name: "Pencil Sketch", desc: "Hand-drawn graphite on cream paper", preview: "/images/pencil-sketch.jpg" },
  { id: "anim", name: "3D Animated", desc: "Cinematic Pixar-style rendering", preview: "/images/3d-animated.jpg" },
  { id: "papercut", name: "Paper-cut", desc: "Layered paper with depth and texture", preview: "/images/paper-cut.jpg" },
  { id: "custom", name: "Custom Style", desc: "Create your own style with reference images", preview: null },
];

// Story themes
const storyThemes = [
  { id: "adventure", label: "Adventure", emoji: "⛵" },
  { id: "fantasy", label: "Fantasy", emoji: "🐉" },
  { id: "magical", label: "Magical", emoji: "✨" },
  { id: "sports", label: "Sports", emoji: "🏆" },
  { id: "superhero", label: "Superhero", emoji: "🦸" },
  { id: "space", label: "Space", emoji: "🚀" },
  { id: "animals", label: "Animals", emoji: "🐾" },
  { id: "everyday", label: "Everyday Life", emoji: "🏠" },
];

function CustomStoryPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const crewFromUrl = searchParams.get("crew"); // Crew IDs passed from create page
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  // Start on "describe" step if crew is passed, otherwise start on "crew" step
  const [currentStep, setCurrentStep] = useState<Step>(crewFromUrl ? "describe" : "crew");
  const [loading, setLoading] = useState(true);

  // Step 1: Crew selection
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set());
  const [orderedCharacterIds, setOrderedCharacterIds] = useState<string[]>([]);

  // Step 2: Book description
  const [bookTitle, setBookTitle] = useState("");
  const [bookDescription, setBookDescription] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(10);

  // Step 3: Art style
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [customStyleDescription, setCustomStyleDescription] = useState("");

  // Step 2: Reference images (embedded in describe step)
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [showReferenceDropdown, setShowReferenceDropdown] = useState(false);
  const [previewImage, setPreviewImage] = useState<ReferenceImage | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auth check and character fetch
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch characters
        const res = await fetch("/api/characters");
        if (res.ok) {
          const data = await res.json();
          const chars = data.characters || [];
          setCharacters(chars);

          // Restore crew selection from URL params (when coming from create page)
          if (crewFromUrl) {
            const crewIds = crewFromUrl.split(",").filter((id: string) => id.trim());
            // Only select characters that actually exist
            const validIds = crewIds.filter((id: string) => chars.some((c: Character) => c.id === id));
            setSelectedCharacterIds(new Set(validIds));
            setOrderedCharacterIds(validIds);
          }
        }
      }
      setLoading(false);
    }
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const res = await fetch("/api/characters");
        if (res.ok) {
          const data = await res.json();
          setCharacters(data.characters || []);
        }
      } else {
        setCharacters([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth, crewFromUrl]);

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  const toggleCharacterSelection = (id: string) => {
    setSelectedCharacterIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setOrderedCharacterIds((order) => order.filter((cid) => cid !== id));
      } else {
        if (next.size >= 5) return prev;
        next.add(id);
        setOrderedCharacterIds((order) => [...order, id]);
      }
      return next;
    });
  };

  // Move character up in order
  const moveCharacterUp = (id: string) => {
    setOrderedCharacterIds((prev) => {
      const index = prev.indexOf(id);
      if (index <= 0) return prev;
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  // Move character down in order
  const moveCharacterDown = (id: string) => {
    setOrderedCharacterIds((prev) => {
      const index = prev.indexOf(id);
      if (index < 0 || index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case "crew":
        return selectedCharacterIds.size > 0;
      case "describe":
        return bookTitle.trim() !== "" && selectedTheme !== null;
      case "style":
        return selectedStyle !== null && (selectedStyle !== "custom" || customStyleDescription.trim() !== "");
      case "reference":
        return true; // Optional step
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

  // Build URL for switching to premade adventures (preserving crew)
  const getPremadeAdventureUrl = () => {
    if (orderedCharacterIds.length > 0) {
      return `/create?crew=${orderedCharacterIds.join(",")}`;
    }
    return "/create";
  };

  // Get selected characters in order
  const getSelectedCharactersInOrder = () => {
    return orderedCharacterIds
      .map((id) => characters.find((c) => c.id === id))
      .filter((c): c is Character => c !== undefined);
  };

  // Handle reference image upload
  const handleReferenceUpload = (files: FileList | null) => {
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (referenceImages.length >= 10) break; // Max 10 references

      const reader = new FileReader();
      reader.onload = () => {
        // Find the next available ID number
        const existingNumbers = referenceImages.map(r => parseInt(r.id.replace("#", "")));
        let nextNum = 1;
        while (existingNumbers.includes(nextNum)) {
          nextNum++;
        }
        const paddedId = `#${String(nextNum).padStart(2, "0")}`;

        setReferenceImages(prev => [...prev, {
          id: paddedId,
          url: reader.result as string,
          name: file.name,
          uploadedAt: new Date()
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  // Delete a reference image (keep original IDs, don't re-number)
  const deleteReferenceImage = (id: string) => {
    setReferenceImages(prev => prev.filter(r => r.id !== id));
    if (previewImage?.id === id) {
      setPreviewImage(null);
    }
  };

  // Insert reference ID at cursor position in textarea
  const insertReference = (refId: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = bookDescription;

    const newText = text.slice(0, start) + refId + " " + text.slice(end);
    setBookDescription(newText);

    // Restore cursor position after the inserted text
    setTimeout(() => {
      textarea.focus();
      const newPos = start + refId.length + 1;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);

    setShowReferenceDropdown(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowReferenceDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col">
        <Header theme="dark" />
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">✨</div>
            <h1 className="text-3xl font-black text-white mb-4">Sign in to create</h1>
            <p className="text-text-muted mb-8">
              Create a free account to start building your own custom story.
            </p>
            <Link
              href="/login?redirect=/create/custom"
              className="inline-block bg-accent-gold text-brand-dark font-extrabold px-8 py-4 rounded-full hover:bg-accent-gold-light transition-colors"
            >
              Sign in
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 py-8 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.key} className="flex items-center">
                  <button
                    onClick={() => {
                      // Allow going back to previous steps
                      if (index <= currentStepIndex) {
                        setCurrentStep(step.key);
                      }
                    }}
                    disabled={index > currentStepIndex}
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                      index < currentStepIndex
                        ? "bg-accent-gold text-brand-dark cursor-pointer hover:bg-accent-gold-light"
                        : index === currentStepIndex
                        ? "bg-accent-gold text-brand-dark"
                        : "bg-brand-purple-muted text-text-muted cursor-not-allowed"
                    }`}
                  >
                    {index < currentStepIndex ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </button>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 w-8 md:w-16 mx-1 md:mx-2 transition-colors ${
                        index < currentStepIndex ? "bg-accent-gold" : "bg-brand-purple-muted"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-white font-bold">
              Step {currentStepIndex + 1}: {steps[currentStepIndex].label}
            </p>
          </div>

          {/* Step 1: Crew Selection */}
          {currentStep === "crew" && (
            <div>
              <div className="text-center mb-10">
                <h1 className="text-4xl font-black text-white mb-3">
                  Choose your crew
                </h1>
                <p className="text-lg text-text-muted max-w-2xl mx-auto">
                  Select the characters who will star in your custom story. You can select up to 5 characters.
                </p>
              </div>

              {/* Choose premade adventure option */}
              <div className="bg-gradient-to-br from-brand-purple/50 to-brand-purple-light/50 border border-brand-purple-muted rounded-3xl p-6 mb-8">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-lg font-bold text-white mb-1">
                      Want a ready-made adventure instead?
                    </h3>
                    <p className="text-sm text-text-muted">
                      Browse our collection of professionally crafted story templates.
                    </p>
                  </div>
                  <Link
                    href={getPremadeAdventureUrl()}
                    className="border border-accent-gold text-accent-gold font-bold px-6 py-3 rounded-full hover:bg-accent-gold hover:text-brand-dark transition-colors whitespace-nowrap"
                  >
                    Choose premade adventure
                  </Link>
                </div>
              </div>

              {/* Character grid */}
              {characters.length === 0 ? (
                <div className="text-center py-16 bg-brand-purple-light border border-brand-purple-muted rounded-3xl">
                  <div className="text-6xl mb-4">👤</div>
                  <h3 className="text-2xl font-black text-white mb-2">No characters yet</h3>
                  <p className="text-text-muted mb-6">
                    Add characters to your crew first to include them in your story.
                  </p>
                  <Link
                    href="/characters"
                    className="inline-block bg-accent-gold text-brand-dark font-bold px-6 py-3 rounded-full hover:bg-accent-gold-light transition-colors"
                  >
                    Add characters
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {characters.map((char) => {
                    const isSelected = selectedCharacterIds.has(char.id);
                    const orderIndex = orderedCharacterIds.indexOf(char.id);
                    return (
                      <button
                        key={char.id}
                        onClick={() => toggleCharacterSelection(char.id)}
                        className={`relative p-4 rounded-2xl border-2 transition-all ${
                          isSelected
                            ? "border-accent-gold bg-accent-gold/10"
                            : "border-brand-purple-muted bg-brand-purple-light hover:border-accent-gold/50"
                        }`}
                      >
                        {/* Selection badge */}
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-accent-gold rounded-full flex items-center justify-center text-brand-dark font-bold text-sm">
                            {orderIndex + 1}
                          </div>
                        )}

                        {/* Character image */}
                        <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-brand-dark">
                          {char.generated_image_url ? (
                            <img
                              src={char.generated_image_url}
                              alt={char.name}
                              className="w-full h-full object-cover"
                            />
                          ) : char.original_photo_url ? (
                            <img
                              src={char.original_photo_url}
                              alt={char.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl text-text-muted">
                              {char.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Character info */}
                        <h4 className="font-bold text-white text-sm truncate">{char.name}</h4>
                        <p className="text-xs text-text-muted">
                          {char.character_type === "pet" ? "Pet" : char.age ? `${char.age} years old` : ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Selected crew summary */}
              {selectedCharacterIds.size > 0 && (
                <div className="mt-8 p-6 bg-brand-purple-light border border-brand-purple-muted rounded-2xl">
                  <h4 className="text-lg font-bold text-white mb-4">
                    Your crew ({selectedCharacterIds.size}/5)
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {getSelectedCharactersInOrder().map((char, index) => (
                      <div
                        key={char.id}
                        className="flex items-center gap-2 bg-brand-dark rounded-full pl-1 pr-3 py-1"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-brand-purple-muted">
                          {char.generated_image_url || char.original_photo_url ? (
                            <img
                              src={char.generated_image_url || char.original_photo_url || ""}
                              alt={char.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-text-muted font-bold">
                              {char.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="text-white text-sm font-medium">{char.name}</span>
                        <span className="text-accent-gold text-xs font-bold">#{index + 1}</span>
                        {/* Reorder buttons */}
                        <div className="flex gap-1 ml-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveCharacterUp(char.id);
                            }}
                            disabled={index === 0}
                            className="text-text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 15l-6-6-6 6" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveCharacterDown(char.id);
                            }}
                            disabled={index === orderedCharacterIds.length - 1}
                            className="text-text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Describe Book */}
          {currentStep === "describe" && (
            <div>
              <div className="text-center mb-10">
                <h1 className="text-4xl font-black text-white mb-3">
                  Describe your book
                </h1>
                <p className="text-lg text-text-muted max-w-2xl mx-auto">
                  Tell us about the story you want to create. What adventure awaits your characters?
                </p>
              </div>

              {/* Choose premade adventure option */}
              <div className="bg-gradient-to-br from-brand-purple/50 to-brand-purple-light/50 border border-brand-purple-muted rounded-3xl p-6 mb-8">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-lg font-bold text-white mb-1">
                      Prefer a ready-made story?
                    </h3>
                    <p className="text-sm text-text-muted">
                      Your crew selection will be preserved when you switch.
                    </p>
                  </div>
                  <Link
                    href={getPremadeAdventureUrl()}
                    className="border border-accent-gold text-accent-gold font-bold px-6 py-3 rounded-full hover:bg-accent-gold hover:text-brand-dark transition-colors whitespace-nowrap"
                  >
                    Choose premade adventure
                  </Link>
                </div>
              </div>

              {/* Book Title */}
              <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-6 mb-6">
                <label className="block text-white font-bold mb-3">
                  Book Title <span className="text-accent-gold">*</span>
                </label>
                <input
                  type="text"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="Enter your book title..."
                  className="w-full bg-brand-dark border border-brand-purple-muted rounded-xl px-4 py-3 text-white placeholder-text-muted focus:border-accent-gold focus:ring-1 focus:ring-accent-gold focus:outline-none transition-colors"
                  maxLength={100}
                />
              </div>

              {/* Theme Selection */}
              <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-6 mb-6">
                <label className="block text-white font-bold mb-3">
                  Theme <span className="text-accent-gold">*</span>
                </label>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                  {storyThemes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                        selectedTheme === theme.id
                          ? "border-accent-gold bg-accent-gold/10"
                          : "border-brand-purple-muted bg-brand-dark hover:border-accent-gold/50"
                      }`}
                    >
                      <span className="text-2xl mb-1">{theme.emoji}</span>
                      <span className="text-xs text-white font-medium truncate w-full text-center">
                        {theme.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Story Description with Reference Insertion */}
              <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-6 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-white font-bold">
                    Story Description
                  </label>
                  {/* Insert reference dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setShowReferenceDropdown(!showReferenceDropdown)}
                      disabled={referenceImages.length === 0}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        referenceImages.length === 0
                          ? "text-text-muted cursor-not-allowed"
                          : "text-accent-gold hover:bg-accent-gold/10"
                      }`}
                      title={referenceImages.length === 0 ? "Upload reference images first" : "Insert reference"}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      Insert
                    </button>

                    {/* Reference dropdown */}
                    {showReferenceDropdown && referenceImages.length > 0 && (
                      <div className="absolute right-0 top-full mt-2 bg-brand-dark border border-brand-purple-muted rounded-xl p-3 shadow-xl z-20 min-w-[200px]">
                        <p className="text-xs text-text-muted mb-2">Click to insert reference:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {referenceImages.map((ref) => (
                            <button
                              key={ref.id}
                              onClick={() => insertReference(ref.id)}
                              className="relative group aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-accent-gold transition-colors"
                            >
                              <Image
                                src={ref.url}
                                alt={ref.name}
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white font-bold text-sm">{ref.id}</span>
                              </div>
                              <div className="absolute top-1 left-1 bg-accent-gold text-brand-dark text-xs font-bold px-1.5 py-0.5 rounded">
                                {ref.id}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <textarea
                  ref={textareaRef}
                  value={bookDescription}
                  onChange={(e) => setBookDescription(e.target.value)}
                  placeholder="Describe your story... You can reference images like #01 or #02 to show the AI what you mean."
                  rows={5}
                  className="w-full bg-brand-dark border border-brand-purple-muted rounded-xl px-4 py-3 text-white placeholder-text-muted focus:border-accent-gold focus:ring-1 focus:ring-accent-gold focus:outline-none transition-colors resize-none"
                />
                <p className="text-xs text-text-muted mt-2">
                  Tip: Upload reference images below and use {`{#01}`}, {`{#02}`} etc. in your description to point the AI to specific visual references.
                </p>
              </div>

              {/* Reference Images Gallery */}
              <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-6 mb-6">
                <label className="block text-white font-bold mb-3">
                  Reference Images <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <p className="text-sm text-text-muted mb-4">
                  Upload images to help the AI understand your vision. Max 10 images.
                </p>

                <div className="flex flex-wrap gap-3">
                  {/* Uploaded reference images */}
                  {referenceImages.map((ref) => (
                    <div
                      key={ref.id}
                      className="relative group w-24 h-24 rounded-xl overflow-hidden border-2 border-brand-purple-muted hover:border-accent-gold transition-colors cursor-pointer"
                      onClick={() => setPreviewImage(ref)}
                    >
                      <Image
                        src={ref.url}
                        alt={ref.name}
                        fill
                        className="object-cover"
                      />
                      {/* ID badge */}
                      <div className="absolute top-1 left-1 bg-accent-gold text-brand-dark text-xs font-bold px-1.5 py-0.5 rounded">
                        {ref.id}
                      </div>
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteReferenceImage(ref.id);
                        }}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}

                  {/* Add image button */}
                  {referenceImages.length < 10 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-xl border-2 border-dashed border-brand-purple-muted hover:border-accent-gold bg-brand-dark flex flex-col items-center justify-center gap-1 transition-colors"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      <span className="text-xs text-text-muted">Add image</span>
                    </button>
                  )}
                </div>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleReferenceUpload(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* Page Count Slider */}
              <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-6">
                <label className="block text-white font-bold mb-3">
                  Number of Pages: <span className="text-accent-gold">{pageCount}</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="20"
                  value={pageCount}
                  onChange={(e) => setPageCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-brand-dark rounded-lg appearance-none cursor-pointer accent-accent-gold"
                />
                <div className="flex justify-between text-xs text-text-muted mt-2">
                  <span>5 pages</span>
                  <span>20 pages</span>
                </div>
              </div>

              {/* Image Preview Modal */}
              {previewImage && (
                <div
                  className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                  onClick={() => setPreviewImage(null)}
                >
                  <div className="relative max-w-2xl max-h-[80vh] w-full" onClick={(e) => e.stopPropagation()}>
                    <div className="relative aspect-square rounded-2xl overflow-hidden">
                      <Image
                        src={previewImage.url}
                        alt={previewImage.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="absolute top-4 left-4 bg-accent-gold text-brand-dark font-bold px-3 py-1.5 rounded-lg">
                      {previewImage.id}
                    </div>
                    <button
                      onClick={() => setPreviewImage(null)}
                      className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                    <p className="text-center text-white mt-4 font-medium">{previewImage.name}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="mt-10 flex justify-between items-center">
            <button
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-colors ${
                currentStepIndex === 0
                  ? "opacity-50 cursor-not-allowed text-text-muted"
                  : "text-white hover:text-accent-gold"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            {(currentStep === "crew" || currentStep === "describe") && (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className={`flex items-center gap-2 px-8 py-4 rounded-full font-extrabold transition-colors ${
                  canProceed()
                    ? "bg-accent-gold text-brand-dark hover:bg-accent-gold-light"
                    : "bg-brand-purple-muted text-text-muted cursor-not-allowed"
                }`}
              >
                Continue
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function CustomStoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CustomStoryPageInner />
    </Suspense>
  );
}
