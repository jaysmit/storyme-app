"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import { createClient } from "@/lib/supabase/client";
import type { Character } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

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

  // Step 4: Reference images
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

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

          {/* Step 2: Describe Book (Coming Soon) */}
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

              {/* Coming Soon Banner */}
              <div className="bg-gradient-to-br from-accent-gold/20 to-accent-teal/20 border-2 border-dashed border-accent-gold/50 rounded-3xl p-8 text-center">
                <div className="text-6xl mb-4">🚧</div>
                <h2 className="text-3xl font-black text-white mb-4">Coming Soon!</h2>
                <p className="text-lg text-text-muted max-w-2xl mx-auto mb-6">
                  The custom story creator is under development. Soon you&apos;ll be able to describe your
                  own unique adventure with custom plots, settings, and scenes.
                </p>

                {/* Show selected crew */}
                {orderedCharacterIds.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm text-text-muted mb-3">Your selected crew:</p>
                    <div className="flex justify-center gap-2">
                      {getSelectedCharactersInOrder().map((char, index) => (
                        <div
                          key={char.id}
                          className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-accent-gold"
                          title={char.name}
                        >
                          {char.generated_image_url || char.original_photo_url ? (
                            <img
                              src={char.generated_image_url || char.original_photo_url || ""}
                              alt={char.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-brand-purple flex items-center justify-center text-white font-bold">
                              {char.name.charAt(0)}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent-gold rounded-full flex items-center justify-center text-brand-dark text-xs font-bold">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Link
                  href={getPremadeAdventureUrl()}
                  className="inline-block bg-accent-gold text-brand-dark font-bold px-8 py-4 rounded-full hover:bg-accent-gold-light transition-colors"
                >
                  Use premade adventures for now
                </Link>
              </div>

              {/* Preview of what's coming */}
              <div className="mt-8 bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-8">
                <h3 className="text-xl font-black text-white mb-6">What you&apos;ll be able to do:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-accent-gold/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                      📝
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">Title & Theme</h4>
                      <p className="text-sm text-text-muted">Name your book and choose a theme like adventure, fantasy, or sports.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-accent-gold/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                      📖
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">Story Description</h4>
                      <p className="text-sm text-text-muted">Describe what happens in your story - the plot, settings, and key moments.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-accent-gold/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                      🎨
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">Art Style</h4>
                      <p className="text-sm text-text-muted">Choose from preset styles or upload reference images for a custom look.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-accent-gold/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                      ✨
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-1">AI Generation</h4>
                      <p className="text-sm text-text-muted">Our AI creates unique illustrations and brings your story to life.</p>
                    </div>
                  </div>
                </div>
              </div>
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

            {currentStep === "crew" && (
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
