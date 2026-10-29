import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-brand-darker text-text-muted px-6 md:px-20 py-14">
      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-start gap-10">
        {/* Left side */}
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="font-display text-[28px] font-black text-white no-underline"
          >
            StoryMe
          </Link>
          <span>Picture books where the people you love are the heroes.</span>
          <span className="text-sm">
            &copy; 2026 StoryMe
          </span>
        </div>

        {/* Right side links */}
        <div className="flex gap-16">
          <div className="flex flex-col gap-3">
            <strong className="text-white text-sm tracking-wider uppercase">
              Explore
            </strong>
            <Link href="/worlds" className="text-[#D9D5F5] no-underline hover:text-white">
              Worlds
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <strong className="text-white text-sm tracking-wider uppercase">
              Help
            </strong>
            <Link href="/pricing" className="text-[#D9D5F5] no-underline hover:text-white">
              Pricing
            </Link>
            <Link href="/faq" className="text-[#D9D5F5] no-underline hover:text-white">
              FAQ
            </Link>
            <Link href="/contact" className="text-[#D9D5F5] no-underline hover:text-white">
              Contact
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <strong className="text-white text-sm tracking-wider uppercase">
              Legal
            </strong>
            <Link href="/privacy" className="text-[#D9D5F5] no-underline hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="text-[#D9D5F5] no-underline hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
