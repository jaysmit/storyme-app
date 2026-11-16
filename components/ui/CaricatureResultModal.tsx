"use client";

import { useState, useEffect, useRef } from "react";
import type { Character, IdentityProfile } from "@/lib/types";
import { TOKEN_COSTS } from "@/lib/types";

// Expanded color options with hex values
const HAIR_COLORS = [
  { value: "jet black", hex: "#0a0a0a" },
  { value: "black", hex: "#1a1a1a" },
  { value: "dark brown", hex: "#3b2314" },
  { value: "chocolate brown", hex: "#4a3222" },
  { value: "brown", hex: "#5c3a21" },
  { value: "chestnut", hex: "#6b4423" },
  { value: "light brown", hex: "#8b6742" },
  { value: "caramel", hex: "#a67b5b" },
  { value: "auburn", hex: "#8b4513" },
  { value: "copper", hex: "#b87333" },
  { value: "red", hex: "#8b0000" },
  { value: "ginger", hex: "#b06500" },
  { value: "strawberry blonde", hex: "#d4a574" },
  { value: "dirty blonde", hex: "#b89b72" },
  { value: "golden blonde", hex: "#daa520" },
  { value: "blonde", hex: "#e6c87a" },
  { value: "platinum blonde", hex: "#e8e4c9" },
  { value: "ash blonde", hex: "#c2b280" },
  { value: "silver", hex: "#c0c0c0" },
  { value: "gray", hex: "#808080" },
  { value: "salt and pepper", hex: "#696969" },
  { value: "white", hex: "#f5f5f5" },
];

const EYE_COLORS = [
  { value: "black", hex: "#1a1a1a" },
  { value: "dark brown", hex: "#3d2314" },
  { value: "brown", hex: "#634e34" },
  { value: "light brown", hex: "#8b7355" },
  { value: "amber", hex: "#c9a227" },
  { value: "hazel", hex: "#8e7618" },
  { value: "olive green", hex: "#556b2f" },
  { value: "green", hex: "#228b22" },
  { value: "emerald", hex: "#50c878" },
  { value: "teal", hex: "#008080" },
  { value: "blue-green", hex: "#0d98ba" },
  { value: "light blue", hex: "#87ceeb" },
  { value: "blue", hex: "#4169e1" },
  { value: "deep blue", hex: "#00008b" },
  { value: "gray", hex: "#708090" },
  { value: "violet", hex: "#8a2be2" },
];

const SKIN_TONES = [
  { value: "porcelain", hex: "#fdeef0" },
  { value: "fair", hex: "#fce5d8" },
  { value: "light", hex: "#f5d0b9" },
  { value: "light medium", hex: "#e8c4a8" },
  { value: "medium", hex: "#d4a574" },
  { value: "olive", hex: "#c19a6b" },
  { value: "warm beige", hex: "#c8a278" },
  { value: "tan", hex: "#b08968" },
  { value: "caramel", hex: "#a67b5b" },
  { value: "brown", hex: "#8b6f47" },
  { value: "warm brown", hex: "#7a5c3e" },
  { value: "deep brown", hex: "#5c4033" },
  { value: "dark brown", hex: "#4a3728" },
  { value: "ebony", hex: "#3d2b1f" },
  { value: "deep ebony", hex: "#2c1810" },
];

// Color swatch dropdown component with fixed positioning
function ColorSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; hex: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const selectedOption = options.find((o) => o.value === value) || options[0];

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 280; // max-h-70 (280px)

      // Check if dropdown would go below viewport
      const spaceBelow = viewportHeight - rect.bottom;
      const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      setDropdownStyle({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
        ...(openUpward
          ? { bottom: viewportHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }
        ),
      });
    }
  }, [isOpen]);

  return (
    <div>
      <label className="block text-xs text-text-muted mb-1.5">{label}</label>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2.5 rounded-xl bg-brand-dark border border-brand-purple-muted text-white focus:outline-none focus:ring-2 focus:ring-accent-gold disabled:opacity-50 flex items-center gap-3"
      >
        <div
          className="w-6 h-6 rounded-full border-2 border-white/30 shrink-0"
          style={{ backgroundColor: selectedOption?.hex }}
        />
        <span className="text-sm capitalize truncate">{selectedOption?.value}</span>
        <svg
          className={`w-4 h-4 ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-[60]"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown - fixed position relative to viewport */}
          <div
            className="bg-brand-purple border border-brand-purple-muted rounded-xl shadow-2xl z-[70] max-h-70 overflow-y-auto"
            style={dropdownStyle}
          >
            <div className="grid grid-cols-4 gap-1 p-2">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`group relative flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-brand-purple-muted transition-colors ${
                    value === option.value ? "bg-brand-purple-muted ring-2 ring-accent-gold" : ""
                  }`}
                  title={option.value}
                >
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white/20 group-hover:border-white/40 transition-colors"
                    style={{ backgroundColor: option.hex }}
                  />
                  <span className="text-[10px] text-text-muted capitalize text-center leading-tight line-clamp-2">
                    {option.value}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

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

  // Initialize values when character changes or after regeneration completes
  useEffect(() => {
    if (character && isOpen && !isRegenerating) {
      const profile = character.identity_profile;
      if (profile) {
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
        setAnalysisComplete(true);
      } else {
        // Run analysis to get initial values
        runAnalysis();
      }
    }
  }, [character?.id, character?.generated_image_url, isOpen, isRegenerating]);

  // Find closest matching option from a list
  function findClosestOption(
    value: string,
    options: { value: string; hex: string }[]
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

  // Clear changes and reset to original
  function handleClear() {
    setHairColor(originalHairColor);
    setEyeColor(originalEyeColor);
    setSkinTone(originalSkinTone);
  }

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
      // Close modal and trigger regeneration - modal will reopen with new result
      onRegenerate(profile);
    } else {
      onConfirm();
    }
  }

  if (!isOpen || !character) return null;

  // If regenerating, show loading state instead of modal content
  if (isRegenerating) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative bg-brand-purple rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl border border-brand-purple-muted p-8">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Regenerating...</h2>
            <p className="text-text-muted text-sm text-center">
              Creating a new caricature with your updated features
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-brand-purple rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl border border-brand-purple-muted max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-brand-purple-muted shrink-0">
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
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-brand-dark text-text-muted hover:text-white flex items-center justify-center transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
              <div className="aspect-square rounded-2xl overflow-hidden bg-brand-dark">
                <img
                  src={character.generated_image_url || character.original_photo_url}
                  alt="Generated caricature"
                  className="w-full h-full object-cover"
                />
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
              <div className="flex items-center justify-between">
                <p className="text-sm text-white font-bold">Adjust features</p>
                {hasChanges && (
                  <button
                    onClick={handleClear}
                    className="text-xs text-accent-gold hover:text-accent-gold-light flex items-center gap-1 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    Clear changes
                  </button>
                )}
              </div>

              {/* Hair color */}
              <ColorSelect
                label="Hair Color"
                value={hairColor}
                options={HAIR_COLORS}
                onChange={setHairColor}
                disabled={isRegenerating}
              />

              {/* Eye color */}
              <ColorSelect
                label="Eye Color"
                value={eyeColor}
                options={EYE_COLORS}
                onChange={setEyeColor}
                disabled={isRegenerating}
              />

              {/* Skin tone */}
              <ColorSelect
                label="Skin Tone"
                value={skinTone}
                options={SKIN_TONES}
                onChange={setSkinTone}
                disabled={isRegenerating}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-brand-purple-muted shrink-0">
          <button
            onClick={handleSubmit}
            disabled={isAnalyzing || (hasChanges && !canRegenerate)}
            className={`w-full py-4 rounded-full font-extrabold transition-colors flex items-center justify-center gap-2 ${
              hasChanges
                ? canRegenerate
                  ? "bg-accent-gold text-brand-dark hover:bg-accent-gold-light"
                  : "bg-gray-500 text-gray-300 cursor-not-allowed"
                : "bg-accent-teal text-brand-dark hover:bg-accent-teal/90"
            } disabled:opacity-50`}
          >
            {hasChanges ? (
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
