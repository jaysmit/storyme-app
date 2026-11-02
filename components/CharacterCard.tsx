"use client";

import { useState, useEffect } from "react";
import type { LocalCharacter } from "@/lib/types";
import { CHARACTER_ROLES } from "@/lib/types";

interface CharacterCardProps {
  character: LocalCharacter;
  onRemove: (id: string) => void;
  onUpdateName: (id: string, name: string) => void;
  onUpdateRole: (id: string, role: string) => void;
  onGenerate?: (id: string) => void;
  showGenerateButton?: boolean;
}

export default function CharacterCard({
  character,
  onRemove,
  onUpdateName,
  onUpdateRole,
  onGenerate,
  showGenerateButton = false,
}: CharacterCardProps) {
  const [name, setName] = useState(character.name);
  const [isEditingCompleted, setIsEditingCompleted] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  // Sync name with character prop
  useEffect(() => {
    setName(character.name);
  }, [character.name]);

  const handleNameChange = (newName: string) => {
    setName(newName);
    onUpdateName(character.id, newName);
  };

  const isCompleted = character.status === "completed" && character.generatedUrl;
  const isPending = character.status === "pending" && !character.generatedUrl;
  const isGenerating = character.status === "generating";

  return (
    <div className="bg-cream rounded-2xl p-4 flex flex-col gap-4 shadow-lg">
      {/* Images */}
      <div className="relative grid grid-cols-2 gap-2">
        {/* Original Photo */}
        <div className="aspect-square rounded-xl overflow-hidden bg-[#EFE3C8] relative">
          {character.photoUrl ? (
            <img
              src={character.photoUrl}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#6B5A3A]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6B5A3A" strokeWidth="1.8">
                <path d="M4 7h3l2-3h6l2 3h3v13H4z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span className="text-xs font-bold">Photo</span>
            </div>
          )}
          <span className="absolute left-2 bottom-2 text-[10px] font-extrabold px-2 py-1 rounded-full bg-[rgba(20,22,58,0.8)] text-white">
            Photo
          </span>
        </div>

        {/* Generated Image */}
        <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-b from-[#6B5BB0] via-[#2A2470] to-[#1E1B4B] relative">
          {character.generatedUrl ? (
            <>
              <img
                src={character.generatedUrl}
                alt={`${character.name} as character`}
                className="w-full h-full object-cover"
              />
              {/* Tick overlay when completed */}
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent-teal flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#C9C5EE] p-2">
              {isGenerating ? (
                <div className="w-8 h-8 border-3 border-accent-gold border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9C5EE" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              )}
              <span className="text-xs font-bold text-center">
                {isGenerating ? "Creating..." : "Awaiting"}
              </span>
            </div>
          )}
          <span className="absolute left-2 bottom-2 text-[10px] font-extrabold px-2 py-1 rounded-full bg-accent-gold text-brand-dark">
            Storybook
          </span>
        </div>

        {/* Arrow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-accent-gold border-3 border-cream flex items-center justify-center z-10">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14163A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </div>
      </div>

      {/* PENDING STATE: Name input + Ready button */}
      {isPending && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-bold text-text-dark-muted mb-1">
              Character name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter name..."
              className="w-full px-3 py-2 rounded-lg border border-[#EADBBE] bg-white text-text-dark font-bold focus:outline-none focus:ring-2 focus:ring-accent-gold"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onGenerate?.(character.id)}
              disabled={!name.trim()}
              className="flex-1 bg-accent-teal text-white font-extrabold py-3 rounded-full hover:bg-accent-teal/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Ready
            </button>
            <button
              onClick={() => onRemove(character.id)}
              className="w-12 h-12 rounded-full bg-[#FFE3E3] text-accent-rust flex items-center justify-center hover:bg-accent-rust hover:text-white transition-colors"
              title="Remove"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* GENERATING STATE */}
      {isGenerating && (
        <div className="text-center py-2">
          <p className="font-bold text-text-dark">{character.name}</p>
          <p className="text-sm text-text-dark-muted">Creating your character...</p>
        </div>
      )}

      {/* COMPLETED STATE: Name, role, edit button */}
      {isCompleted && (
        <div className="flex flex-col gap-3">
          {isEditingCompleted ? (
            <>
              <div>
                <label className="block text-xs font-bold text-text-dark-muted mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#EADBBE] bg-white text-text-dark font-bold focus:outline-none focus:ring-2 focus:ring-accent-gold"
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-bold text-text-dark-muted mb-1">
                  Role
                </label>
                <button
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className="w-full px-3 py-2 rounded-lg border border-[#EADBBE] bg-white text-text-dark font-bold text-left flex justify-between items-center"
                >
                  {character.role || "Select role"}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {showRoleDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#EADBBE] rounded-lg shadow-lg z-20">
                    {CHARACTER_ROLES.map((role) => (
                      <button
                        key={role}
                        onClick={() => {
                          onUpdateRole(character.id, role);
                          setShowRoleDropdown(false);
                        }}
                        className={`block w-full text-left px-3 py-2 text-sm hover:bg-[#F5F0E6] transition-colors first:rounded-t-lg last:rounded-b-lg ${
                          character.role === role ? "font-bold text-accent-teal" : "text-text-dark"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsEditingCompleted(false)}
                className="bg-accent-gold text-brand-dark font-extrabold py-2 rounded-full hover:bg-accent-gold-light transition-colors"
              >
                Done
              </button>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-xl font-black text-text-dark">{character.name}</p>
                <p className="text-sm text-text-dark-muted">{character.role || "No role set"}</p>
              </div>
              <button
                onClick={() => setIsEditingCompleted(true)}
                className="w-10 h-10 rounded-full bg-[#E8E4F0] text-[#6B5BB0] flex items-center justify-center hover:bg-[#D8D0F0] transition-colors"
                title="Edit"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
