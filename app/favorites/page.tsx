"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

interface FavoriteBook {
  id: string;
  created_at: string;
  book: {
    id: string;
    status: string;
    preview_pages: { page_number: number; url: string; title: string }[];
    created_at: string;
    story: {
      slug: string;
      title: string;
      category: string;
    } | null;
    art_style: {
      slug: string;
      name: string;
    } | null;
  };
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  async function fetchFavorites() {
    setLoading(true);
    try {
      const res = await fetch("/api/favorites");
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
      }
    } catch (error) {
      console.error("Failed to fetch favorites:", error);
    }
    setLoading(false);
  }

  async function removeFavorite(bookId: string) {
    try {
      const res = await fetch(`/api/favorites?bookId=${bookId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFavorites((prev) => prev.filter((f) => f.book.id !== bookId));
      }
    } catch (error) {
      console.error("Failed to remove favorite:", error);
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-black text-white mb-2">
              Your favorites
            </h1>
            <p className="text-lg text-text-muted">
              Books you've saved for later.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-muted">Loading favorites...</p>
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-20 bg-brand-purple-light border border-brand-purple-muted rounded-3xl">
              <div className="text-6xl mb-4">⭐</div>
              <h2 className="text-2xl font-black text-white mb-2">
                No favorites yet
              </h2>
              <p className="text-text-muted mb-6">
                Create a book and save it to your favorites!
              </p>
              <Link
                href="/create"
                className="inline-block bg-accent-gold text-brand-dark font-extrabold px-8 py-4 rounded-full hover:bg-accent-gold-light transition-colors"
              >
                Create a book
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {favorites.map((fav) => {
                const book = fav.book;
                const coverUrl = book.preview_pages[0]?.url;

                return (
                  <div
                    key={fav.id}
                    className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl overflow-hidden group"
                  >
                    {/* Cover preview */}
                    <div className="aspect-[16/9] bg-gradient-to-br from-[#6B5BB0] to-[#1E1B4B] relative">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={book.story?.title || "Book"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-6xl">📚</span>
                        </div>
                      )}

                      {/* Favorite badge */}
                      <button
                        onClick={() => removeFavorite(book.id)}
                        className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-yellow-400 hover:bg-red-500 hover:text-white transition-colors"
                        title="Remove from favorites"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          stroke="currentColor"
                          strokeWidth="1"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </button>

                      {/* Category badge */}
                      {book.story?.category && (
                        <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/50 text-xs font-bold text-white capitalize">
                          {book.story.category}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-5">
                      <h3 className="text-xl font-black text-white mb-1">
                        {book.story?.title || "Custom Story"}
                      </h3>
                      <p className="text-sm text-text-muted mb-4">
                        {book.preview_pages.length} pages •{" "}
                        {book.art_style?.name || "glow"} style
                      </p>

                      <Link
                        href={`/book/${book.id}`}
                        className="block w-full px-4 py-3 bg-accent-gold text-brand-dark font-bold rounded-full text-center hover:bg-accent-gold-light transition-colors"
                      >
                        View book
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
