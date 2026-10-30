import { Suspense } from "react";
import BookDetailContent from "./BookDetailContent";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

// Return at least one param for Next.js 16 Cache Components validation
export async function generateStaticParams() {
  // Placeholder ID - actual books are user-specific
  return [{ id: "demo" }];
}

function LoadingState() {
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

export default async function BookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<LoadingState />}>
      <BookDetailContent bookId={id} />
    </Suspense>
  );
}
