"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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

type BookCategory = "cover" | "book" | "error";

const storyTitles: Record<string, string> = {
  "dragon-castle-valley": "The Dragon of Castle Valley",
  "the-dragon-of-castle-valley": "The Dragon of Castle Valley",
  "fairy-glade": "The Fairy Glade",
  "the-fairy-glade": "The Fairy Glade",
  "grand-final-day": "Grand Final Day",
  "essendon-five": "Essendon Five",
  "cloud-ship": "Captain of the Cloud Ship",
  "captain-of-the-cloud-ship": "Captain of the Cloud Ship",
  "super-squad": "The Super Squad and the Sorceress",
  "the-super-squad-and-the-sorceress": "The Super Squad and the Sorceress",
  "galaxy-road-trip": "The Great Galaxy Road Trip",
  "the-great-galaxy-road-trip": "The Great Galaxy Road Trip",
};

function getStoryTitle(book: Book): string {
  const slug = book.metadata?.bookId || book.metadata?.storySlug || "";
  return storyTitles[slug] || "Custom Story";
}

// Determine which category a book belongs to
function categorizeBook(book: Book): BookCategory {
  // Check for errors first - books with failed/pending pages
  if (book.page_statuses && book.page_statuses.length > 0) {
    const hasErrors = book.page_statuses.some(
      (p) => p.status === "failed" || p.status === "pending"
    );
    if (hasErrors) return "error";
  }

  // Completed books
  if (book.status === "completed" || book.status === "purchased") {
    return "book";
  }

  // Everything else is a cover (preview_ready, cover_approved, generating, draft, etc.)
  return "cover";
}

function BookCard({
  book,
  category,
  onDelete,
  onPreview,
}: {
  book: Book;
  category: BookCategory;
  onDelete: (id: string) => void;
  onPreview: (book: Book, category: BookCategory) => void;
}) {
  const storyTitle = getStoryTitle(book);
  const coverUrl = book.preview_pages?.find((p) => p.page_number === 0)?.url;
  const characterCount = book.metadata?.characterCount || book.characters_snapshot?.length || 0;
  const pageCount = book.preview_pages?.length || 0;

  // Get status badge based on category
  const getStatusBadge = () => {
    if (category === "error") {
      const failedCount = book.page_statuses?.filter((p) => p.status === "failed" || p.status === "pending").length || 0;
      return { label: `${failedCount} page${failedCount !== 1 ? "s" : ""} failed`, color: "text-red-400", bgColor: "bg-red-500/20" };
    }
    if (category === "book") {
      return { label: "Complete", color: "text-green-400", bgColor: "bg-green-500/20" };
    }
    // Cover
    return { label: "Cover Ready", color: "text-accent-teal", bgColor: "bg-accent-teal/20" };
  };

  const status = getStatusBadge();

  return (
    <div className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl overflow-hidden group hover:border-accent-gold/50 transition-colors">
      {/* Cover preview - clickable to open preview modal */}
      <button
        onClick={() => onPreview(book, category)}
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
        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${status.bgColor} ${status.color}`}>
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
          {category === "cover" && (
            <>
              <Link
                href={`/create?book=${book.id}`}
                className="flex-1 px-4 py-2.5 bg-accent-gold text-brand-dark font-bold rounded-full text-center hover:bg-accent-gold-light transition-colors text-sm"
              >
                Generate Book
              </Link>
              <button
                onClick={() => onPreview(book, category)}
                className="px-4 py-2.5 border border-brand-purple-muted text-text-muted font-bold rounded-full hover:border-accent-gold hover:text-white transition-colors text-sm"
              >
                Preview
              </button>
            </>
          )}
          {category === "book" && (
            <>
              <Link
                href={`/book/${book.id}/print`}
                className="flex-1 px-4 py-2.5 bg-accent-gold text-brand-dark font-bold rounded-full text-center hover:bg-accent-gold-light transition-colors text-sm"
              >
                Print Book
              </Link>
              <button
                onClick={() => onPreview(book, category)}
                className="px-4 py-2.5 border border-brand-purple-muted text-text-muted font-bold rounded-full hover:border-accent-gold hover:text-white transition-colors text-sm"
              >
                Preview
              </button>
            </>
          )}
          {category === "error" && (
            <>
              <Link
                href={`/create?book=${book.id}`}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white font-bold rounded-full text-center hover:bg-red-400 transition-colors text-sm"
              >
                Fix Errors
              </Link>
              <button
                onClick={() => onPreview(book, category)}
                className="px-4 py-2.5 border border-brand-purple-muted text-text-muted font-bold rounded-full hover:border-accent-gold hover:text-white transition-colors text-sm"
              >
                Preview
              </button>
            </>
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

function BooksPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewBook, setPreviewBook] = useState<Book | null>(null);
  const [previewCategory, setPreviewCategory] = useState<BookCategory>("cover");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPages, setPreviewPages] = useState<{ page_number: number; url: string; title: string; story_text?: string }[]>([]);
  const [previewOverlays, setPreviewOverlays] = useState<TextOverlay[]>([]);
  const [missingPages, setMissingPages] = useState<PageStatus[]>([]);
  const [autoPreviewHandled, setAutoPreviewHandled] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  // Handle ?preview=bookId URL parameter
  useEffect(() => {
    if (loading || autoPreviewHandled || books.length === 0) return;

    const previewId = searchParams.get("preview");
    if (previewId) {
      const bookToPreview = books.find((b) => b.id === previewId);
      if (bookToPreview) {
        const category = categorizeBook(bookToPreview);
        openPreview(bookToPreview, category);
        router.replace("/books", { scroll: false });
      }
      setAutoPreviewHandled(true);
    }
  }, [loading, books, searchParams, autoPreviewHandled]);

  async function openPreview(book: Book, category: BookCategory) {
    setPreviewBook(book);
    setPreviewCategory(category);
    setPreviewLoading(true);
    setMissingPages([]);

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
        if (previewBook?.id === id) {
          closePreview();
        }
      }
    } catch (error) {
      console.error("Failed to delete book:", error);
    }
  }

  // Categorize all books
  const covers = books.filter((b) => categorizeBook(b) === "cover");
  const completedBooks = books.filter((b) => categorizeBook(b) === "book");
  const errorBooks = books.filter((b) => categorizeBook(b) === "error");

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">My Books</h1>
              <p className="text-lg text-text-muted">
                Your personalized storybooks and covers.
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
              {/* Errors Section - Show first if any */}
              {errorBooks.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-black text-white">Needs Attention</h2>
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-bold">
                      {errorBooks.length}
                    </span>
                  </div>
                  <p className="text-text-muted mb-6">
                    These books have pages that failed to generate. Click to fix.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {errorBooks.map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        category="error"
                        onDelete={deleteBook}
                        onPreview={openPreview}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Covers Section */}
              {covers.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-black text-white">Covers</h2>
                    <span className="px-3 py-1 bg-accent-teal/20 text-accent-teal rounded-full text-sm font-bold">
                      {covers.length}
                    </span>
                  </div>
                  <p className="text-text-muted mb-6">
                    Cover previews ready. Generate the full book when you&apos;re happy with the cover.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {covers.map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        category="cover"
                        onDelete={deleteBook}
                        onPreview={openPreview}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Completed Books Section */}
              {completedBooks.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-2xl font-black text-white">Books</h2>
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-bold">
                      {completedBooks.length}
                    </span>
                  </div>
                  <p className="text-text-muted mb-6">
                    Completed storybooks ready to print.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {completedBooks.map((book) => (
                      <BookCard
                        key={book.id}
                        book={book}
                        category="book"
                        onDelete={deleteBook}
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
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
          {/* Scrollable content area */}
          <div className="flex-1 overflow-auto p-4 pb-24">
            <div className="max-w-5xl mx-auto">
              {previewLoading ? (
                <div className="bg-brand-purple-light rounded-3xl p-12 text-center">
                  <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-text-muted">Loading preview...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Missing pages warning for errors */}
                  {missingPages.length > 0 && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-500/30 flex items-center justify-center shrink-0">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                            <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-red-200 font-bold">
                            {missingPages.length} page{missingPages.length !== 1 ? "s" : ""} need attention
                          </p>
                          <p className="text-red-200/70 text-sm">
                            {missingPages.map((p) => `Page ${p.pageNumber}`).join(", ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Book viewer */}
                  <BookViewer
                    pages={previewPages}
                    title={getStoryTitle(previewBook)}
                    onClose={closePreview}
                    textOverlays={previewOverlays}
                    bookId={previewBook.id}
                    showActions={false}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Fixed bottom action bar */}
          <div className="bg-brand-purple-light border-t border-brand-purple-muted p-4">
            <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
              {/* Left side - close button */}
              <button
                onClick={closePreview}
                className="px-4 py-2.5 border border-brand-purple-muted text-text-muted font-bold rounded-full hover:border-white hover:text-white transition-colors flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                Close
              </button>

              {/* Right side - action buttons */}
              <div className="flex items-center gap-3">
                {previewCategory === "cover" && (
                  <>
                    <Link
                      href={`/book/${previewBook.id}/edit?page=0`}
                      className="px-4 py-2.5 border border-brand-purple-muted text-white font-bold rounded-full hover:border-accent-gold hover:text-accent-gold transition-colors flex items-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit Cover
                    </Link>
                    <Link
                      href={`/create?book=${previewBook.id}`}
                      className="px-6 py-2.5 bg-accent-gold text-brand-dark font-bold rounded-full hover:bg-accent-gold-light transition-colors flex items-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Generate Book
                    </Link>
                  </>
                )}
                {previewCategory === "book" && (
                  <>
                    <Link
                      href={`/book/${previewBook.id}/edit`}
                      className="px-4 py-2.5 border border-brand-purple-muted text-white font-bold rounded-full hover:border-accent-gold hover:text-accent-gold transition-colors flex items-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit Book
                    </Link>
                    <Link
                      href={`/book/${previewBook.id}/print`}
                      className="px-6 py-2.5 bg-accent-gold text-brand-dark font-bold rounded-full hover:bg-accent-gold-light transition-colors flex items-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      Print Book
                    </Link>
                  </>
                )}
                {previewCategory === "error" && (
                  <Link
                    href={`/create?book=${previewBook.id}`}
                    className="px-6 py-2.5 bg-red-500 text-white font-bold rounded-full hover:bg-red-400 transition-colors flex items-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 4v6h-6M1 20v-6h6" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    Fix & Regenerate
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function BooksPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-dark flex flex-col">
        <Header theme="dark" />
        <main className="flex-1 py-12 px-6">
          <div className="max-w-6xl mx-auto text-center py-20">
            <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-muted">Loading your books...</p>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <BooksPageContent />
    </Suspense>
  );
}
