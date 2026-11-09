"use client";

import { useState, useEffect } from "react";
import type { IdentityProfile, Character } from "@/lib/types";

interface IdentityConfirmModalProps {
  isOpen: boolean;
  character: Character | null;
  identityProfile: IdentityProfile | null;
  onConfirm: (profile: IdentityProfile) => void;
  onSkip: () => void;
  onClose: () => void;
  isAnalyzing?: boolean;
}

export default function IdentityConfirmModal({
  isOpen,
  character,
  identityProfile,
  onConfirm,
  onSkip,
  onClose,
  isAnalyzing = false,
}: IdentityConfirmModalProps) {
  // Local editable state
  const [hairColor, setHairColor] = useState("");
  const [hairStyle, setHairStyle] = useState("");
  const [eyeColor, setEyeColor] = useState("");
  const [skinTone, setSkinTone] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [faceShape, setFaceShape] = useState("");
  const [hairTexture, setHairTexture] = useState("");
  const [hairLength, setHairLength] = useState("");
  const [distinctiveFeatures, setDistinctiveFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState("");

  // Sync local state when profile changes
  useEffect(() => {
    if (identityProfile) {
      setHairColor(identityProfile.hair.color || "");
      setHairStyle(identityProfile.hair.style || "");
      setEyeColor(identityProfile.eyes.color || "");
      setSkinTone(identityProfile.skinTone || "");
      setFaceShape(identityProfile.faceShape || "");
      setHairTexture(identityProfile.hair.texture || "");
      setHairLength(identityProfile.hair.length || "");
      setDistinctiveFeatures(identityProfile.distinctiveFeatures || []);
    }
  }, [identityProfile]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!identityProfile) return;

    const confirmedProfile: IdentityProfile = {
      ...identityProfile,
      confirmedAt: new Date().toISOString(),
      hair: {
        color: hairColor,
        style: hairStyle,
        texture: hairTexture || undefined,
        length: hairLength || undefined,
      },
      eyes: {
        color: eyeColor,
        shape: identityProfile.eyes.shape,
      },
      skinTone,
      faceShape: faceShape || undefined,
      distinctiveFeatures,
    };

    onConfirm(confirmedProfile);
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setDistinctiveFeatures((prev) => [...prev, newFeature.trim()]);
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setDistinctiveFeatures((prev) => prev.filter((_, i) => i !== index));
  };

  const hasUncertainAttributes =
    identityProfile?.uncertainAttributes &&
    identityProfile.uncertainAttributes.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-brand-purple rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl border border-brand-purple-muted max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-brand-purple-muted shrink-0">
          <h2 className="text-xl font-black text-white mb-1">
            Confirm identity profile
          </h2>
          <p className="text-sm text-text-muted">
            Review and correct these attributes to ensure consistent character
            appearance
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-white font-bold">Analyzing photo...</p>
              <p className="text-text-muted text-sm mt-1">
                Extracting physical attributes
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Photo preview */}
              <div>
                <div className="aspect-square bg-brand-dark rounded-2xl overflow-hidden">
                  {character?.original_photo_url && (
                    <img
                      src={character.original_photo_url}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                {character && (
                  <p className="text-white font-bold text-center mt-3">
                    {character.name}
                  </p>
                )}
              </div>

              {/* Right: Form */}
              <div className="space-y-4">
                {/* Uncertain attributes warning */}
                {hasUncertainAttributes && (
                  <div className="bg-accent-gold/20 border border-accent-gold/50 rounded-xl p-3">
                    <p className="text-accent-gold font-bold text-sm mb-1">
                      Some attributes need your input
                    </p>
                    <ul className="text-xs text-accent-gold/80 space-y-0.5">
                      {identityProfile?.uncertainAttributes.map((attr, i) => (
                        <li key={i}>• {attr}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Primary attributes */}
                <div>
                  <label className="block text-sm font-bold text-white mb-1.5">
                    Hair color
                  </label>
                  <input
                    type="text"
                    value={hairColor}
                    onChange={(e) => setHairColor(e.target.value)}
                    placeholder="e.g., dark brown, sandy blonde"
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-1.5">
                    Eye color
                  </label>
                  <input
                    type="text"
                    value={eyeColor}
                    onChange={(e) => setEyeColor(e.target.value)}
                    placeholder="e.g., bright blue, warm brown"
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-1.5">
                    Skin tone
                  </label>
                  <input
                    type="text"
                    value={skinTone}
                    onChange={(e) => setSkinTone(e.target.value)}
                    placeholder="e.g., fair, olive, medium brown"
                    className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold"
                  />
                </div>

                {/* Advanced toggle */}
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-accent-gold hover:underline flex items-center gap-1"
                >
                  {showAdvanced ? "Hide" : "Show"} advanced options
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`transform transition-transform ${
                      showAdvanced ? "rotate-180" : ""
                    }`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {/* Advanced attributes */}
                {showAdvanced && (
                  <div className="space-y-4 pt-2 border-t border-brand-purple-muted">
                    <div>
                      <label className="block text-sm font-bold text-white mb-1.5">
                        Hair style
                      </label>
                      <input
                        type="text"
                        value={hairStyle}
                        onChange={(e) => setHairStyle(e.target.value)}
                        placeholder="e.g., short and neat, long and wavy"
                        className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-white mb-1.5">
                          Hair texture
                        </label>
                        <select
                          value={hairTexture}
                          onChange={(e) => setHairTexture(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white focus:outline-none focus:ring-2 focus:ring-accent-gold"
                        >
                          <option value="">Select...</option>
                          <option value="straight">Straight</option>
                          <option value="wavy">Wavy</option>
                          <option value="curly">Curly</option>
                          <option value="coily">Coily</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-white mb-1.5">
                          Hair length
                        </label>
                        <select
                          value={hairLength}
                          onChange={(e) => setHairLength(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white focus:outline-none focus:ring-2 focus:ring-accent-gold"
                        >
                          <option value="">Select...</option>
                          <option value="short">Short</option>
                          <option value="medium">Medium</option>
                          <option value="long">Long</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-white mb-1.5">
                        Face shape
                      </label>
                      <select
                        value={faceShape}
                        onChange={(e) => setFaceShape(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white focus:outline-none focus:ring-2 focus:ring-accent-gold"
                      >
                        <option value="">Select...</option>
                        <option value="oval">Oval</option>
                        <option value="round">Round</option>
                        <option value="square">Square</option>
                        <option value="heart-shaped">Heart-shaped</option>
                        <option value="oblong">Oblong</option>
                      </select>
                    </div>

                    {/* Distinctive features */}
                    <div>
                      <label className="block text-sm font-bold text-white mb-1.5">
                        Distinctive features
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addFeature()}
                          placeholder="e.g., freckles, dimples, glasses"
                          className="flex-1 px-4 py-2 rounded-xl bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold text-sm"
                        />
                        <button
                          onClick={addFeature}
                          className="px-4 py-2 rounded-xl bg-brand-dark border border-brand-purple-muted text-accent-gold hover:bg-brand-purple-muted transition-colors"
                        >
                          Add
                        </button>
                      </div>
                      {distinctiveFeatures.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {distinctiveFeatures.map((feature, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-brand-dark text-white text-sm"
                            >
                              {feature}
                              <button
                                onClick={() => removeFeature(i)}
                                className="text-text-muted hover:text-red-400"
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!isAnalyzing && (
          <div className="p-6 border-t border-brand-purple-muted shrink-0">
            <div className="flex gap-3">
              <button
                onClick={onSkip}
                className="flex-1 py-3 rounded-full border border-brand-purple-muted text-text-muted font-bold hover:text-white hover:border-text-muted transition-colors"
              >
                Skip (use defaults)
              </button>
              <button
                onClick={handleConfirm}
                disabled={!hairColor || !eyeColor || !skinTone}
                className="flex-1 py-3 rounded-full bg-accent-gold text-brand-dark font-extrabold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-gold-light transition-colors flex items-center justify-center gap-2"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Confirm & Generate
              </button>
            </div>
            <p className="text-xs text-text-muted text-center mt-3">
              These attributes will be locked for all book illustrations
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
