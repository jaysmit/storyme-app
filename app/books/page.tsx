"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import BookViewer from "@/components/BookViewer";

interface PersonalizedPage {
  page_number: number;
  title: string;
  story_text: string;
}

interface TextOverlay {
  pageNumber: number;
  text: string;
  position: { x: number; y: number };
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  textAlign: "left" | "center" | "right";
  visible: boolean;
}

interface PageStatus {
  pageId: string;
  pageNumber: number;
  status: "pending" | "generating" | "completed" | "failed";
  url?: string;
  error?: string;
}

interface Book {
  id: string;
  status: string;
  preview_pages: { page_number: number; url: string; title?: string }[];
  page_statuses?: PageStatus[];
  personalized_pages?: PersonalizedPage[];
  text_overlays?: TextOverlay[];
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
  onPreview,
}: {
  book: Book;
  onDelete: (id: string) => void;
  isPreview: boolean;
  onPreview: (book: Book) => void;
}) {
  const storySlug = book.metadata?.bookId || book.metadata?.storySlug || "";
  const storyTitle = storyTitles[storySlug] || "Custom Story";
  const status = statusConfig[book.status] || statusConfig.draft;
  const coverUrl = book.preview_pages?.find((p) => p.page_number === 0)?.url;
  const characterCount = book.metadata?.characterCount || book.characters_snapshot?.length || 0;
  const pageCount = book.preview_pages?.length || 0;

  return (
    <div className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl overflow-hidden group hover:border-accent-gold/50 transition-colors">
      {/* Cover preview - clickable to open preview modal */}
      <button
        onClick={() => onPreview(book)}
        className="aspect-[4/3] w-full bg-gradient-to-br from-[#6B5BB0] to-[#1E1B4B] relative overflow-hidden cursor-pointer"
      >
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
        {/* Play/preview overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1E1B4B" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
          </div>
        </div>

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
      </button>

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
  const [previewBook, setPreviewBook] = useState<Book | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPages, setPreviewPages] = useState<{ page_number: number; url: string; title: string; story_text?: string }[]>([]);
  const [previewOverlays, setPreviewOverlays] = useState<TextOverlay[]>([]);
  const [missingPages, setMissingPages] = useState<PageStatus[]>([]);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  // When a book is selected for preview, fetch its story text and overlays
  async function openPreview(book: Book) {
    setPreviewBook(book);
    setPreviewLoading(true);
    setMissingPages([]);

    // Set text overlays from book if available
    setPreviewOverlays(book.text_overlays || []);

    // Check for missing/failed pages
    if (book.page_statuses && book.page_statuses.length > 0) {
      const incomplete = book.page_statuses.filter(
        (p) => p.status === "failed" || p.status === "pending"
      );
      setMissingPages(incomplete);
    }

    // Build pages array with images
    const pages = (book.preview_pages || []).map((p) => ({
      page_number: p.page_number,
      url: p.url,
      title: p.title || `Page ${p.page_number}`,
      story_text: undefined as string | undefined,
    }));

    // If book has personalized pages, merge the story text
    if (book.personalized_pages && book.personalized_pages.length > 0) {
      for (const page of pages) {
        const personalizedPage = book.personalized_pages.find((pp) => pp.page_number === page.page_number);
        if (personalizedPage) {
          page.title = personalizedPage.title;
          page.story_text = personalizedPage.story_text;
        }
      }
      setPreviewPages(pages);
      setPreviewLoading(false);
      return;
    }

    // Try to fetch story text from API
    try {
      const res = await fetch(`/api/books/${book.id}/story-text`);
      if (res.ok) {
        const data = await res.json();
        if (data.format === "v2" && data.pages) {
          for (const page of pages) {
            const storyPage = data.pages.find((sp: PersonalizedPage) => sp.page_number === page.page_number);
            if (storyPage) {
              page.title = storyPage.title;
              page.story_text = storyPage.story_text;
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch story text:", err);
    }

    setPreviewPages(pages);
    setPreviewLoading(false);
  }

  function closePreview() {
    setPreviewBook(null);
    setPreviewPages([]);
    setPreviewOverlays([]);
    setMissingPages([]);
    setRegenerating(false);
  }

  // Regenerate missing/failed pages
  async function regenerateMissingPages() {
    if (!previewBook || missingPages.length === 0) return;

    setRegenerating(true);

    try {
      // Retry each missing page
      const retryPromises = missingPages.map(async (page) => {
        try {
          const res = await fetch(`/api/books/${previewBook.id}/retry-page`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pageId: page.pageId }),
          });

          if (!res.ok) {
            console.error(`Failed to retry ${page.pageId}`);
            return null;
          }

          // Now generate the page
          const genRes = await fetch(`/api/books/${previewBook.id}/generate-page`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pageId: page.pageId }),
          });

          if (genRes.ok) {
            const data = await genRes.json();
            return { pageId: page.pageId, url: data.url, status: data.status };
          }
          return null;
        } catch (err) {
          console.error(`Error regenerating ${page.pageId}:`, err);
          return null;
        }
      });

      const results = await Promise.all(retryPromises);
      const successful = results.filter((r) => r && r.status === "completed");

      if (successful.length > 0) {
        // Refresh the book data
        const res = await fetch(`/api/books/${previewBook.id}`);
        if (res.ok) {
          const data = await res.json();
          const updatedBook = data.book as Book;

          // Update the preview with new pages
          setPreviewBook(updatedBook);

          // Rebuild pages array
          const pages = (updatedBook.preview_pages || []).map((p) => ({
            page_number: p.page_number,
            url: p.url,
            title: p.title || `Page ${p.page_number}`,
            story_text: undefined as string | undefined,
          }));

          // Merge story text
          if (updatedBook.personalized_pages) {
            for (const page of pages) {
              const personalized = updatedBook.personalized_pages.find(
                (pp) => pp.page_number === page.page_number
              );
              if (personalized) {
                page.title = personalized.title;
                page.story_text = personalized.story_text;
              }
            }
          }

          setPreviewPages(pages);
          setPreviewOverlays(updatedBook.text_overlays || []);

          // Update missing pages
          if (updatedBook.page_statuses) {
            const stillMissing = updatedBook.page_statuses.filter(
              (p) => p.status === "failed" || p.status === "pending"
            );
            setMissingPages(stillMissing);
          } else {
            setMissingPages([]);
          }

          // Also update the book in the main list
          setBooks((prev) =>
            prev.map((b) => (b.id === updatedBook.id ? updatedBook : b))
          );
        }
      }
    } catch (err) {
      console.error("Error regenerating pages:", err);
    }

    setRegenerating(false);
  }

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
                        onPreview={openPreview}
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
                        onPreview={openPreview}
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

      {/* Preview Modal */}
      {previewBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-auto">
            {previewLoading ? (
              <div className="bg-brand-purple-light rounded-3xl p-12 text-center">
                <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-text-muted">Loading preview...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Missing pages warning */}
                {missingPages.length > 0 && (
                  <div className="bg-amber-500/20 border border-amber-500/50 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/30 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                          <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-amber-200 font-bold">
                          {missingPages.length} page{missingPages.length !== 1 ? "s" : ""} missing
                        </p>
                        <p className="text-amber-200/70 text-sm">
                          {missingPages.map((p) => `Page ${p.pageNumber}`).join(", ")}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={regenerateMissingPages}
                      disabled={regenerating}
                      className="px-4 py-2 bg-amber-500 text-black font-bold rounded-full hover:bg-amber-400 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {regenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M23 4v6h-6M1 20v-6h6" />
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                          </svg>
                          Regenerate
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Book viewer */}
                <BookViewer
                  pages={previewPages}
                  title={storyTitles[previewBook.metadata?.bookId || previewBook.metadata?.storySlug || ""] || "Your Story"}
                  onClose={closePreview}
                  textOverlays={previewOverlays}
                />

                {/* Action buttons */}
                <div className="flex justify-center gap-4 pt-2">
                  <Link
                    href={`/book/${previewBook.id}/edit`}
                    className="px-6 py-3 bg-brand-purple border border-brand-purple-muted text-white font-bold rounded-full hover:bg-brand-purple-light transition-colors flex items-center gap-2"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit Text & Styling
                  </Link>
                  <Link
                    href={`/book/${previewBook.id}`}
                    className="px-6 py-3 bg-accent-gold text-brand-dark font-bold rounded-full hover:bg-accent-gold-light transition-colors flex items-center gap-2"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Open Full Page
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
