"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import type { Story } from "@/lib/types";

// Category icons/emojis
const categoryIcons: Record<string, string> = {
  fantasy: "🐉",
  magical: "✨",
  sports: "🏆",
  adventure: "⛵",
  superhero: "🦸",
  space: "🚀",
};

const categoryColors: Record<string, string> = {
  fantasy: "from-purple-600 to-indigo-800",
  magical: "from-pink-500 to-purple-700",
  sports: "from-green-500 to-teal-700",
  adventure: "from-cyan-500 to-blue-700",
  superhero: "from-red-500 to-orange-600",
  space: "from-indigo-600 to-violet-800",
};

// Fallback images for stories by slug
const storyImages: Record<string, string> = {
  "dragon-castle-valley": "/images/the-dragon-of-castle-valley.jpg",
  "fairy-glade": "/images/the-fairy-glade.jpg",
  "grand-final-day": "/images/grand-final-day.jpg",
  "cloud-ship": "/images/captain-of-the-cloud-ship.jpg",
  "super-squad": "/images/the-super-squad-and-the-sorceress.jpg",
  "galaxy-road-trip": "/images/the-great-galaxy-road-trip.jpg",
  "the-dragon-of-castle-valley": "/images/the-dragon-of-castle-valley.jpg",
  "the-fairy-glade": "/images/the-fairy-glade.jpg",
  "captain-of-the-cloud-ship": "/images/captain-of-the-cloud-ship.jpg",
  "the-super-squad-and-the-sorceress": "/images/the-super-squad-and-the-sorceress.jpg",
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
};

export default function WorldsPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchStories();
  }, []);

  async function fetchStories() {
    setLoading(true);
    try {
      const res = await fetch("/api/stories");
      if (res.ok) {
        const data = await res.json();
        setStories(data.stories || []);
      }
    } catch (error) {
      console.error("Failed to fetch stories:", error);
    }
    setLoading(false);
  }

  const categories = [...new Set(stories.map((s) => s.category).filter(Boolean))];
  const filteredStories = selectedCategory
    ? stories.filter((s) => s.category === selectedCategory)
    : stories;
  const featuredStories = filteredStories.filter((s) => s.is_featured);
  const otherStories = filteredStories.filter((s) => !s.is_featured);

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-black text-white mb-4">
              Story Worlds
            </h1>
            <p className="text-xl text-text-muted max-w-2xl mx-auto">
              Choose an adventure for your family. Each world has unique characters,
              magical settings, and stories waiting to be told.
            </p>
          </div>

          {/* Category filter */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-5 py-2 rounded-full font-bold transition-all ${
                selectedCategory === null
                  ? "bg-accent-gold text-brand-dark"
                  : "bg-brand-purple-light text-text-muted hover:text-white border border-brand-purple-muted"
              }`}
            >
              All worlds
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat!)}
                className={`px-5 py-2 rounded-full font-bold transition-all flex items-center gap-2 ${
                  selectedCategory === cat
                    ? "bg-accent-gold text-brand-dark"
                    : "bg-brand-purple-light text-text-muted hover:text-white border border-brand-purple-muted"
                }`}
              >
                <span>{categoryIcons[cat!] || "📖"}</span>
                <span className="capitalize">{cat}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-muted">Loading story worlds...</p>
            </div>
          ) : (
            <>
              {/* Featured stories */}
              {featuredStories.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                    <span className="text-accent-gold">★</span> Featured Adventures
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {featuredStories.map((story) => (
                      <StoryCard key={story.id} story={story} featured />
                    ))}
                  </div>
                </div>
              )}

              {/* Other stories */}
              {otherStories.length > 0 && (
                <div>
                  <h2 className="text-2xl font-black text-white mb-6">
                    More Adventures
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {otherStories.map((story) => (
                      <StoryCard key={story.id} story={story} />
                    ))}
                  </div>
                </div>
              )}

              {filteredStories.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-text-muted text-lg">
                    No stories found in this category.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function StoryCard({ story, featured = false }: { story: Story; featured?: boolean }) {
  const gradient = categoryColors[story.category || "fantasy"] || "from-purple-600 to-indigo-800";
  const icon = categoryIcons[story.category || "fantasy"] || "📖";
  const imageUrl = story.cover_image_url || storyImages[story.slug] || null;

  return (
    <Link href={`/worlds/${story.slug}`} className="group block">
      <div className={`relative rounded-3xl overflow-hidden ${featured ? "ring-2 ring-accent-gold" : ""}`}>
        {/* Cover image or gradient */}
        <div className={`aspect-[4/3] bg-gradient-to-br ${gradient} relative`}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={story.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-8xl opacity-50">{icon}</span>
            </div>
          )}

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="bg-accent-gold text-brand-dark font-extrabold px-6 py-3 rounded-full transform scale-90 group-hover:scale-100 transition-transform">
              Explore this world
            </span>
          </div>

          {/* Featured badge */}
          {featured && (
            <div className="absolute top-4 right-4 bg-accent-gold text-brand-dark text-xs font-bold px-3 py-1 rounded-full">
              ★ Featured
            </div>
          )}

          {/* Category badge */}
          <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full capitalize flex items-center gap-1">
            <span>{icon}</span>
            {story.category}
          </div>
        </div>

        {/* Content */}
        <div className="bg-brand-purple-light p-6">
          <h3 className="text-xl font-black text-white mb-2 group-hover:text-accent-gold transition-colors">
            {story.title}
          </h3>
          <p className="text-text-muted text-sm line-clamp-2">
            {story.tagline}
          </p>
          <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
            <span>{story.page_count} pages</span>
            <span className="flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              Ages 4-10
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
