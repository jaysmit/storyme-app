"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface HeaderProps {
  theme?: "light" | "dark";
}

// Cache user in memory to prevent flash on navigation
let cachedUser: User | null = null;

export default function Header({ theme = "dark" }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isLight = theme === "light";
  const supabase = createClient();

  // Initialize with cached user to prevent flash
  const [user, setUser] = useState<User | null>(cachedUser);
  const [loading, setLoading] = useState(cachedUser === null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [tokens, setTokens] = useState<number | null>(null);

  useEffect(() => {
    // Only fetch if we don't have cached user
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      cachedUser = user;
      setUser(user);
      setLoading(false);
      if (user) fetchTokens();
    }

    async function fetchTokens() {
      try {
        const res = await fetch("/api/tokens");
        if (res.ok) {
          const data = await res.json();
          setTokens(data.tokens);
        }
      } catch {
        // Ignore errors
      }
    }

    if (cachedUser === null) {
      getUser();
    } else if (cachedUser) {
      fetchTokens();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      cachedUser = session?.user ?? null;
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) fetchTokens();
      else setTokens(null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    cachedUser = null;
    setShowUserMenu(false);
    router.push("/");
    router.refresh();
  }

  // Get display name from user metadata or email
  const displayName = user?.user_metadata?.name || user?.email?.split("@")[0] || "User";
  const initials = displayName.charAt(0).toUpperCase();

  const navLinks = user
    ? [
        { href: "/worlds", label: "Worlds" },
        { href: "/characters", label: "Characters" },
        { href: "/books", label: "My Books" },
        { href: "/favorites", label: "Favorites" },
      ]
    : [
        { href: "/worlds", label: "Worlds" },
        { href: "/pricing", label: "Pricing" },
      ];

  const accentLine = isLight ? "#B8431F" : "#F4C95D";
  const bgColor = isLight ? "transparent" : "#14163A";
  const textColor = isLight ? "#1E1B4B" : "#F3F0FF";
  const ctaBg = isLight ? "#1E1B4B" : "#F4C95D";
  const ctaText = isLight ? "#FFFFFF" : "#14163A";

  return (
    <header
      className="w-full h-[60px] md:h-[92px] flex items-center justify-between px-4 md:px-20 relative"
      style={{ background: bgColor }}
    >
      {/* Logo - smaller on mobile */}
      <Link
        href="/"
        className="flex items-center gap-1.5 md:gap-3 no-underline shrink-0"
        style={{ color: textColor }}
      >
        <svg
          className="w-7 h-7 md:w-10 md:h-10"
          viewBox="0 0 40 40"
          fill="none"
          stroke={textColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 11c5-2 10-2 15 2v20c-5-4-10-4-15-2z" />
          <path d="M35 11c-5-2-10-2-15 2v20c5-4 10-4 15-2z" />
          <path
            d="M28 2l1.2 3 3 1.2-3 1.2L28 10.4l-1.2-3-3-1.2 3-1.2z"
            fill="#E0AE2C"
            stroke="#E0AE2C"
          />
        </svg>
        <span className="font-display text-lg md:text-[28px] font-black tracking-tight">
          StoryMe
        </span>
      </Link>

      {/* Navigation - hidden on mobile */}
      <nav className="hidden md:flex items-center gap-8 font-bold text-base">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="py-2 no-underline transition-colors"
              style={{
                color: textColor,
                borderBottom: `3px solid ${isActive ? accentLine : "transparent"}`,
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-4">
        {loading ? (
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-brand-purple-muted animate-pulse" />
        ) : user ? (
          <>
            {/* Token Badge - Always visible */}
            {tokens !== null && (
              <Link
                href="/pricing"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full no-underline transition-all hover:scale-105"
                style={{
                  background: tokens > 0 ? "rgba(244, 201, 93, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  border: `1px solid ${tokens > 0 ? "#F4C95D" : "#EF4444"}`
                }}
                title={tokens > 0 ? `${tokens} tokens remaining` : "Out of tokens - click to buy more"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={tokens > 0 ? "#F4C95D" : "#EF4444"}>
                  <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
                </svg>
                <span
                  className="text-sm font-bold"
                  style={{ color: tokens > 0 ? "#F4C95D" : "#EF4444" }}
                >
                  {tokens}
                </span>
              </Link>
            )}

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 font-bold py-2"
                style={{ color: textColor }}
              >
                <div
                  className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center text-xs md:text-sm font-bold"
                  style={{ background: "#6E67B8", color: "#FFFFFF" }}
                >
                  {initials}
                </div>
                <span className="hidden md:inline">{displayName}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`hidden md:block transition-transform ${showUserMenu ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div
                  className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-lg z-50 border overflow-hidden"
                  style={{ background: "#1E1B4B", borderColor: "#3D3A6E" }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: "#3D3A6E" }}>
                    <p className="text-sm font-bold text-white truncate">{displayName}</p>
                    <p className="text-xs text-text-muted truncate">{user.email}</p>
                    {tokens !== null && (
                      <div className="flex items-center gap-1 mt-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#F4C95D">
                          <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
                        </svg>
                        <span className="text-xs font-bold text-accent-gold">{tokens} tokens</span>
                      </div>
                    )}
                  </div>
                  <div className="py-2">
                    <Link
                      href="/characters"
                      className="block px-4 py-2 text-sm hover:bg-brand-purple-muted transition-colors"
                      style={{ color: textColor }}
                      onClick={() => setShowUserMenu(false)}
                    >
                      My Characters
                    </Link>
                    <Link
                      href="/books"
                      className="block px-4 py-2 text-sm hover:bg-brand-purple-muted transition-colors"
                      style={{ color: textColor }}
                      onClick={() => setShowUserMenu(false)}
                    >
                      My Books
                    </Link>
                    <Link
                      href="/favorites"
                      className="block px-4 py-2 text-sm hover:bg-brand-purple-muted transition-colors"
                      style={{ color: textColor }}
                      onClick={() => setShowUserMenu(false)}
                    >
                      Favorites
                    </Link>
                  </div>
                  <div className="border-t py-2" style={{ borderColor: "#3D3A6E" }}>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-brand-purple-muted transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
            </div>
          </>
        ) : (
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="font-bold py-2 no-underline"
              style={{
                color: textColor,
                borderBottom: `3px solid ${pathname === "/login" ? accentLine : "transparent"}`,
              }}
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="font-bold py-2 no-underline"
              style={{
                color: textColor,
                borderBottom: `3px solid ${pathname === "/register" ? accentLine : "transparent"}`,
              }}
            >
              Sign up
            </Link>
          </div>
        )}

        {/* CTA Button - compact on mobile */}
        <Link
          href="/create"
          className="font-extrabold px-3 py-2 md:px-5 md:py-3 rounded-full no-underline text-xs md:text-base whitespace-nowrap"
          style={{ background: ctaBg, color: ctaText }}
        >
          {user ? "Create" : "Start"}
          <span className="hidden md:inline">{user ? " book" : " free"}</span>
        </Link>

        {/* Mobile menu button */}
        <button
          className="md:hidden w-9 h-9 flex items-center justify-center"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          style={{ color: textColor }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {showMobileMenu ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {showMobileMenu && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-[998] md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
          {/* Menu panel */}
          <div
            className="fixed top-[60px] left-0 right-0 border-t z-[999] md:hidden shadow-2xl"
            style={{
              backgroundColor: isLight ? "#FFFFFF" : "#14163A",
              borderColor: "#3D3A6E"
            }}
          >
            <nav className="flex flex-col py-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-3 text-base font-bold no-underline hover:bg-brand-purple-muted/50 transition-colors"
                  style={{ color: textColor }}
                  onClick={() => setShowMobileMenu(false)}
                >
                  {link.label}
                </Link>
              ))}
              {!user && (
                <>
                  <div className="border-t my-2" style={{ borderColor: "#3D3A6E" }} />
                  <Link
                    href="/login"
                    className="px-4 py-3 text-base font-bold no-underline hover:bg-brand-purple-muted/50 transition-colors"
                    style={{ color: textColor }}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-3 text-base font-bold no-underline hover:bg-brand-purple-muted/50 transition-colors"
                    style={{ color: textColor }}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Sign up
                  </Link>
                </>
              )}
              {user && (
                <>
                  <div className="border-t my-2" style={{ borderColor: "#3D3A6E" }} />
                  <button
                    onClick={() => {
                      handleSignOut();
                      setShowMobileMenu(false);
                    }}
                    className="px-4 py-3 text-base font-bold text-left text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Sign out
                  </button>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
