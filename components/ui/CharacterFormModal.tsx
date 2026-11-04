"use client";

import { useState, useEffect } from "react";

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

export interface PendingCharacter {
  id: string;
  name: string;
  photoBase64: string;
  characterType: "person" | "pet" | "other";
  petType: string;
  customType: string;
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

  // Sync local state when pendingCharacter changes
  useEffect(() => {
    if (pendingCharacter) {
      setLocalName(pendingCharacter.name);
      setLocalType(pendingCharacter.characterType);
      setLocalPetType(pendingCharacter.petType);
      setLocalCustomType(pendingCharacter.customType);
    }
  }, [pendingCharacter?.id]);

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
    };
    onSave(updated);
  };

  const handleCancel = () => {
    onCancel(pendingCharacter.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleCancel}
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
              onClick={handleCancel}
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
              onClick={handleCancel}
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
