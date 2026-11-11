"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

interface Book {
  id: string;
  status: string;
  preview_pages: { page_number: number; url: string; title?: string }[];
  characters_snapshot?: { id: string; name: string; generated_image_url?: string }[];
  metadata?: {
    storySlug?: string;
    bookId?: string;
    artStyle?: string;
    characterCount?: number;
  };
  created_at: string;
}

const storyTitles: Record<string, string> = {
  "dragon-castle-valley": "The Dragon of Castle Valley",
  "the-dragon-of-castle-valley": "The Dragon of Castle Valley",
  "fairy-glade": "The Fairy Glade",
  "the-fairy-glade": "The Fairy Glade",
  "grand-final-day": "Grand Final Day",
  "cloud-ship": "Captain of the Cloud Ship",
  "captain-of-the-cloud-ship": "Captain of the Cloud Ship",
  "super-squad": "The Super Squad and the Sorceress",
  "the-super-squad-and-the-sorceress": "The Super Squad and the Sorceress",
  "galaxy-road-trip": "The Great Galaxy Road Trip",
  "the-great-galaxy-road-trip": "The Great Galaxy Road Trip",
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: "Draft", color: "text-text-muted", bgColor: "bg-gray-500/30" },
  generating: { label: "Generating...", color: "text-accent-gold", bgColor: "bg-accent-gold/20" },
  preview_ready: { label: "Cover Ready", color: "text-accent-teal", bgColor: "bg-accent-teal/20" },
  cover_approved: { label: "Ready to Generate", color: "text-accent-gold", bgColor: "bg-accent-gold/20" },
  generating_full: { label: "Generating Pages...", color: "text-accent-gold", bgColor: "bg-accent-gold/20" },
  completed: { label: "Complete", color: "text-green-400", bgColor: "bg-green-500/20" },
  purchased: { label: "Purchased", color: "text-accent-pink", bgColor: "bg-accent-pink/20" },
  failed: { label: "Failed", color: "text-red-400", bgColor: "bg-red-500/20" },
};

function BookCard({
  book,
  onDelete,
  isPreview,
}: {
  book: Book;
  onDelete: (id: string) => void;
  isPreview: boolean;
}) {
  const storySlug = book.metadata?.bookId || book.metadata?.storySlug || "";
  const storyTitle = storyTitles[storySlug] || "Custom Story";
  const status = statusConfig[book.status] || statusConfig.draft;
  const coverUrl = book.preview_pages?.find((p) => p.page_number === 0)?.url;
  const characterCount = book.metadata?.characterCount || book.characters_snapshot?.length || 0;
  const pageCount = book.preview_pages?.length || 0;

  return (
    <div className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl overflow-hidden group hover:border-accent-gold/50 transition-colors">
      {/* Cover preview */}
      <div className="aspect-[4/3] bg-gradient-to-br from-[#6B5BB0] to-[#1E1B4B] relative overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={storyTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl">📚</span>
          </div>
        )}

        {/* Status badge */}
        <div
          className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${status.bgColor} ${status.color}`}
        >
          {status.label}
        </div>

        {/* Character avatars */}
        {book.characters_snapshot && book.characters_snapshot.length > 0 && (
          <div className="absolute bottom-3 left-3 flex -space-x-2">
            {book.characters_snapshot.slice(0, 4).map((char, i) => (
              <div
                key={char.id}
                className="w-8 h-8 rounded-full border-2 border-brand-dark overflow-hidden bg-brand-purple"
                style={{ zIndex: 4 - i }}
              >
                {char.generated_image_url ? (
                  <img
                    src={char.generated_image_url}
                    alt={char.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">
                    {char.name.charAt(0)}
                  </div>
                )}
              </div>
            ))}
            {book.characters_snapshot.length > 4 && (
              <div className="w-8 h-8 rounded-full border-2 border-brand-dark bg-brand-purple-muted flex items-center justify-center text-xs text-text-muted">
                +{book.characters_snapshot.length - 4}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-lg font-black text-white mb-1 truncate">{storyTitle}</h3>
        <p className="text-sm text-text-muted mb-4">
          {characterCount} character{characterCount !== 1 ? "s" : ""} • {pageCount} page{pageCount !== 1 ? "s" : ""}
        </p>

        <div className="flex gap-2">
          {isPreview ? (
            <>
              <Link
                href={`/create?book=${book.id}`}
                className="flex-1 px-4 py-2.5 bg-accent-gold text-brand-dark font-bold rounded-full text-center hover:bg-accent-gold-light transition-colors text-sm"
              >
                Continue
              </Link>
              <Link
                href={`/book/${book.id}`}
                className="px-4 py-2.5 border border-brand-purple-muted text-text-muted font-bold rounded-full text-center hover:border-accent-gold hover:text-white transition-colors text-sm"
              >
                Preview
              </Link>
            </>
          ) : (
            <Link
              href={`/book/${book.id}`}
              className="flex-1 px-4 py-2.5 bg-accent-gold text-brand-dark font-bold rounded-full text-center hover:bg-accent-gold-light transition-colors text-sm"
            >
              View Book
            </Link>
          )}
          <button
            onClick={() => onDelete(book.id)}
            className="w-10 h-10 rounded-full bg-brand-purple-muted text-text-muted hover:bg-red-500/30 hover:text-red-400 transition-colors flex items-center justify-center shrink-0"
            title="Delete"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

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

  // Separate previews from completed books
  const previewStatuses = ["draft", "generating", "preview_ready", "cover_approved", "generating_full", "failed"];
  const completedStatuses = ["completed", "purchased"];

  const previews = books.filter((b) => previewStatuses.includes(b.status));
  const completed = books.filter((b) => completedStatuses.includes(b.status));

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">My Books</h1>
              <p className="text-lg text-text-muted">
                Your personalized storybooks and works in progress.
              </p>
            </div>
            <Link
              href="/create"
              className="px-6 py-3 bg-accent-gold text-brand-dark font-extrabold rounded-full hover:bg-accent-gold-light transition-colors flex items-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Book
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
              <h2 className="text-2xl font-black text-white mb-2">No books yet</h2>
              <p className="text-text-muted mb-6">
                Create your first personalized storybook!
              </p>
              <Link
                href="/create"
                className="inline-block bg-accent-gold text-brand-dark font-extrabold px-8 py-4 rounded-full hover:bg-accent-gold-light transition-colors"
              >
                Create a Book
              </Link>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Works in Progress */}
              {previews.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-black text-white">Works in Progress</h2>
                    <span className="px-3 py-1 bg-accent-gold/20 text-accent-gold rounded-full text-sm font-bold">
                      {previews.length}
                    </span>
                  </div>
                  <p className="text-text-muted mb-6">
                    Continue where you left off or generate the full book.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {previews.map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onDelete={deleteBook}
                        isPreview={true}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Completed Books */}
              {completed.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-black text-white">Completed Books</h2>
                    <span className="px-3 py-1 bg-accent-teal/20 text-accent-teal rounded-full text-sm font-bold">
                      {completed.length}
                    </span>
                  </div>
                  <p className="text-text-muted mb-6">
                    Your finished storybooks ready to view or purchase.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completed.map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        onDelete={deleteBook}
                        isPreview={false}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
