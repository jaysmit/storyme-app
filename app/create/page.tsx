"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

type Step = "crew" | "story" | "style" | "preview";

interface Character {
  id: string;
  name: string;
  photoUrl: string | null;
  generatedUrl: string | null;
  status: "pending" | "generating" | "completed" | "failed";
  type: "person" | "pet";
}

const stories = [
  {
    slug: "dragon-castle-valley",
    title: "The Dragon of Castle Valley",
    tagline: "A dragon guards the road to the glowing castle.",
    cast: 4,
    category: "fantasy",
  },
  {
    slug: "fairy-glade",
    title: "The Fairy Glade",
    tagline: "Follow the fireflies to where the fairies are waiting.",
    cast: 4,
    category: "magical",
  },
  {
    slug: "grand-final-day",
    title: "Grand Final Day",
    tagline: "One game, one final siren, one family cheering.",
    cast: 5,
    category: "sports",
  },
  {
    slug: "cloud-ship",
    title: "Captain of the Cloud Ship",
    tagline: "Take the helm of a flying ship through the clouds.",
    cast: 4,
    category: "adventure",
  },
  {
    slug: "super-squad",
    title: "The Super Squad",
    tagline: "Suit up to save the city from a cheeky sorceress.",
    cast: 4,
    category: "superhero",
  },
  {
    slug: "galaxy-road-trip",
    title: "The Great Galaxy Road Trip",
    tagline: "Blast off through the solar system and back before bedtime.",
    cast: 4,
    category: "space",
  },
];

const artStyles = [
  { slug: "glow", name: "Enchanted glow" },
  { slug: "watercolour", name: "Watercolour dream" },
  { slug: "sketch", name: "Pencil sketch" },
  { slug: "papercut", name: "Paper-cut" },
  { slug: "anim", name: "3D animated" },
  { slug: "silhouette", name: "Shadow silhouette" },
  { slug: "bricks", name: "Toy bricks" },
];

export default function CreatePage() {
  const [currentStep, setCurrentStep] = useState<Step>("crew");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedStory, setSelectedStory] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>("glow");
  const [dragOver, setDragOver] = useState(false);

  const steps: { key: Step; label: string; number: number }[] = [
    { key: "crew", label: "Gather crew", number: 1 },
    { key: "story", label: "Choose adventure", number: 2 },
    { key: "style", label: "Pick enchantment", number: 3 },
    { key: "preview", label: "Preview book", number: 4 },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

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
          const newChar: Character = {
            id: crypto.randomUUID(),
            name: file.name.replace(/\.[^/.]+$/, ""),
            photoUrl: reader.result as string,
            generatedUrl: null,
            status: "pending",
            type: "person",
          };
          setCharacters((prev) => [...prev, newChar]);
        };
        reader.readAsDataURL(file);
      });
    },
    []
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const newChar: Character = {
            id: crypto.randomUUID(),
            name: file.name.replace(/\.[^/.]+$/, ""),
            photoUrl: reader.result as string,
            generatedUrl: null,
            status: "pending",
            type: "person",
          };
          setCharacters((prev) => [...prev, newChar]);
        };
        reader.readAsDataURL(file);
      });
    },
    []
  );

  const removeCharacter = (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCharacterName = (id: string, name: string) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name } : c))
    );
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
                      i === currentStepIndex
                        ? "text-white"
                        : "text-text-muted"
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
              <h1 className="text-4xl font-black text-white mb-2">
                Gather your crew
              </h1>
              <p className="text-lg text-text-muted mb-8">
                Upload photos of the people who'll star in your story.
              </p>

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
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {characters.map((char) => (
                    <div
                      key={char.id}
                      className="bg-cream rounded-2xl p-4 flex flex-col gap-4"
                    >
                      <div className="relative grid grid-cols-2 gap-2">
                        {/* Photo */}
                        <div className="aspect-square rounded-xl overflow-hidden bg-[#EFE3C8]">
                          {char.photoUrl && (
                            <img
                              src={char.photoUrl}
                              alt={char.name}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        {/* Generated preview */}
                        <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-b from-[#6B5BB0] via-[#2A2470] to-[#1E1B4B] flex items-center justify-center">
                          {char.generatedUrl ? (
                            <img
                              src={char.generatedUrl}
                              alt={`${char.name} as character`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center text-[#C9C5EE] p-2">
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="#F4C95D"
                                className="mx-auto mb-1"
                              >
                                <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
                              </svg>
                              <span className="text-xs font-bold">
                                {char.status === "generating"
                                  ? "Creating..."
                                  : "Preview"}
                              </span>
                            </div>
                          )}
                        </div>
                        {/* Arrow */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-accent-gold flex items-center justify-center">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#14163A"
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          value={char.name}
                          onChange={(e) =>
                            updateCharacterName(char.id, e.target.value)
                          }
                          className="flex-1 px-3 py-2 rounded-lg border border-[#EADBBE] bg-white text-text-dark font-bold focus:outline-none focus:ring-2 focus:ring-accent-gold"
                          placeholder="Name"
                        />
                        <button
                          onClick={() => removeCharacter(char.id)}
                          className="w-10 h-10 rounded-full bg-[#FFE3E3] text-accent-rust flex items-center justify-center hover:bg-accent-rust hover:text-white transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
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
                    <div className="h-40 bg-gradient-to-br from-[#2C4F3E] to-[#1B1446] flex items-center justify-center text-text-muted text-sm">
                      [Cover]
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

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                {artStyles.map((style) => (
                  <button
                    key={style.slug}
                    onClick={() => setSelectedStyle(style.slug)}
                    className={`text-left flex flex-col gap-3 ${
                      selectedStyle === style.slug
                        ? "opacity-100"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div
                      className={`h-28 rounded-2xl bg-brand-dark flex items-center justify-center text-text-muted text-xs font-bold ${
                        selectedStyle === style.slug
                          ? "ring-3 ring-accent-gold"
                          : "ring-1 ring-brand-purple-muted"
                      }`}
                    >
                      Preview
                    </div>
                    <span
                      className={`text-sm font-extrabold ${
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
                <p className="text-text-muted mb-4">
                  {characters.length} characters ·{" "}
                  {artStyles.find((s) => s.slug === selectedStyle)?.name} style
                </p>
                <button className="bg-accent-gold text-brand-dark font-extrabold px-8 py-4 rounded-full hover:bg-accent-gold-light transition-colors">
                  Generate Preview
                </button>
                <p className="text-xs text-text-muted mt-4">
                  This will use AI to generate your book preview. Takes about
                  1-2 minutes.
                </p>
              </div>
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
