"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import type { Story, ArtStyle, LocalCharacter } from "@/lib/types";

interface StoryWithRoles extends Story {
  roles: { id: string; name: string; description: string }[];
}

// Category colors for header
const categoryColors: Record<string, string> = {
  fantasy: "from-purple-600 to-indigo-800",
  magical: "from-pink-500 to-purple-700",
  sports: "from-green-500 to-teal-700",
  adventure: "from-cyan-500 to-blue-700",
  superhero: "from-red-500 to-orange-600",
  space: "from-indigo-600 to-violet-800",
};

const categoryIcons: Record<string, string> = {
  fantasy: "🐉",
  magical: "✨",
  sports: "🏆",
  adventure: "⛵",
  superhero: "🦸",
  space: "🚀",
};

interface Props {
  slug: string;
}

export default function StoryDetailContent({ slug }: Props) {
  const router = useRouter();

  const [story, setStory] = useState<StoryWithRoles | null>(null);
  const [artStyles, setArtStyles] = useState<ArtStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState<string>("glow");

  // Character state for role assignment
  const [characters, setCharacters] = useState<LocalCharacter[]>([]);
  const [roleAssignments, setRoleAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchStory();
    fetchArtStyles();
    loadCharactersFromStorage();
  }, [slug]);

  async function fetchStory() {
    setLoading(true);
    try {
      const res = await fetch(`/api/stories/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setStory(data.story);
      }
    } catch (error) {
      console.error("Failed to fetch story:", error);
    }
    setLoading(false);
  }

  async function fetchArtStyles() {
    try {
      const res = await fetch("/api/art-styles");
      if (res.ok) {
        const data = await res.json();
        setArtStyles(data.artStyles || []);
      }
    } catch (error) {
      console.error("Failed to fetch art styles:", error);
    }
  }

  function loadCharactersFromStorage() {
    // Try to load characters from sessionStorage (from create wizard)
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("storyme-characters");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCharacters(parsed);
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  function assignRole(roleId: string, characterId: string) {
    setRoleAssignments((prev) => {
      const next = { ...prev };
      // Remove character from any existing role
      Object.keys(next).forEach((key) => {
        if (next[key] === characterId) {
          delete next[key];
        }
      });
      // Assign to new role
      if (characterId) {
        next[roleId] = characterId;
      }
      return next;
    });
  }

  function getCharacterForRole(roleId: string): LocalCharacter | undefined {
    const charId = roleAssignments[roleId];
    return characters.find((c) => c.id === charId);
  }

  function startCreating() {
    // Store selections and navigate to create wizard
    sessionStorage.setItem("storyme-story", slug);
    sessionStorage.setItem("storyme-style", selectedStyle);
    sessionStorage.setItem("storyme-roles", JSON.stringify(roleAssignments));
    router.push("/create?step=4");
  }

  const gradient = categoryColors[story?.category || "fantasy"] || "from-purple-600 to-indigo-800";
  const icon = categoryIcons[story?.category || "fantasy"] || "📖";
  const selectedStyleData = artStyles.find((s) => s.slug === selectedStyle);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col">
        <Header theme="dark" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-muted">Loading story...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col">
        <Header theme="dark" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-black text-white mb-4">Story not found</h1>
            <p className="text-text-muted mb-8">This story world doesn't exist.</p>
            <Link
              href="/worlds"
              className="inline-block bg-accent-gold text-brand-dark font-extrabold px-8 py-4 rounded-full"
            >
              Browse all worlds
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

      <main className="flex-1">
        {/* Hero section */}
        <div className={`bg-gradient-to-br ${gradient} py-16 px-6 relative overflow-hidden`}>
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <span className="text-[20rem]">{icon}</span>
          </div>
          <div className="max-w-4xl mx-auto relative z-10">
            <Link
              href="/worlds"
              className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to worlds
            </Link>

            <div className="flex items-start gap-3 mb-4">
              {story.is_featured && (
                <span className="bg-accent-gold text-brand-dark text-xs font-bold px-3 py-1 rounded-full">
                  ★ Featured
                </span>
              )}
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full capitalize">
                {story.category}
              </span>
            </div>

            <h1 className="text-5xl font-black text-white mb-4">{story.title}</h1>
            <p className="text-xl text-white/80 max-w-2xl">{story.tagline}</p>

            <div className="flex items-center gap-6 mt-8 text-white/60">
              <span className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                {story.page_count} pages
              </span>
              <span className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                ~10 min read
              </span>
              <span className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {story.roles?.length || 4} roles
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto py-12 px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-12">
              {/* Description */}
              <section>
                <h2 className="text-2xl font-black text-white mb-4">About this story</h2>
                <p className="text-text-muted text-lg leading-relaxed">
                  {story.description}
                </p>
              </section>

              {/* Role assignment */}
              <section>
                <h2 className="text-2xl font-black text-white mb-2">Cast your characters</h2>
                <p className="text-text-muted mb-6">
                  Assign your family members to roles in the story. Each character will appear
                  throughout the book in their assigned role.
                </p>

                {characters.length === 0 ? (
                  <div className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-8 text-center">
                    <div className="text-5xl mb-4">📷</div>
                    <h3 className="text-xl font-black text-white mb-2">No characters yet</h3>
                    <p className="text-text-muted mb-6">
                      Upload photos of your family members first to assign them to story roles.
                    </p>
                    <Link
                      href="/create"
                      className="inline-block bg-accent-gold text-brand-dark font-extrabold px-6 py-3 rounded-full"
                    >
                      Add characters
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {story.roles?.map((role) => {
                      const assignedChar = getCharacterForRole(role.id);
                      return (
                        <div
                          key={role.id}
                          className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-4 flex items-center gap-4"
                        >
                          {/* Role info */}
                          <div className="flex-1">
                            <h4 className="font-bold text-white">{role.name}</h4>
                            <p className="text-sm text-text-muted">{role.description}</p>
                          </div>

                          {/* Character selector */}
                          <div className="flex items-center gap-3">
                            {assignedChar ? (
                              <div className="flex items-center gap-3 bg-brand-dark rounded-full pl-1 pr-4 py-1">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-brand-purple-muted">
                                  {(assignedChar.generatedUrl || assignedChar.photoUrl) ? (
                                    <img
                                      src={assignedChar.generatedUrl || assignedChar.photoUrl || ""}
                                      alt={assignedChar.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-text-muted font-bold">
                                      {assignedChar.name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <span className="text-white font-medium">{assignedChar.name}</span>
                                <button
                                  onClick={() => assignRole(role.id, "")}
                                  className="text-text-muted hover:text-accent-pink transition-colors"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <select
                                value=""
                                onChange={(e) => assignRole(role.id, e.target.value)}
                                className="bg-brand-dark border border-brand-purple-muted rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-accent-gold"
                              >
                                <option value="">Select character...</option>
                                {characters
                                  .filter((c) => !Object.values(roleAssignments).includes(c.id))
                                  .map((char) => (
                                    <option key={char.id} value={char.id}>
                                      {char.name}
                                    </option>
                                  ))}
                              </select>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Art style selection */}
              <section>
                <h2 className="text-2xl font-black text-white mb-2">Choose your art style</h2>
                <p className="text-text-muted mb-6">
                  Select the visual style for your storybook. Each style creates a unique atmosphere.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {artStyles.map((style) => (
                    <button
                      key={style.slug}
                      onClick={() => setSelectedStyle(style.slug)}
                      className={`relative rounded-2xl overflow-hidden transition-all ${
                        selectedStyle === style.slug
                          ? "ring-4 ring-accent-gold scale-105"
                          : "hover:scale-102 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <div className="aspect-square bg-gradient-to-br from-brand-purple to-brand-dark flex items-center justify-center">
                        {style.preview_image_url ? (
                          <img
                            src={style.preview_image_url}
                            alt={style.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-4xl">🎨</span>
                        )}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                        <p className="text-white text-sm font-bold">{style.name}</p>
                        {style.ages && (
                          <p className="text-white/60 text-xs">Ages {style.ages}</p>
                        )}
                      </div>
                      {selectedStyle === style.slug && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-accent-gold rounded-full flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14163A" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {selectedStyleData && (
                  <div className="mt-6 p-4 bg-brand-purple-light border border-brand-purple-muted rounded-xl">
                    <h4 className="font-bold text-white mb-1">{selectedStyleData.name}</h4>
                    <p className="text-sm text-text-muted">{selectedStyleData.description}</p>
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-6">
                  <h3 className="text-xl font-black text-white mb-4">Ready to create?</h3>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Story</span>
                      <span className="text-white font-medium">{story.title}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Art style</span>
                      <span className="text-white font-medium">
                        {selectedStyleData?.name || "Select style"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Characters assigned</span>
                      <span className="text-white font-medium">
                        {Object.keys(roleAssignments).length} / {story.roles?.length || 0}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={startCreating}
                    disabled={characters.length === 0}
                    className="w-full bg-accent-gold text-brand-dark font-extrabold py-4 rounded-full hover:bg-accent-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {characters.length === 0 ? "Add characters first" : "Create my book"}
                  </button>

                  {characters.length === 0 && (
                    <Link
                      href="/create"
                      className="block text-center text-accent-gold font-bold mt-4 hover:underline"
                    >
                      Upload photos →
                    </Link>
                  )}

                  <p className="text-xs text-text-muted text-center mt-4">
                    Preview your book before purchasing
                  </p>
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
