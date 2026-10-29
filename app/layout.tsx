import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StoryMe — Picture books starring your family",
  description: "Turn your kids, grandparents and even the dog into the heroes of their own illustrated storybook.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='10' fill='%2314163A'/%3E%3Cpath d='M7 12c4-2 9-2 13 2v17c-4-3-9-3-13-1z M33 12c-4-2-9-2-13 2v17c4-3 9-3 13-1z' fill='none' stroke='%23F4C95D' stroke-width='2.2' stroke-linejoin='round'/%3E%3C/svg%3E",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-brand-dark text-text-light">
        {children}
      </body>
    </html>
  );
}
