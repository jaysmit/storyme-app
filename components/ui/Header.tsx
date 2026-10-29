"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface HeaderProps {
  theme?: "light" | "dark";
  user?: { name: string; avatar_url?: string } | null;
}

export default function Header({ theme = "dark", user }: HeaderProps) {
  const pathname = usePathname();
  const isLight = theme === "light";

  const navLinks = [
    { href: "/worlds", label: "Worlds" },
    { href: "/pricing", label: "Pricing" },
    { href: "/faq", label: "FAQ" },
  ];

  const accentLine = isLight ? "#B8431F" : "#F4C95D";
  const bgColor = isLight ? "transparent" : "#14163A";
  const textColor = isLight ? "#1E1B4B" : "#F3F0FF";
  const ctaBg = isLight ? "#1E1B4B" : "#F4C95D";
  const ctaText = isLight ? "#FFFFFF" : "#14163A";

  return (
    <header
      className="w-full h-[92px] flex items-center justify-between px-6 md:px-20"
      style={{ background: bgColor }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-3 no-underline"
        style={{ color: textColor }}
      >
        <svg
          width="40"
          height="40"
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
        <span className="font-display text-[28px] font-black tracking-tight">
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
      <div className="flex items-center gap-4">
        {/* Crews icon */}
        <Link
          href="/crews"
          aria-label="My crews"
          className="hidden md:flex w-11 h-11 rounded-full items-center justify-center"
          style={{
            color: textColor,
            boxShadow: `inset 0 0 0 2px ${pathname === "/crews" ? accentLine : "transparent"}`,
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
            <circle cx="10" cy="8" r="3.5" />
            <path d="M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35" />
            <path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8" />
          </svg>
        </Link>

        {user ? (
          <Link
            href="/profile"
            className="flex items-center gap-2 font-bold py-2"
            style={{ color: textColor }}
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: "#6E67B8", color: "#FFFFFF" }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden md:inline">{user.name}</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="hidden md:block font-bold py-2 no-underline"
            style={{
              color: textColor,
              borderBottom: `3px solid ${pathname === "/login" ? accentLine : "transparent"}`,
            }}
          >
            Log in
          </Link>
        )}

        <Link
          href="/create"
          className="font-extrabold px-5 py-3 rounded-full no-underline text-base"
          style={{ background: ctaBg, color: ctaText }}
        >
          Get started
        </Link>
      </div>
    </header>
  );
}
