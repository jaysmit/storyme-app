"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import type { Crew } from "@/lib/types";

// Demo crews for display before Supabase is configured
const demoCrew: Crew[] = [
  {
    id: "demo-1",
    user_id: "demo",
    name: "The Smith Family",
    created_at: new Date().toISOString(),
    crew_members: [],
  },
];

export default function CrewsPage() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCrewName, setNewCrewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchCrews();
  }, []);

  async function fetchCrews() {
    setLoading(true);
    try {
      const res = await fetch("/api/crews");
      if (res.ok) {
        const data = await res.json();
        setCrews(data.crews || []);
      } else {
        // If unauthorized or error, show demo data
        setCrews(demoCrew);
      }
    } catch {
      // Show demo data on error
      setCrews(demoCrew);
    }
    setLoading(false);
  }

  async function createCrew() {
    if (!newCrewName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/crews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCrewName }),
      });

      if (res.ok) {
        const data = await res.json();
        setCrews((prev) => [data.crew, ...prev]);
        setShowCreateModal(false);
        setNewCrewName("");
      }
    } catch (error) {
      console.error("Failed to create crew:", error);
    }
    setCreating(false);
  }

  async function deleteCrew(id: string) {
    if (!confirm("Are you sure you want to delete this crew?")) return;

    try {
      const res = await fetch(`/api/crews/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCrews((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete crew:", error);
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">
                Your crews
              </h1>
              <p className="text-lg text-text-muted">
                Save groups of characters to use across multiple stories.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-accent-gold text-brand-dark font-extrabold rounded-full hover:bg-accent-gold-light transition-colors flex items-center gap-2"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              New crew
            </button>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-muted">Loading crews...</p>
            </div>
          ) : crews.length === 0 ? (
            <div className="text-center py-20 bg-brand-purple-light border border-brand-purple-muted rounded-3xl">
              <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
              <h2 className="text-2xl font-black text-white mb-2">
                No crews yet
              </h2>
              <p className="text-text-muted mb-6">
                Create a crew to save your favorite character combinations.
              </p>
              <Link
                href="/create"
                className="inline-block bg-accent-gold text-brand-dark font-extrabold px-8 py-4 rounded-full hover:bg-accent-gold-light transition-colors"
              >
                Start creating
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {crews.map((crew) => (
                <div
                  key={crew.id}
                  className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl overflow-hidden"
                >
                  {/* Crew header with avatar stack */}
                  <div className="p-6 border-b border-brand-purple-muted">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-black text-white">
                          {crew.name}
                        </h3>
                        <p className="text-sm text-text-muted mt-1">
                          {crew.crew_members?.length || 0} member
                          {(crew.crew_members?.length || 0) !== 1 && "s"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => deleteCrew(crew.id)}
                          className="w-10 h-10 rounded-full bg-brand-purple-muted text-text-muted hover:bg-accent-pink hover:text-white transition-colors flex items-center justify-center"
                          title="Delete crew"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Member avatars or empty state */}
                  <div className="p-6">
                    {(crew.crew_members?.length || 0) > 0 ? (
                      <div className="flex -space-x-3">
                        {crew.crew_members?.slice(0, 6).map((member, i) => (
                          <div
                            key={member.id}
                            className="w-12 h-12 rounded-full border-3 border-brand-purple-light overflow-hidden bg-brand-dark"
                            style={{ zIndex: 10 - i }}
                          >
                            {member.character?.generated_image_url ||
                            member.character?.original_photo_url ? (
                              <img
                                src={
                                  member.character.generated_image_url ||
                                  member.character.original_photo_url
                                }
                                alt={member.character.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-text-muted text-sm font-bold">
                                {member.character?.name?.charAt(0) || "?"}
                              </div>
                            )}
                          </div>
                        ))}
                        {(crew.crew_members?.length || 0) > 6 && (
                          <div className="w-12 h-12 rounded-full border-3 border-brand-purple-light bg-brand-purple-muted flex items-center justify-center text-text-muted text-sm font-bold">
                            +{(crew.crew_members?.length || 0) - 6}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-text-muted text-sm">
                        No members yet. Add characters when creating a story.
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-6 pt-0 flex gap-3">
                    <Link
                      href={`/create?crew=${crew.id}`}
                      className="flex-1 px-4 py-3 bg-accent-gold text-brand-dark font-bold rounded-full text-center hover:bg-accent-gold-light transition-colors"
                    >
                      Use this crew
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Crew Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-black text-white mb-4">
              Create a new crew
            </h2>
            <p className="text-text-muted mb-6">
              Name your crew, then add characters from the create page.
            </p>
            <input
              type="text"
              value={newCrewName}
              onChange={(e) => setNewCrewName(e.target.value)}
              placeholder="e.g., The Adventure Squad"
              className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold mb-6"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewCrewName("");
                }}
                className="flex-1 px-4 py-3 rounded-full border border-brand-purple-muted text-text-muted hover:text-white transition-colors font-bold"
              >
                Cancel
              </button>
              <button
                onClick={createCrew}
                disabled={!newCrewName.trim() || creating}
                className="flex-1 px-4 py-3 rounded-full bg-accent-gold text-brand-dark font-extrabold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-gold-light transition-colors"
              >
                {creating ? "Creating..." : "Create crew"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
