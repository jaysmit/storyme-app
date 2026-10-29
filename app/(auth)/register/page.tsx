"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/ui/Header";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/create");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-8">
            <h1 className="text-3xl font-black text-white text-center mb-2">
              Start your story
            </h1>
            <p className="text-text-muted text-center mb-8">
              Create an account to begin your adventure
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-bold text-text-muted mb-2"
                >
                  Your name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-bold text-text-muted mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-bold text-text-muted mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold"
                  placeholder="••••••••"
                />
                <p className="text-xs text-text-muted mt-1">
                  At least 6 characters
                </p>
              </div>

              {error && (
                <p className="text-accent-pink text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent-gold text-brand-dark font-extrabold py-4 rounded-full hover:bg-accent-gold-light transition-colors disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="text-text-muted text-center mt-6">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-accent-gold hover:text-accent-gold-light font-bold"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
