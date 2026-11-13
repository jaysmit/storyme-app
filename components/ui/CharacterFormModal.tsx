"use client";

import { useState, useEffect, useCallback } from "react";

const PET_TYPES = [
  "Dog",
  "Cat",
  "Rabbit",
  "Hamster",
  "Guinea Pig",
  "Bird",
  "Fish",
  "Turtle",
  "Horse",
];

// Helper to get default height from age
function getDefaultHeight(age: number | null): number | null {
  if (age === null) return null;
  if (age < 1) return 70;
  if (age < 2) return 85;
  if (age < 3) return 95;
  if (age < 4) return 100;
  if (age < 5) return 107;
  if (age < 6) return 115;
  if (age < 7) return 120;
  if (age < 8) return 127;
  if (age < 9) return 132;
  if (age < 10) return 137;
  if (age < 11) return 142;
  if (age < 12) return 150;
  if (age < 13) return 156;
  if (age < 14) return 163;
  if (age < 15) return 168;
  if (age < 16) return 172;
  if (age < 18) return 175;
  return 170; // Adult default
}

export interface PendingCharacter {
  id: string;
  name: string;
  photoBase64: string;
  characterType: "person" | "pet" | "other";
  petType: string;
  customType: string;
  age: number | null; // Age in years for proportionate sizing
  height_cm: number | null; // Height in centimeters
  saving: boolean;
}

interface CharacterFormModalProps {
  pendingCharacter: PendingCharacter | null;
  onUpdate: (id: string, updates: Partial<PendingCharacter>) => void;
  onSave: (pending: PendingCharacter) => void;
  onCancel: (id: string) => void;
  remainingCount: number;
}

export default function CharacterFormModal({
  pendingCharacter,
  onUpdate,
  onSave,
  onCancel,
  remainingCount,
}: CharacterFormModalProps) {
  const [localName, setLocalName] = useState("");
  const [localType, setLocalType] = useState<"person" | "pet" | "other">("person");
  const [localPetType, setLocalPetType] = useState("");
  const [localCustomType, setLocalCustomType] = useState("");
  const [localAge, setLocalAge] = useState<number | null>(null);
  const [localHeight, setLocalHeight] = useState<number | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Sync local state when pendingCharacter changes
  useEffect(() => {
    if (pendingCharacter) {
      setLocalName(pendingCharacter.name);
      setLocalType(pendingCharacter.characterType);
      setLocalPetType(pendingCharacter.petType);
      setLocalCustomType(pendingCharacter.customType);
      setLocalAge(pendingCharacter.age);
      setLocalHeight(pendingCharacter.height_cm);
      setShowConfirmClose(false);
    }
  }, [pendingCharacter?.id]);

  // Auto-update height when age changes (if height not manually set)
  const handleAgeChange = (newAge: number | null) => {
    setLocalAge(newAge);
    // Auto-set height based on age if not already set or if it matches the old default
    const oldDefault = getDefaultHeight(localAge);
    const newDefault = getDefaultHeight(newAge);
    if (localHeight === null || localHeight === oldDefault) {
      setLocalHeight(newDefault);
    }
  };

  // Attempt to close - show confirmation
  const attemptClose = useCallback(() => {
    if (pendingCharacter?.saving) return;
    setShowConfirmClose(true);
  }, [pendingCharacter?.saving]);

  // Confirm discard
  const confirmDiscard = useCallback(() => {
    if (pendingCharacter) {
      onCancel(pendingCharacter.id);
    }
    setShowConfirmClose(false);
  }, [pendingCharacter, onCancel]);

  // Continue editing
  const continueEditing = useCallback(() => {
    setShowConfirmClose(false);
  }, []);

  if (!pendingCharacter) return null;

  const isValid = () => {
    if (!localName.trim()) return false;
    if (localType === "pet" && !localPetType) return false;
    if (localType === "other" && !localCustomType.trim()) return false;
    return true;
  };

  const handleSave = () => {
    if (!isValid()) return;
    // Update the pending character with local values and trigger save
    const updated: PendingCharacter = {
      ...pendingCharacter,
      name: localName,
      characterType: localType,
      petType: localPetType,
      customType: localCustomType,
      age: localAge,
      height_cm: localHeight,
    };
    onSave(updated);
  };

  // Confirmation dialog when trying to close
  if (showConfirmClose) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative bg-brand-purple rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-brand-purple-muted text-center">
          <div className="w-16 h-16 rounded-full bg-accent-gold/20 mx-auto mb-4 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F4C95D" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            Leave without saving?
          </h3>
          <p className="text-text-muted text-sm mb-6">
            This photo hasn&apos;t been added as a character yet. Are you sure you want to remove it?
          </p>
          <div className="flex gap-3">
            <button
              onClick={confirmDiscard}
              className="flex-1 py-3 rounded-full border border-red-500/50 text-red-400 font-bold hover:bg-red-500/20 transition-colors"
            >
              Remove photo
            </button>
            <button
              onClick={continueEditing}
              className="flex-1 py-3 rounded-full bg-accent-gold text-brand-dark font-extrabold hover:bg-accent-gold-light transition-colors"
            >
              Keep editing
            </button>
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
        onClick={attemptClose}
      />

      {/* Modal */}
      <div className="relative bg-brand-purple rounded-3xl overflow-hidden max-w-md w-full shadow-2xl border border-brand-purple-muted">
        {/* Header with image */}
        <div className="relative">
          <div className="aspect-square max-h-72 bg-brand-dark">
            <img
              src={pendingCharacter.photoBase64}
              alt="New character"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Close button */}
          {!pendingCharacter.saving && (
            <button
              onClick={attemptClose}
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
              title="Cancel"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Remaining count badge */}
          {remainingCount > 0 && (
            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm font-bold">
              +{remainingCount} more
            </div>
          )}

          {/* Saving overlay */}
          {pendingCharacter.saving && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-white font-bold">Creating character...</p>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-black text-white mb-1">Add character details</h2>
            <p className="text-sm text-text-muted">Who is this? Tell us a bit about them.</p>
          </div>

          {/* Name input */}
          <div>
            <label className="block text-sm font-bold text-white mb-1.5">Name</label>
            <input
              type="text"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              placeholder="Enter their name..."
              disabled={pendingCharacter.saving}
              className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold disabled:opacity-50"
              autoFocus
            />
          </div>

          {/* Age and Height inputs - only for people */}
          {localType === "person" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-white mb-1.5">Age</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={localAge ?? ""}
                      onChange={(e) => handleAgeChange(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Years"
                      disabled={pendingCharacter.saving}
                      className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold disabled:opacity-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-white mb-1.5">Height</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="50"
                      max="220"
                      value={localHeight ?? ""}
                      onChange={(e) => setLocalHeight(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="cm"
                      disabled={pendingCharacter.saving}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold disabled:opacity-50"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-sm">cm</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-text-muted -mt-2">
                {localAge !== null && localAge > 0 && (
                  <>
                    {localAge <= 3 ? "👶 Toddler" :
                     localAge <= 12 ? "🧒 Child" :
                     localAge <= 17 ? "🧑 Teen" :
                     localAge <= 64 ? "🧑 Adult" :
                     "👴 Senior"}
                    {" • "}
                  </>
                )}
                Age and height help create accurate proportions in illustrations
              </p>
            </>
          )}

          {/* Character type toggle */}
          <div>
            <label className="block text-sm font-bold text-white mb-1.5">Type</label>
            <div className="flex gap-2">
              {(["person", "pet", "other"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setLocalType(type);
                    setLocalPetType("");
                    setLocalCustomType("");
                  }}
                  disabled={pendingCharacter.saving}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${
                    localType === type
                      ? "bg-accent-gold text-brand-dark"
                      : "bg-brand-dark text-text-muted hover:text-white border border-brand-purple-muted"
                  }`}
                >
                  {type === "person" ? "👤 Person" : type === "pet" ? "🐾 Pet" : "✨ Other"}
                </button>
              ))}
            </div>
          </div>

          {/* Pet type dropdown */}
          {localType === "pet" && (
            <div>
              <label className="block text-sm font-bold text-white mb-1.5">What kind of pet?</label>
              <select
                value={localPetType}
                onChange={(e) => setLocalPetType(e.target.value)}
                disabled={pendingCharacter.saving}
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white focus:outline-none focus:ring-2 focus:ring-accent-gold disabled:opacity-50"
              >
                <option value="">Select pet type...</option>
                {PET_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          )}

          {/* Custom type input */}
          {localType === "other" && (
            <div>
              <label className="block text-sm font-bold text-white mb-1.5">What are they?</label>
              <input
                type="text"
                value={localCustomType}
                onChange={(e) => setLocalCustomType(e.target.value)}
                placeholder="e.g., Dinosaur, Robot, Dragon..."
                disabled={pendingCharacter.saving}
                className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold disabled:opacity-50"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={attemptClose}
              disabled={pendingCharacter.saving}
              className="flex-1 py-3 rounded-full border border-brand-purple-muted text-white font-bold hover:bg-brand-purple-muted/50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid() || pendingCharacter.saving}
              className="flex-1 py-3 rounded-full bg-accent-gold text-brand-dark font-extrabold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-gold-light transition-colors flex items-center justify-center gap-2"
            >
              {pendingCharacter.saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Complete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
