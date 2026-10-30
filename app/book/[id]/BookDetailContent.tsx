"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import BookViewer from "@/components/BookViewer";

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

interface Props {
  bookId: string;
}

const storyTitles: Record<string, string> = {
  "dragon-castle-valley": "The Dragon of Castle Valley",
  "fairy-glade": "The Fairy Glade",
  "grand-final-day": "Grand Final Day",
  "cloud-ship": "Captain of the Cloud Ship",
  "super-squad": "The Super Squad and the Sorceress",
  "galaxy-road-trip": "The Great Galaxy Road Trip",
};

export default function BookDetailContent({ bookId }: Props) {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBook();
  }, [bookId]);

  async function fetchBook() {
    setLoading(true);
    try {
      const res = await fetch(`/api/books/${bookId}`);
      if (res.ok) {
        const data = await res.json();
        setBook(data.book);
      } else {
        setError("Book not found");
      }
    } catch (err) {
      console.error("Failed to fetch book:", err);
      setError("Failed to load book");
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col">
        <Header theme="dark" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-muted">Loading your book...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col">
        <Header theme="dark" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">📚</div>
            <h1 className="text-4xl font-black text-white mb-4">
              {error || "Book not found"}
            </h1>
            <p className="text-text-muted mb-8">
              This book might have been deleted or doesn't exist.
            </p>
            <Link
              href="/create"
              className="inline-block bg-accent-gold text-brand-dark font-extrabold px-8 py-4 rounded-full"
            >
              Create a new book
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const storyTitle = storyTitles[book.metadata?.storySlug || ""] || "Your Story";

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 text-text-muted hover:text-white mb-4 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to create
              </Link>
              <h1 className="text-4xl font-black text-white">{storyTitle}</h1>
              <p className="text-lg text-text-muted mt-2">
                {book.preview_pages.length} preview pages • {book.metadata?.artStyle || "glow"} style
              </p>
            </div>

            {book.status === "preview_ready" && (
              <span className="px-4 py-2 bg-accent-teal/20 text-accent-teal rounded-full text-sm font-bold">
                Preview Ready
              </span>
            )}
          </div>

          {/* Book viewer or status */}
          {book.status === "generating" ? (
            <BookViewer
              pages={[]}
              title={storyTitle}
              isGenerating={true}
              generatingProgress={50}
            />
          ) : book.preview_pages.length > 0 ? (
            <>
              <BookViewer pages={book.preview_pages} title={storyTitle} />

              {/* Call to action */}
              <div className="mt-8 bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-8 text-center">
                <h3 className="text-2xl font-black text-white mb-2">
                  Love your preview?
                </h3>
                <p className="text-text-muted mb-6">
                  Order the full 24-page printed storybook with all your characters.
                </p>
                <button className="bg-accent-gold text-brand-dark font-extrabold px-8 py-4 rounded-full hover:bg-accent-gold-light transition-colors">
                  Order Printed Book — $49.95
                </button>
                <p className="text-xs text-text-muted mt-4">
                  Includes hardcover book + digital PDF download
                </p>
              </div>
            </>
          ) : (
            <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-8 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-2xl font-black text-white mb-2">
                No preview yet
              </h2>
              <p className="text-text-muted mb-6">
                Generate a preview to see your storybook pages.
              </p>
              <Link
                href="/create"
                className="inline-block bg-accent-gold text-brand-dark font-extrabold px-8 py-4 rounded-full"
              >
                Generate preview
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
