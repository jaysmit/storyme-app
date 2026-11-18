"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

function PrintBookContent() {
  const params = useParams();
  const bookId = params.id as string;

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 py-12 px-6">
        <div className="max-w-2xl mx-auto text-center">
          {/* Coming Soon Card */}
          <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-12">
            <div className="text-6xl mb-6">🖨️</div>
            <h1 className="text-3xl font-black text-white mb-4">
              Print Your Book
            </h1>
            <p className="text-lg text-text-muted mb-8">
              We&apos;re working on bringing you beautiful printed storybooks!
              <br />
              This feature will be available soon.
            </p>

            {/* Features preview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-brand-purple/50 rounded-xl p-4">
                <div className="text-2xl mb-2">📚</div>
                <p className="text-sm text-text-muted">Premium hardcover</p>
              </div>
              <div className="bg-brand-purple/50 rounded-xl p-4">
                <div className="text-2xl mb-2">✨</div>
                <p className="text-sm text-text-muted">High-quality printing</p>
              </div>
              <div className="bg-brand-purple/50 rounded-xl p-4">
                <div className="text-2xl mb-2">🚚</div>
                <p className="text-sm text-text-muted">Worldwide shipping</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/book/${bookId}`}
                className="px-6 py-3 bg-accent-gold text-brand-dark font-bold rounded-full hover:bg-accent-gold-light transition-colors"
              >
                View Your Book
              </Link>
              <Link
                href="/books"
                className="px-6 py-3 border border-brand-purple-muted text-white font-bold rounded-full hover:border-accent-gold hover:text-accent-gold transition-colors"
              >
                Back to Books
              </Link>
            </div>
          </div>

          {/* Notify me option */}
          <p className="mt-8 text-text-muted text-sm">
            Want to be notified when printing is available?
            <br />
            <a href="mailto:hello@storyme.com" className="text-accent-gold hover:underline">
              Contact us
            </a>{" "}
            and we&apos;ll let you know!
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function PrintBookPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PrintBookContent />
    </Suspense>
  );
}
