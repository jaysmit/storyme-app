"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import CharacterFormModal, { type PendingCharacter } from "@/components/ui/CharacterFormModal";
import CaricatureResultModal from "@/components/ui/CaricatureResultModal";
import type { Character, IdentityProfile } from "@/lib/types";

export default function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [pendingCharacters, setPendingCharacters] = useState<PendingCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flip state - tracks which cards show the original photo
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  // Token state
  const [tokenBalance, setTokenBalance] = useState<number>(0);

  // Caricature result modal state
  const [showCaricatureResult, setShowCaricatureResult] = useState(false);
  const [caricatureResultCharacter, setCaricatureResultCharacter] = useState<Character | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    fetchCharacters();
    fetchTokens();
  }, []);

  async function fetchTokens() {
    try {
      const res = await fetch("/api/tokens");
      if (res.ok) {
        const data = await res.json();
        setTokenBalance(data.tokens || 0);
      }
    } catch {
      // Ignore errors
    }
  }

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

  // Toggle flip state for a card
  function toggleFlip(charId: string) {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(charId)) {
        next.delete(charId);
      } else {
        next.add(charId);
      }
      return next;
    });
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
            sex: null,
            age: null,
            height_cm: null,
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

  // Get the first pending character for the modal
  const currentPendingCharacter = pendingCharacters.length > 0 ? pendingCharacters[0] : null;
  const remainingPendingCount = pendingCharacters.length > 1 ? pendingCharacters.length - 1 : 0;

  // Save pending character and immediately start generation
  async function savePendingCharacter(pending: PendingCharacter) {
    // Mark as saving
    setPendingCharacters((prev) =>
      prev.map((p) => (p.id === pending.id ? { ...p, saving: true } : p))
    );

    let petTypeToSave: string | undefined;

    if (pending.characterType === "pet") {
      petTypeToSave = pending.petType;
    } else if (pending.characterType === "other") {
      petTypeToSave = pending.customType.trim();
    }

    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pending.name.trim(),
          photoBase64: pending.photoBase64,
          characterType: pending.characterType,
          petType: petTypeToSave,
          age: pending.age,
          height_cm: pending.height_cm,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newChar = data.character;
        setCharacters((prev) => [newChar, ...prev]);
        setPendingCharacters((prev) => prev.filter((p) => p.id !== pending.id));

        // Immediately start generation (no analysis step)
        generateIllustration(newChar);
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

  // Generate illustration (called immediately after save, or for regeneration)
  async function generateIllustration(char: Character, profile?: IdentityProfile) {
    setGeneratingId(char.id);

    setCharacters((prev) =>
      prev.map((c) => (c.id === char.id ? { ...c, generation_status: "generating" } : c))
    );

    try {
      // If we have a profile, save it first
      if (profile) {
        await fetch(`/api/characters/${char.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identity_profile: profile,
            identity_confirmed: true,
          }),
        });
      }

      const res = await fetch(`/api/characters/${char.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artStyle: "glow",
        }),
      });

      if (res.ok) {
        const { character: updatedChar, tokensRemaining } = await res.json();
        setCharacters((prev) =>
          prev.map((c) => (c.id === char.id ? updatedChar : c))
        );
        setTokenBalance(tokensRemaining);

        // Show result modal
        setCaricatureResultCharacter(updatedChar);
        setShowCaricatureResult(true);
      } else {
        const error = await res.json();
        alert(`Failed to generate: ${error.error || error.message || "Unknown error"}`);
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
    setIsRegenerating(false);
  }

  // Handle confirm from caricature result modal (no changes)
  function handleCaricatureConfirm() {
    setShowCaricatureResult(false);
    setCaricatureResultCharacter(null);
  }

  // Handle regenerate from caricature result modal (with changes)
  async function handleCaricatureRegenerate(profile: IdentityProfile) {
    if (!caricatureResultCharacter) return;
    setIsRegenerating(true);
    await generateIllustration(caricatureResultCharacter, profile);
  }

  // Handle close of caricature result modal
  function handleCaricatureClose() {
    if (isRegenerating) return; // Don't close while regenerating
    setShowCaricatureResult(false);
    setCaricatureResultCharacter(null);
  }

  // Open caricature result modal for an existing character
  function openCaricatureResult(char: Character) {
    if (generatingId || !char.generated_image_url) return;
    setCaricatureResultCharacter(char);
    setShowCaricatureResult(true);
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
          ) : characters.length === 0 ? (
            <div className="text-center py-20 bg-brand-purple-light border border-brand-purple-muted rounded-3xl">
              <div className="text-6xl mb-4">📸</div>
              <h2 className="text-2xl font-black text-white mb-2">
                No characters yet
              </h2>
              <p className="text-text-muted mb-6 max-w-md mx-auto">
                Upload clear, front-facing photos of family members, friends, or pets
                who&apos;ll star in your personalized storybooks.
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
              {/* Saved characters - Flip card layout */}
              {characters.map((char) => {
                const isFlipped = flippedCards.has(char.id);
                const isGenerating = generatingId === char.id || char.generation_status === "generating";
                const hasGenerated = !!char.generated_image_url;

                return (
                  <div
                    key={char.id}
                    className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl overflow-hidden"
                  >
                    {/* Image area - shows caricature by default, original when flipped */}
                    <div className="aspect-square bg-brand-dark relative">
                      {isGenerating ? (
                        // Generating state
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mb-3" />
                          <p className="text-white font-bold">Creating illustration...</p>
                          <p className="text-text-muted text-sm mt-1">This may take a moment</p>
                        </div>
                      ) : hasGenerated ? (
                        // Has generated image - show caricature or original based on flip state
                        <>
                          <img
                            src={isFlipped ? char.original_photo_url : char.generated_image_url!}
                            alt={`${char.name} - ${isFlipped ? "Original" : "Illustrated"}`}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => openCaricatureResult(char)}
                          />

                          {/* Flip button */}
                          <button
                            onClick={() => toggleFlip(char.id)}
                            className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center transition-colors"
                            title={isFlipped ? "Show illustration" : "Show original photo"}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 1l4 4-4 4" />
                              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                              <path d="M7 23l-4-4 4-4" />
                              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                            </svg>
                          </button>

                          {/* Label */}
                          <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white font-medium">
                            {isFlipped ? "Original" : "Illustrated"}
                          </div>

                          {/* Edit button */}
                          <button
                            onClick={() => openCaricatureResult(char)}
                            disabled={!!generatingId}
                            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-accent-gold hover:bg-accent-gold hover:text-brand-dark flex items-center justify-center transition-colors disabled:opacity-50"
                            title="Edit features"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        // No generated image yet - show original with generate prompt
                        <>
                          <img
                            src={char.original_photo_url}
                            alt={char.name}
                            className="w-full h-full object-cover opacity-60"
                          />
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                            <p className="text-white font-bold text-center px-4">
                              Illustration pending
                            </p>
                            <button
                              onClick={() => generateIllustration(char)}
                              disabled={!!generatingId}
                              className="mt-3 px-4 py-2 bg-accent-gold text-brand-dark font-bold rounded-full text-sm hover:bg-accent-gold-light disabled:opacity-50"
                            >
                              Generate now
                            </button>
                          </div>
                        </>
                      )}
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
                                {char.pet_type || char.character_type}
                                {char.age && ` • ${char.age}yo`}
                                {char.height_cm && ` • ${char.height_cm}cm`}
                              </p>
                            </>
                          )}
                        </div>

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
                );
              })}

              {/* Add more card */}
              <label className="bg-brand-purple-light border-2 border-dashed border-brand-purple-muted rounded-2xl aspect-square flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-accent-gold transition-colors group">
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

      {/* Character Form Modal - shows when photos are uploaded */}
      <CharacterFormModal
        pendingCharacter={currentPendingCharacter}
        onUpdate={updatePending}
        onSave={savePendingCharacter}
        onCancel={removePending}
        remainingCount={remainingPendingCount}
      />

      {/* Caricature Result Modal - shows after generation completes */}
      <CaricatureResultModal
        isOpen={showCaricatureResult}
        character={caricatureResultCharacter}
        onConfirm={handleCaricatureConfirm}
        onRegenerate={handleCaricatureRegenerate}
        onClose={handleCaricatureClose}
        tokenBalance={tokenBalance}
        isRegenerating={isRegenerating}
      />

      <Footer />
    </div>
  );
}
