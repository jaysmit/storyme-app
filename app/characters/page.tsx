"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import type { Character } from "@/lib/types";

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

interface PendingCharacter {
  id: string;
  name: string;
  photoBase64: string;
  characterType: "person" | "pet" | "other";
  petType: string;
  customType: string;
  saving: boolean;
}

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [pendingCharacters, setPendingCharacters] = useState<PendingCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCharacters();
  }, []);

  async function fetchCharacters() {
    setLoading(true);
    try {
      const res = await fetch("/api/characters");
      if (res.ok) {
        const data = await res.json();
        setCharacters(data.characters || []);
      }
    } catch (error) {
      console.error("Failed to fetch characters:", error);
    }
    setLoading(false);
  }

  // Add photos to pending state (not saved yet)
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        setPendingCharacters((prev) => [
          {
            id: pendingId,
            name: "",
            photoBase64: base64,
            characterType: "person",
            petType: "",
            customType: "",
            saving: false,
          },
          ...prev,
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Update pending character fields
  function updatePending(id: string, updates: Partial<PendingCharacter>) {
    setPendingCharacters((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }

  // Remove pending character (cancel)
  function removePending(id: string) {
    setPendingCharacters((prev) => prev.filter((p) => p.id !== id));
  }

  // Check if pending character is valid to save
  function isPendingValid(pending: PendingCharacter): boolean {
    if (!pending.name.trim()) return false;
    if (pending.characterType === "pet" && !pending.petType) return false;
    if (pending.characterType === "other" && !pending.customType.trim()) return false;
    return true;
  }

  // Save pending character to API and trigger generation
  async function savePendingCharacter(pending: PendingCharacter) {
    if (!isPendingValid(pending)) return;

    setPendingCharacters((prev) =>
      prev.map((p) => (p.id === pending.id ? { ...p, saving: true } : p))
    );

    // Determine the type label to save
    let typeToSave = pending.characterType;
    let petTypeToSave: string | undefined;

    if (pending.characterType === "pet") {
      petTypeToSave = pending.petType;
    } else if (pending.characterType === "other") {
      typeToSave = "other";
      petTypeToSave = pending.customType.trim();
    }

    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pending.name.trim(),
          photoBase64: pending.photoBase64,
          characterType: typeToSave,
          petType: petTypeToSave,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCharacters((prev) => [data.character, ...prev]);
        setPendingCharacters((prev) => prev.filter((p) => p.id !== pending.id));
      } else {
        setPendingCharacters((prev) =>
          prev.map((p) => (p.id === pending.id ? { ...p, saving: false } : p))
        );
      }
    } catch (error) {
      console.error("Failed to save character:", error);
      setPendingCharacters((prev) =>
        prev.map((p) => (p.id === pending.id ? { ...p, saving: false } : p))
      );
    }
  }

  async function deleteCharacter(id: string) {
    if (!confirm("Delete this character? They will be removed from all crews.")) return;

    try {
      const res = await fetch(`/api/characters/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCharacters((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete character:", error);
    }
  }

  async function updateCharacterName(id: string) {
    if (!editName.trim()) return;

    try {
      const res = await fetch(`/api/characters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });

      if (res.ok) {
        setCharacters((prev) =>
          prev.map((c) => (c.id === id ? { ...c, name: editName } : c))
        );
      }
    } catch (error) {
      console.error("Failed to update character:", error);
    }

    setEditingId(null);
    setEditName("");
  }

  async function generateIllustration(char: Character) {
    if (generatingId) return; // Already generating another

    setGeneratingId(char.id);

    // Update local state to show generating status
    setCharacters((prev) =>
      prev.map((c) => (c.id === char.id ? { ...c, generation_status: "generating" } : c))
    );

    try {
      const res = await fetch(`/api/characters/${char.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artStyle: "glow" }), // Default art style
      });

      if (res.ok) {
        const { character: updatedChar } = await res.json();
        setCharacters((prev) =>
          prev.map((c) => (c.id === char.id ? updatedChar : c))
        );
      } else {
        const error = await res.json();
        alert(`Failed to generate: ${error.error || "Unknown error"}`);
        // Revert status
        setCharacters((prev) =>
          prev.map((c) => (c.id === char.id ? { ...c, generation_status: "failed" } : c))
        );
      }
    } catch (error) {
      console.error("Failed to generate illustration:", error);
      alert("Failed to generate illustration. Please try again.");
      setCharacters((prev) =>
        prev.map((c) => (c.id === char.id ? { ...c, generation_status: "failed" } : c))
      );
    }

    setGeneratingId(null);
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-start gap-4 mb-8">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-4xl font-black text-white mb-1 sm:mb-2">
                Your characters
              </h1>
              <p className="text-sm sm:text-lg text-text-muted">
                Upload photos to star in your stories.
              </p>
            </div>
            <label className="shrink-0 px-3 py-2 sm:px-6 sm:py-3 bg-accent-gold text-brand-dark font-extrabold text-sm sm:text-base rounded-full hover:bg-accent-gold-light transition-colors flex items-center gap-1.5 sm:gap-2 cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add character</span>
            </label>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-muted">Loading characters...</p>
            </div>
          ) : characters.length === 0 && pendingCharacters.length === 0 ? (
            <div className="text-center py-20 bg-brand-purple-light border border-brand-purple-muted rounded-3xl">
              <div className="text-6xl mb-4">📸</div>
              <h2 className="text-2xl font-black text-white mb-2">
                No characters yet
              </h2>
              <p className="text-text-muted mb-6 max-w-md mx-auto">
                Upload clear, front-facing photos of family members, friends, or pets
                who'll star in your personalized storybooks.
              </p>
              <label className="inline-flex items-center gap-2 bg-accent-gold text-brand-dark font-extrabold px-8 py-4 rounded-full cursor-pointer hover:bg-accent-gold-light transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Upload photos
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Pending characters (not yet saved) */}
              {pendingCharacters.map((pending) => (
                <div
                  key={pending.id}
                  className="bg-brand-purple-light border-2 border-accent-gold rounded-2xl overflow-hidden"
                >
                  {/* Photo */}
                  <div className="aspect-[2/1] bg-brand-dark relative">
                    <img
                      src={pending.photoBase64}
                      alt="New character"
                      className="w-full h-full object-cover"
                    />

                    {/* Cancel button */}
                    {!pending.saving && (
                      <button
                        onClick={() => removePending(pending.id)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                        title="Cancel"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}

                    {/* Saving overlay */}
                    {pending.saving && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-3 border-accent-gold border-t-transparent rounded-full animate-spin mb-2" />
                        <p className="text-white text-sm font-bold">Creating...</p>
                      </div>
                    )}
                  </div>

                  {/* Form */}
                  <div className="p-4 space-y-3">
                    {/* Name input */}
                    <input
                      type="text"
                      value={pending.name}
                      onChange={(e) => updatePending(pending.id, { name: e.target.value })}
                      placeholder="Enter name..."
                      disabled={pending.saving}
                      className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold disabled:opacity-50"
                      autoFocus
                    />

                    {/* Person / Pet / Other toggle */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => updatePending(pending.id, { characterType: "person", petType: "", customType: "" })}
                        disabled={pending.saving}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                          pending.characterType === "person"
                            ? "bg-accent-gold text-brand-dark"
                            : "bg-brand-dark text-text-muted hover:text-white"
                        }`}
                      >
                        Person
                      </button>
                      <button
                        onClick={() => updatePending(pending.id, { characterType: "pet", customType: "" })}
                        disabled={pending.saving}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                          pending.characterType === "pet"
                            ? "bg-accent-gold text-brand-dark"
                            : "bg-brand-dark text-text-muted hover:text-white"
                        }`}
                      >
                        Pet
                      </button>
                      <button
                        onClick={() => updatePending(pending.id, { characterType: "other", petType: "" })}
                        disabled={pending.saving}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${
                          pending.characterType === "other"
                            ? "bg-accent-gold text-brand-dark"
                            : "bg-brand-dark text-text-muted hover:text-white"
                        }`}
                      >
                        Other
                      </button>
                    </div>

                    {/* Pet type selector (shown when pet is selected) */}
                    {pending.characterType === "pet" && (
                      <select
                        value={pending.petType}
                        onChange={(e) => updatePending(pending.id, { petType: e.target.value })}
                        disabled={pending.saving}
                        className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-purple-muted text-white focus:outline-none focus:ring-2 focus:ring-accent-gold disabled:opacity-50"
                      >
                        <option value="">Select pet type...</option>
                        {PET_TYPES.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    )}

                    {/* Custom type input (shown when other is selected) */}
                    {pending.characterType === "other" && (
                      <input
                        type="text"
                        value={pending.customType}
                        onChange={(e) => updatePending(pending.id, { customType: e.target.value })}
                        placeholder="Enter type (e.g., Dinosaur, Robot, Unicorn)..."
                        disabled={pending.saving}
                        className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold disabled:opacity-50"
                      />
                    )}

                    {/* Complete button */}
                    <button
                      onClick={() => savePendingCharacter(pending)}
                      disabled={!isPendingValid(pending) || pending.saving}
                      className="w-full py-2.5 bg-accent-gold text-brand-dark font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-gold-light transition-colors"
                    >
                      {pending.saving ? "Creating..." : "Complete"}
                    </button>
                  </div>
                </div>
              ))}

              {/* Saved characters */}
              {characters.map((char) => (
                <div
                  key={char.id}
                  className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl overflow-hidden"
                >
                  {/* Side-by-side photos: Original + Caricature */}
                  <div className="aspect-[2/1] bg-brand-dark relative flex">
                    {/* Original photo */}
                    <div className="w-1/2 relative">
                      <img
                        src={char.original_photo_url}
                        alt={`${char.name} - Original`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 rounded text-[10px] text-white font-medium">
                        Original
                      </div>
                    </div>

                    {/* Caricature */}
                    <div className="w-1/2 relative border-l border-brand-purple-muted">
                      {char.generated_image_url ? (
                        <>
                          <img
                            src={char.generated_image_url}
                            alt={`${char.name} - Illustrated`}
                            className="w-full h-full object-cover"
                          />
                          {/* Regenerate button */}
                          {generatingId !== char.id && (
                            <button
                              onClick={() => generateIllustration(char)}
                              disabled={!!generatingId}
                              className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-accent-gold hover:bg-accent-gold hover:text-brand-dark flex items-center justify-center transition-colors disabled:opacity-50"
                              title="Regenerate illustration"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 4v6h6M23 20v-6h-6" />
                                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
                              </svg>
                            </button>
                          )}
                          {/* Regenerating overlay */}
                          {generatingId === char.id && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                              <div className="w-8 h-8 border-3 border-accent-gold border-t-transparent rounded-full animate-spin mb-2" />
                              <p className="text-white text-xs font-bold">Regenerating...</p>
                            </div>
                          )}
                        </>
                      ) : char.generation_status === "generating" || generatingId === char.id ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-brand-dark">
                          <div className="w-8 h-8 border-3 border-accent-gold border-t-transparent rounded-full animate-spin mb-2" />
                          <p className="text-text-muted text-xs">Creating...</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => generateIllustration(char)}
                          disabled={!!generatingId}
                          className="w-full h-full flex flex-col items-center justify-center bg-brand-dark hover:bg-brand-purple-muted transition-colors group disabled:opacity-50"
                        >
                          <div className="w-10 h-10 rounded-full bg-brand-purple-muted group-hover:bg-accent-gold flex items-center justify-center mb-2 transition-colors">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-accent-gold group-hover:text-brand-dark transition-colors">
                              <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
                            </svg>
                          </div>
                          <p className="text-accent-gold text-xs font-bold group-hover:text-white">Illustrate</p>
                        </button>
                      )}
                      <div className="absolute bottom-1 right-1 px-2 py-0.5 bg-black/60 rounded text-[10px] text-white font-medium">
                        Illustrated
                      </div>
                    </div>
                  </div>

                  {/* Name and controls */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {editingId === char.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") updateCharacterName(char.id);
                                if (e.key === "Escape") {
                                  setEditingId(null);
                                  setEditName("");
                                }
                              }}
                              className="flex-1 px-2 py-1 rounded bg-brand-dark border border-brand-purple-muted text-white text-sm focus:outline-none focus:ring-1 focus:ring-accent-gold"
                              autoFocus
                            />
                            <button
                              onClick={() => updateCharacterName(char.id)}
                              className="text-accent-gold hover:text-accent-gold-light"
                              title="Save"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <>
                            <h3 className="text-white font-bold truncate">{char.name}</h3>
                            <p className="text-xs text-text-muted capitalize">
                              {char.pet_type
                                ? char.pet_type
                                : char.character_type}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Edit and Delete buttons */}
                      {editingId !== char.id && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingId(char.id);
                              setEditName(char.name);
                            }}
                            className="w-8 h-8 rounded-full bg-brand-dark text-text-muted hover:text-white hover:bg-brand-purple-muted transition-colors flex items-center justify-center"
                            title="Edit name"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteCharacter(char.id)}
                            className="w-8 h-8 rounded-full bg-brand-dark text-text-muted hover:text-white hover:bg-red-500 transition-colors flex items-center justify-center"
                            title="Delete character"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Add more card */}
              <label className="bg-brand-purple-light border-2 border-dashed border-brand-purple-muted rounded-2xl aspect-[2/1] flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-accent-gold transition-colors group">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-brand-dark flex items-center justify-center group-hover:bg-accent-gold transition-colors">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-accent-gold group-hover:text-brand-dark transition-colors"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-text-muted group-hover:text-white transition-colors">
                  Add more
                </span>
              </label>
            </div>
          )}

          {/* Tip */}
          {characters.length > 0 && (
            <div className="mt-12 bg-brand-purple border border-brand-purple-muted rounded-2xl p-6 flex gap-4">
              <div className="text-2xl">💡</div>
              <div>
                <h3 className="text-white font-bold mb-1">Ready to create a story?</h3>
                <p className="text-text-muted text-sm mb-3">
                  Now that you have characters, start creating your personalized storybook!
                </p>
                <Link
                  href="/create"
                  className="inline-block px-6 py-3 bg-accent-gold text-brand-dark font-bold rounded-full hover:bg-accent-gold-light transition-colors text-sm"
                >
                  Start a book
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
