import { redirect } from "next/navigation";
import { checkAdminAuth } from "@/lib/admin/auth";
import Link from "next/link";

// Allow blocking prerender for auth-protected routes
export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side admin check
  const authResult = await checkAdminAuth();

  if (!authResult.userId) {
    redirect("/login?redirect=/admin/analytics");
  }

  if (!authResult.isAdmin) {
    redirect("/?error=unauthorized");
  }

  return (
    <div className="min-h-screen bg-brand-darker">
      {/* Admin Header */}
      <header className="bg-brand-dark border-b border-brand-purple-muted sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and title */}
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-text-light hover:text-accent-gold transition-colors">
                <svg
                  className="w-8 h-8"
                  viewBox="0 0 40 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 11c5-2 10-2 15 2v20c-5-4-10-4-15-2z" />
                  <path d="M35 11c-5-2-10-2-15 2v20c5-4 10-4 15-2z" />
                </svg>
              </Link>
              <div className="border-l border-brand-purple-muted h-6 mx-2" />
              <h1 className="font-display text-lg font-bold text-text-light">
                Admin Dashboard
              </h1>
            </div>

            {/* Nav links */}
            <nav className="flex items-center gap-6">
              <Link
                href="/admin/analytics"
                className="text-sm font-semibold text-text-muted hover:text-text-light transition-colors"
              >
                Analytics
              </Link>
              <Link
                href="/admin/generations"
                className="text-sm font-semibold text-text-muted hover:text-text-light transition-colors"
              >
                Generations
              </Link>
              <Link
                href="/"
                className="text-sm font-semibold text-text-muted hover:text-text-light transition-colors"
              >
                Back to Site
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
