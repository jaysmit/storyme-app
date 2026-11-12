"use client";

import { useEffect, useCallback } from "react";

interface Story {
  id?: string;
  slug: string;
  title: string;
  tagline?: string | null;
  category?: string | null;
  page_count?: number;
  pageCount?: number;
  cover_image_url?: string | null;
  coverImage?: string | null;
  format?: string;
}

interface StoryPreviewModalProps {
  story: Story | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (slug: string) => void;
  showSelectButton?: boolean;
}

// Fallback images for stories by slug
const storyImages: Record<string, string> = {
  "dragon-castle-valley": "/images/the-dragon-of-castle-valley.jpg",
  "the-dragon-of-castle-valley": "/images/the-dragon-of-castle-valley.jpg",
  "fairy-glade": "/images/the-fairy-glade.jpg",
  "the-fairy-glade": "/images/the-fairy-glade.jpg",
  "grand-final-day": "/images/grand-final-day.jpg",
  "cloud-ship": "/images/captain-of-the-cloud-ship.jpg",
  "captain-of-the-cloud-ship": "/images/captain-of-the-cloud-ship.jpg",
  "super-squad": "/images/the-super-squad-and-the-sorceress.jpg",
  "the-super-squad-and-the-sorceress": "/images/the-super-squad-and-the-sorceress.jpg",
  "galaxy-road-trip": "/images/the-great-galaxy-road-trip.jpg",
  "the-great-galaxy-road-trip": "/images/the-great-galaxy-road-trip.jpg",
  "the-birthday-that-wouldnt-end": "/images/the-birthday-that-wouldnt-end.jpg",
  "the-brick-by-brick-kingdom": "/images/the-brick-by-brick-kingdom.jpg",
  "the-crystal-asteroid": "/images/the-crystal-asteroid.jpg",
  "the-dinosaur-egg-dig": "/images/the-dinosaur-egg-dig.jpg",
  "the-great-backyard-expedition": "/images/the-great-backyard-expedition.jpg",
  "the-great-lighthouse-rescue": "/images/the-great-lighthouse-rescue.jpg",
  "the-lost-jungle-temple": "/images/the-lost-jungle-temple.jpg",
  "the-moon-borrowers": "/images/the-moon-borrowers.jpg",
  "the-outback-star-train": "/images/the-outback-star-train.jpg",
  "the-quest-for-unicorn-valley": "/images/the-quest-for-unicorn-valley.jpg",
  "the-snow-globe-kingdom": "/images/the-snow-globe-kingdom.jpg",
  "under-the-kelp-forest": "/images/under-the-kelp-forest.jpg",
  "essendon-five": "/books/essendon-five/cover.png",
};

const categoryIcons: Record<string, string> = {
  fantasy: "🐉",
  magical: "✨",
  sports: "🏆",
  adventure: "⛵",
  superhero: "🦸",
  space: "🚀",
};

export default function StoryPreviewModal({
  story,
  isOpen,
  onClose,
  onSelect,
  showSelectButton = false,
}: StoryPreviewModalProps) {
  // Close on escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !story) return null;

  const imageUrl =
    story.cover_image_url || story.coverImage || storyImages[story.slug] || null;
  const pageCount = story.page_count || story.pageCount || 0;
  const icon = categoryIcons[story.category || ""] || "📖";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-brand-purple-light rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
          aria-label="Close preview"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        <div className="aspect-[4/3] bg-gradient-to-br from-purple-600 to-indigo-800 relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={story.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10rem] opacity-50">{icon}</span>
            </div>
          )}

          {/* V2 badge */}
          {story.format === "v2" && (
            <div className="absolute top-4 left-4 bg-accent-gold text-brand-dark text-xs font-bold px-3 py-1 rounded-full">
              ★ Premium
            </div>
          )}

          {/* Category badge */}
          {story.category && (
            <div className="absolute bottom-4 left-4 bg-white/20 backdrop-blur-sm text-white text-sm font-bold px-4 py-2 rounded-full capitalize flex items-center gap-2">
              <span>{icon}</span>
              {story.category}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <h2 className="text-2xl font-black text-white mb-2">{story.title}</h2>
          {story.tagline && (
            <p className="text-text-muted mb-4">{story.tagline}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-text-muted mb-6">
            {pageCount > 0 && <span>{pageCount} pages</span>}
            <span className="flex items-center gap-1">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              Ages 4-10
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-brand-purple text-white font-bold py-3 rounded-full hover:bg-brand-purple-muted transition-colors"
            >
              Close
            </button>
            {showSelectButton && onSelect && (
              <button
                onClick={() => {
                  onSelect(story.slug);
                  onClose();
                }}
                className="flex-1 bg-accent-gold text-brand-dark font-bold py-3 rounded-full hover:bg-accent-gold-light transition-colors"
              >
                Select this story
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
