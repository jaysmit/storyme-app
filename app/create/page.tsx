"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import CharacterCard from "@/components/CharacterCard";
import BookViewer from "@/components/BookViewer";
import type { LocalCharacter } from "@/lib/types";

interface PreviewPage {
  page_number: number;
  url: string;
  title: string;
}

type Step = "crew" | "story" | "style" | "preview";

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
  const [currentStep, setCurrentStep] = useState<Step>("crew");
  const [characters, setCharacters] = useState<LocalCharacter[]>([]);
  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>("glow");
  const [dragOver, setDragOver] = useState(false);
  const [crewName, setCrewName] = useState("");
  const [showSaveCrew, setShowSaveCrew] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Book preview state
  const [previewPages, setPreviewPages] = useState<PreviewPage[]>([]);
  const [generatingBook, setGeneratingBook] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [showBookViewer, setShowBookViewer] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  const steps: { key: Step; label: string; number: number }[] = [
    { key: "crew", label: "Gather crew", number: 1 },
    { key: "story", label: "Choose adventure", number: 2 },
    { key: "style", label: "Pick enchantment", number: 3 },
    { key: "preview", label: "Preview book", number: 4 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  const addCharacterFromFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const newChar: LocalCharacter = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
        photoUrl: reader.result as string,
        photoFile: file,
        generatedUrl: null,
        status: "pending",
        type: "person",
        ageGroup: null,
      };
      setCharacters((prev) => [...prev, newChar]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      files.forEach(addCharacterFromFile);
    },
    [addCharacterFromFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach(addCharacterFromFile);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [addCharacterFromFile]
  );

  const removeCharacter = (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCharacterName = (id: string, name: string) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name } : c))
    );
  };

  const generateCharacter = async (id: string) => {
    // Update status to generating
    setCharacters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "generating" } : c))
    );

    // In a real implementation, this would:
    // 1. Upload the photo to Supabase Storage
    // 2. Call the generate API
    // 3. Update with the generated image URL

    // For now, simulate with a timeout
    setTimeout(() => {
      setCharacters((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                status: "completed",
                // Use a placeholder for now
                generatedUrl: c.photoUrl,
              }
            : c
        )
      );
    }, 2000);
  };

  const generateAllCharacters = async () => {
    setGenerating(true);
    // Generate all pending characters sequentially
    for (const char of characters) {
      if (char.status === "pending" && !char.generatedUrl) {
        await generateCharacter(char.id);
        // Wait a bit between generations
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    setGenerating(false);
  };

  // Helper to generate placeholder image URL
  const getPlaceholderUrl = (text: string) => {
    return `/api/placeholder/900/506?text=${encodeURIComponent(text)}`;
  };

  // Demo story scenes for preview (used when API is not available)
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

  const generateBookPreview = async () => {
    if (!selectedStory) return;

    setGeneratingBook(true);
    setBookError(null);
    setGenerationProgress(0);

    try {
      // Try to call the real API first
      const response = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storySlug: selectedStory,
          artStyle: selectedStyle,
          characters: characters.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
          })),
        }),
      });

      if (response.ok) {
        const { book } = await response.json();

        // Start generation
        setGenerationProgress(10);

        const genResponse = await fetch(`/api/books/${book.id}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storySlug: selectedStory,
            artStyle: selectedStyle,
            characters: characters.map((c) => ({
              id: c.id,
              name: c.name,
              type: c.type,
            })),
          }),
        });

        if (genResponse.ok) {
          const { pages } = await genResponse.json();
          setPreviewPages(pages);
          setShowBookViewer(true);
          setGenerationProgress(100);
        } else {
          throw new Error("Generation failed");
        }
      } else {
        // Fall back to demo mode if API fails (Supabase not configured)
        console.log("API not available, using demo mode");
        await simulateDemoGeneration();
      }
    } catch (error) {
      console.log("Using demo mode due to:", error);
      // Use demo mode
      await simulateDemoGeneration();
    }

    setGeneratingBook(false);
  };

  const simulateDemoGeneration = async () => {
    // Simulate generation progress
    for (let i = 1; i <= 3; i++) {
      setGenerationProgress((i / 3) * 100);
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Use demo pages
    const pages = demoScenes[selectedStory || "dragon-castle-valley"] || demoScenes["dragon-castle-valley"];
    setPreviewPages(pages);
    setShowBookViewer(true);
  };

  const canProceed = () => {
    switch (currentStep) {
      case "crew":
        return characters.length > 0;
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
          {/* Step 1: Gather Crew */}
          {currentStep === "crew" && (
            <div>
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-4xl font-black text-white mb-2">
                    Gather your crew
                  </h1>
                  <p className="text-lg text-text-muted">
                    Upload photos of the people who'll star in your story.
                  </p>
                </div>
                {characters.length > 0 && (
                  <button
                    onClick={() => setShowSaveCrew(true)}
                    className="px-4 py-2 rounded-full border border-brand-purple-muted text-text-muted hover:border-accent-gold hover:text-white transition-colors text-sm font-bold"
                  >
                    Save as crew
                  </button>
                )}
              </div>

              {/* Upload area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-3xl p-12 text-center transition-colors ${
                  dragOver
                    ? "border-accent-gold bg-accent-gold/10"
                    : "border-brand-purple-muted"
                }`}
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#F4C95D"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mx-auto mb-4"
                >
                  <path d="M4 7h3l2-3h6l2 3h3v13H4z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <p className="text-white font-bold mb-2">
                  Drag photos here or click to browse
                </p>
                <p className="text-text-muted text-sm mb-4">
                  Upload clear, front-facing photos. One photo per person.
                </p>
                <label className="inline-block bg-accent-gold text-brand-dark font-extrabold px-6 py-3 rounded-full cursor-pointer hover:bg-accent-gold-light transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  Choose photos
                </label>
              </div>

              {/* Character list */}
              {characters.length > 0 && (
                <>
                  <div className="mt-8 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">
                      Your crew ({characters.length})
                    </h2>
                    <button
                      onClick={generateAllCharacters}
                      disabled={generating || characters.every((c) => c.generatedUrl)}
                      className="px-4 py-2 rounded-full bg-accent-gold text-brand-dark font-bold text-sm hover:bg-accent-gold-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {generating ? (
                        <>
                          <span className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
                          </svg>
                          Generate all previews
                        </>
                      )}
                    </button>
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {characters.map((char) => (
                      <CharacterCard
                        key={char.id}
                        character={char}
                        onRemove={removeCharacter}
                        onUpdateName={updateCharacterName}
                        onGenerate={generateCharacter}
                        showGenerateButton
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Save Crew Modal */}
              {showSaveCrew && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
                  <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-8 max-w-md w-full">
                    <h2 className="text-2xl font-black text-white mb-4">
                      Save this crew
                    </h2>
                    <p className="text-text-muted mb-6">
                      Give your crew a name so you can use them again later.
                    </p>
                    <input
                      type="text"
                      value={crewName}
                      onChange={(e) => setCrewName(e.target.value)}
                      placeholder="e.g., The Smith Family"
                      className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold mb-6"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowSaveCrew(false)}
                        className="flex-1 px-4 py-3 rounded-full border border-brand-purple-muted text-text-muted hover:text-white transition-colors font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          // TODO: Save crew to API
                          setShowSaveCrew(false);
                          setCrewName("");
                        }}
                        disabled={!crewName.trim()}
                        className="flex-1 px-4 py-3 rounded-full bg-accent-gold text-brand-dark font-extrabold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-gold-light transition-colors"
                      >
                        Save crew
                      </button>
                    </div>
                  </div>
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
                Pick a world for your crew to explore.
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
                // Book Viewer
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

                  {/* Call to action */}
                  <div className="mt-8 bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-8 text-center">
                    <h3 className="text-2xl font-black text-white mb-2">
                      Love your preview?
                    </h3>
                    <p className="text-text-muted mb-6">
                      Order the full 24-page printed storybook with all your characters.
                    </p>
                    <button className="bg-accent-gold text-brand-dark font-extrabold px-8 py-4 rounded-full hover:bg-accent-gold-light transition-colors">
                      Order Printed Book — $49.95
                    </button>
                    <p className="text-xs text-text-muted mt-4">
                      Includes hardcover book + digital PDF download
                    </p>
                  </div>
                </div>
              ) : generatingBook ? (
                // Generating state
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
                // Generate button
                <div className="text-center">
                  <h1 className="text-4xl font-black text-white mb-2">
                    Your book is ready to preview
                  </h1>
                  <p className="text-lg text-text-muted mb-8">
                    We'll generate your storybook pages with your crew.
                  </p>

                  <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-8 max-w-lg mx-auto">
                    <div className="text-6xl mb-4">📚</div>
                    <h2 className="text-2xl font-black text-white mb-2">
                      {stories.find((s) => s.slug === selectedStory)?.title}
                    </h2>
                    <p className="text-text-muted mb-6">
                      {characters.length} character{characters.length !== 1 && "s"} ·{" "}
                      {artStyles.find((s) => s.slug === selectedStyle)?.name} style
                    </p>

                    {/* Character preview row */}
                    <div className="flex justify-center gap-2 mb-6">
                      {characters.slice(0, 5).map((char) => (
                        <div
                          key={char.id}
                          className="w-12 h-12 rounded-full overflow-hidden bg-brand-dark border-2 border-accent-gold"
                        >
                          {(char.generatedUrl || char.photoUrl) && (
                            <img
                              src={char.generatedUrl || char.photoUrl || ""}
                              alt={char.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      ))}
                      {characters.length > 5 && (
                        <div className="w-12 h-12 rounded-full bg-brand-purple-muted flex items-center justify-center text-text-muted text-sm font-bold">
                          +{characters.length - 5}
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

      <Footer />
    </div>
  );
}
