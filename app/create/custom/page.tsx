"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function CustomStoryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>("crew");
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

  // Auth check
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch characters
        const res = await fetch("/api/characters");
        if (res.ok) {
          const data = await res.json();
          setCharacters(data.characters || []);
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
  }, [supabase.auth]);

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
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                      index < currentStepIndex
                        ? "bg-accent-gold text-brand-dark"
                        : index === currentStepIndex
                        ? "bg-accent-gold text-brand-dark"
                        : "bg-brand-purple-muted text-text-muted"
                    }`}
                  >
                    {index < currentStepIndex ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </div>
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

          {/* Coming Soon Banner */}
          <div className="bg-gradient-to-br from-accent-gold/20 to-accent-teal/20 border-2 border-dashed border-accent-gold/50 rounded-3xl p-8 text-center mb-8">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-3xl font-black text-white mb-4">Coming Soon!</h2>
            <p className="text-lg text-text-muted max-w-2xl mx-auto mb-6">
              We&apos;re building an amazing custom story creator where you can design your own adventures
              from scratch. Choose your crew, describe your story, pick an art style, and generate a
              completely unique book.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/create"
                className="bg-accent-gold text-brand-dark font-bold px-6 py-3 rounded-full hover:bg-accent-gold-light transition-colors"
              >
                Use existing adventures
              </Link>
              <Link
                href="/stories"
                className="border border-brand-purple-muted text-white font-bold px-6 py-3 rounded-full hover:border-accent-gold transition-colors"
              >
                Browse stories
              </Link>
            </div>
          </div>

          {/* Preview of what's coming */}
          <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-8">
            <h3 className="text-xl font-black text-white mb-6">What you&apos;ll be able to do:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent-gold/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                  👥
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">1. Choose your crew</h4>
                  <p className="text-sm text-text-muted">Select up to 5 characters from your crew to star in your story.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent-gold/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                  📝
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">2. Describe your book</h4>
                  <p className="text-sm text-text-muted">Give your book a title, choose a theme, and describe what happens.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent-gold/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                  🎨
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">3. Choose or create a style</h4>
                  <p className="text-sm text-text-muted">Pick from our art styles or upload reference images to create your own.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent-gold/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                  🖼️
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">4. Add reference photos</h4>
                  <p className="text-sm text-text-muted">Upload images to help guide the visual style of your book.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent-gold/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                  ✨
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">5. Generate your book</h4>
                  <p className="text-sm text-text-muted">AI creates your unique story with custom illustrations.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-accent-gold/20 rounded-2xl flex items-center justify-center text-2xl shrink-0">
                  ✏️
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">6. Edit & refine</h4>
                  <p className="text-sm text-text-muted">Adjust layouts, edit text, regenerate images, add or remove pages.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
