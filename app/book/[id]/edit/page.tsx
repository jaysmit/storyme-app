import { Suspense } from "react";
import BookEditContent from "./BookEditContent";
import Header from "@/components/ui/Header";

// Return placeholder for Next.js Cache Components validation
export async function generateStaticParams() {
  return [{ id: "demo" }];
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Loading editor...</p>
        </div>
      </main>
    </div>
  );
}

export default async function BookEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<LoadingState />}>
      <BookEditContent bookId={id} />
    </Suspense>
  );
}
