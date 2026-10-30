import { Suspense } from "react";
import StoryDetailContent from "./StoryDetailContent";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

// Generate static params for known story slugs
export async function generateStaticParams() {
  return [
    { slug: "dragon-castle-valley" },
    { slug: "fairy-glade" },
    { slug: "grand-final-day" },
    { slug: "cloud-ship" },
    { slug: "super-squad" },
    { slug: "galaxy-road-trip" },
  ];
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted">Loading story...</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<LoadingState />}>
      <StoryDetailContent slug={slug} />
    </Suspense>
  );
}
