"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

interface Book {
  id: string;
  status: string;
  preview_pages: { page_number: number; url: string; title: string }[];
  metadata?: {
    storySlug?: string;
    artStyle?: string;
  };
  created_at: string;
}

const storyTitles: Record<string, string> = {
  "dragon-castle-valley": "The Dragon of Castle Valley",
  "fairy-glade": "The Fairy Glade",
  "grand-final-day": "Grand Final Day",
  "cloud-ship": "Captain of the Cloud Ship",
  "super-squad": "The Super Squad and the Sorceress",
  "galaxy-road-trip": "The Great Galaxy Road Trip",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "text-text-muted" },
  generating: { label: "Generating...", color: "text-accent-gold" },
  preview_ready: { label: "Preview Ready", color: "text-accent-teal" },
  failed: { label: "Failed", color: "text-red-400" },
  purchased: { label: "Purchased", color: "text-green-400" },
};

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooks();
  }, []);

  async function fetchBooks() {
    setLoading(true);
    try {
      const res = await fetch("/api/books");
      if (res.ok) {
        const data = await res.json();
        setBooks(data.books || []);
      }
    } catch (error) {
      console.error("Failed to fetch books:", error);
    }
    setLoading(false);
  }

  async function deleteBook(id: string) {
    if (!confirm("Are you sure you want to delete this book?")) return;

    try {
      const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBooks((prev) => prev.filter((b) => b.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete book:", error);
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">My Books</h1>
              <p className="text-lg text-text-muted">
                View and manage your storybooks.
              </p>
            </div>
            <Link
              href="/create"
              className="px-6 py-3 bg-accent-gold text-brand-dark font-extrabold rounded-full hover:bg-accent-gold-light transition-colors flex items-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New book
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-muted">Loading your books...</p>
            </div>
          ) : books.length === 0 ? (
            <div className="text-center py-20 bg-brand-purple-light border border-brand-purple-muted rounded-3xl">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-2xl font-black text-white mb-2">
                No books yet
              </h2>
              <p className="text-text-muted mb-6">
                Create your first personalized storybook!
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
              {books.map((book) => {
                const storyTitle = storyTitles[book.metadata?.storySlug || ""] || "Custom Story";
                const status = statusLabels[book.status] || statusLabels.draft;
                const coverUrl = book.preview_pages[0]?.url;

                return (
                  <div
                    key={book.id}
                    className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl overflow-hidden"
                  >
                    {/* Cover preview */}
                    <div className="aspect-[16/9] bg-gradient-to-br from-[#6B5BB0] to-[#1E1B4B] relative">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={storyTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-6xl">📚</span>
                        </div>
                      )}
                      <div className={`absolute top-3 right-3 px-3 py-1 rounded-full bg-black/50 text-xs font-bold ${status.color}`}>
                        {status.label}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-5">
                      <h3 className="text-xl font-black text-white mb-1">
                        {storyTitle}
                      </h3>
                      <p className="text-sm text-text-muted mb-4">
                        {book.preview_pages.length} pages • {book.metadata?.artStyle || "glow"} style
                      </p>

                      <div className="flex gap-3">
                        <Link
                          href={`/book/${book.id}`}
                          className="flex-1 px-4 py-3 bg-accent-gold text-brand-dark font-bold rounded-full text-center hover:bg-accent-gold-light transition-colors"
                        >
                          View book
                        </Link>
                        <button
                          onClick={() => deleteBook(book.id)}
                          className="w-12 h-12 rounded-full bg-brand-purple-muted text-text-muted hover:bg-accent-pink hover:text-white transition-colors flex items-center justify-center"
                          title="Delete book"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          </svg>
                        </button>
                      </div>
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
