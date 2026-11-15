"use client";

import { useState, useEffect } from "react";
import type { Character, IdentityProfile } from "@/lib/types";
import { TOKEN_COSTS } from "@/lib/types";

// Color options for dropdowns
const HAIR_COLORS = [
  { value: "jet black", label: "Black" },
  { value: "dark brown", label: "Dark Brown" },
  { value: "brown", label: "Brown" },
  { value: "light brown", label: "Light Brown" },
  { value: "auburn", label: "Auburn" },
  { value: "red", label: "Red" },
  { value: "ginger", label: "Ginger" },
  { value: "strawberry blonde", label: "Strawberry Blonde" },
  { value: "blonde", label: "Blonde" },
  { value: "platinum blonde", label: "Platinum Blonde" },
  { value: "gray", label: "Gray" },
  { value: "silver", label: "Silver" },
  { value: "white", label: "White" },
];

const EYE_COLORS = [
  { value: "dark brown", label: "Dark Brown" },
  { value: "brown", label: "Brown" },
  { value: "hazel", label: "Hazel" },
  { value: "amber", label: "Amber" },
  { value: "green", label: "Green" },
  { value: "blue-green", label: "Blue-Green" },
  { value: "blue", label: "Blue" },
  { value: "light blue", label: "Light Blue" },
  { value: "gray", label: "Gray" },
];

const SKIN_TONES = [
  { value: "fair", label: "Fair" },
  { value: "light", label: "Light" },
  { value: "medium", label: "Medium" },
  { value: "olive", label: "Olive" },
  { value: "tan", label: "Tan" },
  { value: "brown", label: "Brown" },
  { value: "deep brown", label: "Deep Brown" },
  { value: "ebony", label: "Ebony" },
];

interface CaricatureResultModalProps {
  isOpen: boolean;
  character: Character | null;
  onConfirm: () => void;
  onRegenerate: (profile: IdentityProfile) => void;
  onClose: () => void;
  tokenBalance: number;
  isRegenerating?: boolean;
}

export default function CaricatureResultModal({
  isOpen,
  character,
  onConfirm,
  onRegenerate,
  onClose,
  tokenBalance,
  isRegenerating = false,
}: CaricatureResultModalProps) {
  // Feature state - initialized from character's identity_profile or defaults
  const [hairColor, setHairColor] = useState("");
  const [eyeColor, setEyeColor] = useState("");
  const [skinTone, setSkinTone] = useState("");
  const [hairStyle, setHairStyle] = useState("");

  // Track original values to detect changes
  const [originalHairColor, setOriginalHairColor] = useState("");
  const [originalEyeColor, setOriginalEyeColor] = useState("");
  const [originalSkinTone, setOriginalSkinTone] = useState("");

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Initialize values when character changes
  useEffect(() => {
    if (character && isOpen) {
      const profile = character.identity_profile;
      if (profile) {
        setHairColor(findClosestOption(profile.hair.color, HAIR_COLORS));
        setEyeColor(findClosestOption(profile.eyes.color, EYE_COLORS));
        setSkinTone(findClosestOption(profile.skinTone, SKIN_TONES));
        setHairStyle(profile.hair.style || "");

        setOriginalHairColor(findClosestOption(profile.hair.color, HAIR_COLORS));
        setOriginalEyeColor(findClosestOption(profile.eyes.color, EYE_COLORS));
        setOriginalSkinTone(findClosestOption(profile.skinTone, SKIN_TONES));
        setAnalysisComplete(true);
      } else {
        // Run analysis to get initial values
        runAnalysis();
      }
    }
  }, [character?.id, isOpen]);

  // Find closest matching option from a list
  function findClosestOption(
    value: string,
    options: { value: string; label: string }[]
  ): string {
    if (!value) return options[0]?.value || "";
    const lower = value.toLowerCase();

    // Exact match
    const exact = options.find((o) => o.value === lower);
    if (exact) return exact.value;

    // Partial match
    const partial = options.find(
      (o) => lower.includes(o.value) || o.value.includes(lower)
    );
    if (partial) return partial.value;

    // Return first option as default
    return options[0]?.value || "";
  }

  async function runAnalysis() {
    if (!character) return;
    setIsAnalyzing(true);

    try {
      const res = await fetch(`/api/characters/${character.id}/analyze`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        const profile = data.identityProfile as IdentityProfile;

        const hair = findClosestOption(profile.hair.color, HAIR_COLORS);
        const eye = findClosestOption(profile.eyes.color, EYE_COLORS);
        const skin = findClosestOption(profile.skinTone, SKIN_TONES);

        setHairColor(hair);
        setEyeColor(eye);
        setSkinTone(skin);
        setHairStyle(profile.hair.style || "");

        setOriginalHairColor(hair);
        setOriginalEyeColor(eye);
        setOriginalSkinTone(skin);
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      // Set defaults if analysis fails
      setHairColor(HAIR_COLORS[0].value);
      setEyeColor(EYE_COLORS[0].value);
      setSkinTone(SKIN_TONES[0].value);
      setOriginalHairColor(HAIR_COLORS[0].value);
      setOriginalEyeColor(EYE_COLORS[0].value);
      setOriginalSkinTone(SKIN_TONES[0].value);
    }

    setIsAnalyzing(false);
    setAnalysisComplete(true);
  }

  const hasChanges =
    hairColor !== originalHairColor ||
    eyeColor !== originalEyeColor ||
    skinTone !== originalSkinTone;

  const tokenCost = hasChanges ? TOKEN_COSTS.CHARACTER_ILLUSTRATION : 0;
  const canRegenerate = hasChanges && tokenBalance >= tokenCost;

  function handleSubmit() {
    if (hasChanges) {
      // Build profile with changes and regenerate
      const profile: IdentityProfile = {
        version: 1,
        extractedAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        hair: {
          color: hairColor,
          style: hairStyle || "natural",
        },
        eyes: {
          color: eyeColor,
        },
        skinTone,
        distinctiveFeatures: character?.identity_profile?.distinctiveFeatures || [],
        uncertainAttributes: [],
      };
      onRegenerate(profile);
    } else {
      onConfirm();
    }
  }

  if (!isOpen || !character) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={isRegenerating ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative bg-brand-purple rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl border border-brand-purple-muted">
        {/* Header */}
        <div className="p-6 border-b border-brand-purple-muted">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white">
                {character.name}&apos;s Caricature
              </h2>
              <p className="text-sm text-text-muted mt-1">
                {hasChanges
                  ? "Review your changes before regenerating"
                  : "Looking good! Confirm or adjust features below"}
              </p>
            </div>
            {!isRegenerating && (
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-brand-dark text-text-muted hover:text-white flex items-center justify-center transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Image comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Original */}
            <div>
              <p className="text-xs text-text-muted mb-2 text-center">Original</p>
              <div className="aspect-square rounded-2xl overflow-hidden bg-brand-dark">
                <img
                  src={character.original_photo_url}
                  alt="Original photo"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {/* Generated */}
            <div>
              <p className="text-xs text-text-muted mb-2 text-center">Caricature</p>
              <div className="aspect-square rounded-2xl overflow-hidden bg-brand-dark relative">
                {isRegenerating ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-white text-sm font-medium">Regenerating...</p>
                  </div>
                ) : (
                  <img
                    src={character.generated_image_url || character.original_photo_url}
                    alt="Generated caricature"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Feature editing */}
          {isAnalyzing ? (
            <div className="flex items-center justify-center gap-3 py-4">
              <div className="w-5 h-5 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
              <p className="text-text-muted text-sm">Analyzing features...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-white font-bold">Adjust features</p>

              {/* Hair color */}
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Hair Color</label>
                <select
                  value={hairColor}
                  onChange={(e) => setHairColor(e.target.value)}
                  disabled={isRegenerating}
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white focus:outline-none focus:ring-2 focus:ring-accent-gold disabled:opacity-50"
                >
                  {HAIR_COLORS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Eye color */}
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Eye Color</label>
                <select
                  value={eyeColor}
                  onChange={(e) => setEyeColor(e.target.value)}
                  disabled={isRegenerating}
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white focus:outline-none focus:ring-2 focus:ring-accent-gold disabled:opacity-50"
                >
                  {EYE_COLORS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Skin tone */}
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Skin Tone</label>
                <select
                  value={skinTone}
                  onChange={(e) => setSkinTone(e.target.value)}
                  disabled={isRegenerating}
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white focus:outline-none focus:ring-2 focus:ring-accent-gold disabled:opacity-50"
                >
                  {SKIN_TONES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-brand-purple-muted">
          <button
            onClick={handleSubmit}
            disabled={isRegenerating || isAnalyzing || (hasChanges && !canRegenerate)}
            className={`w-full py-4 rounded-full font-extrabold transition-colors flex items-center justify-center gap-2 ${
              hasChanges
                ? canRegenerate
                  ? "bg-accent-gold text-brand-dark hover:bg-accent-gold-light"
                  : "bg-gray-500 text-gray-300 cursor-not-allowed"
                : "bg-accent-teal text-brand-dark hover:bg-accent-teal/90"
            } disabled:opacity-50`}
          >
            {isRegenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                Regenerating...
              </>
            ) : hasChanges ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 4v6h6M23 20v-6h-6" />
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                </svg>
                Regenerate ({tokenCost} token{tokenCost !== 1 ? "s" : ""})
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Confirm (0 tokens)
              </>
            )}
          </button>

          {hasChanges && !canRegenerate && (
            <p className="text-xs text-red-400 text-center mt-2">
              Not enough tokens. You have {tokenBalance}, need {tokenCost}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
