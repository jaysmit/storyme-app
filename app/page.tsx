import Link from "next/link";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

const artStyles = [
  {
    slug: "glow",
    name: "Enchanted glow",
    desc: "Our signature look. Rich painted light, golden sparkles and starry skies — pure bedtime wonder.",
    ages: "3–10",
  },
  {
    slug: "watercolour",
    name: "Watercolour dream",
    desc: "Soft washes and pastel skies that melt into the page. Gentle, calm and dreamy.",
    ages: "0–5",
  },
  {
    slug: "sketch",
    name: "Pencil sketch",
    desc: "Hand-drawn graphite on cream paper, like an illustrator's sketchbook come to life.",
    ages: "3–10",
  },
  {
    slug: "papercut",
    name: "Paper-cut",
    desc: "Layered paper and felt with real depth and texture, like a handmade pop-up book.",
    ages: "2–8",
  },
  {
    slug: "anim",
    name: "3D animated",
    desc: "Cinematic, glossy and bursting with colour, like stepping into an animated film.",
    ages: "4–10",
  },
  {
    slug: "silhouette",
    name: "Shadow silhouette",
    desc: "Bold black silhouettes against a glowing sunset sky, like a shadow-puppet show.",
    ages: "3–10",
  },
  {
    slug: "bricks",
    name: "Toy bricks",
    desc: "A whole world built from bright toy bricks — castles, dragons and all.",
    ages: "3–10",
  },
];

const stories = [
  {
    slug: "dragon-castle-valley",
    title: "The Dragon of Castle Valley",
    tagline: "A dragon guards the road to the glowing castle. Only a brave crew can win their way past.",
    cast: "4 parts",
  },
  {
    slug: "fairy-glade",
    title: "The Fairy Glade",
    tagline: "Follow the fireflies past the mushroom houses to a glade where the fairies are waiting.",
    cast: "4 parts",
  },
  {
    slug: "grand-final-day",
    title: "Grand Final Day",
    tagline: "One game, one final siren, and a whole family in the stands cheering.",
    cast: "5 parts",
  },
  {
    slug: "cloud-ship",
    title: "Captain of the Cloud Ship",
    tagline: "Your little one takes the helm of a flying ship, with family as the crew.",
    cast: "4 parts",
  },
  {
    slug: "super-squad",
    title: "The Super Squad and the Sorceress",
    tagline: "A cheeky sorceress is turning the city upside down. Time to suit up.",
    cast: "4 parts",
  },
  {
    slug: "galaxy-road-trip",
    title: "The Great Galaxy Road Trip",
    tagline: "An old rocket turns out to be the fastest ride in the galaxy — and home before bedtime.",
    cast: "4 parts",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-cream-light overflow-hidden">
        <Header theme="light" />

        <section className="relative flex flex-col gap-6 px-6 md:px-20 py-14 max-w-[560px]">
          <span className="self-start font-handwritten text-xl text-accent-rust -rotate-3">
            Once upon a time, starring…
          </span>
          <h1 className="text-5xl md:text-[68px] leading-none font-black tracking-tight text-text-dark">
            Your child,{" "}
            <span className="italic text-accent-rust">the hero</span> of their
            very own tale.
          </h1>
          <p className="text-lg leading-relaxed text-text-dark-muted max-w-[440px]">
            Gather your crew, choose an adventure, pick the art style and
            choose your book. Every step is free to explore until you're
            spellbound.
          </p>
          <div className="flex gap-3 items-center flex-wrap">
            <Link
              href="/create"
              className="bg-accent-gold text-brand-dark no-underline font-extrabold text-lg px-7 py-4 rounded-full flex items-center gap-2 shadow-lg hover:bg-accent-gold-light transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 4-11 11 5 5 11-11z" />
                <path d="M18 2v2M22 6h-2M20 2l-1 1" />
              </svg>
              Get started
            </Link>
            <Link
              href="/worlds"
              className="text-text-dark no-underline font-extrabold text-lg px-5 py-4 rounded-full border-2 border-text-dark hover:bg-text-dark hover:text-white transition-colors"
            >
              Explore worlds
            </Link>
          </div>
          <div className="flex flex-col gap-2 text-sm font-bold text-text-dark-muted">
            <span className="flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="#0F8C7A"
              >
                <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
              </svg>
              Free character preview · Up to 5 heroes per book
            </span>
            <span className="flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="#0F8C7A"
              >
                <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
              </svg>
              Printed and at your door in 7 days
            </span>
          </div>
        </section>
      </div>

      {/* Step 1: Gather your crew */}
      <section className="relative bg-brand-teal text-white px-6 md:px-20 py-24">
        <div className="max-w-[760px]">
          <span className="font-handwritten text-3xl font-bold text-accent-teal-light">
            Step 1 · Gather your crew
          </span>
          <h2 className="mt-4 text-4xl md:text-[56px] font-black tracking-tight leading-tight">
            Every great quest needs a crew.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[#CDE6E2]">
            Upload one clear photo of each person — siblings, best mates, Nan
            and even the dog. We turn every photo into a storybook character
            who still looks just like them.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {["Mia", "Leo", "Nan", "Pip"].map((name) => (
            <div
              key={name}
              className="bg-cream rounded-[28px] p-4 flex flex-col gap-4 shadow-xl"
            >
              <div className="relative grid grid-cols-2 gap-2">
                {/* Photo placeholder */}
                <div className="h-48 rounded-2xl overflow-hidden bg-[#EFE3C8] border-2 border-[#B9A67E]">
                  <img
                    src={`/api/placeholder/150/192?text=${encodeURIComponent(name + " Photo")}`}
                    alt={`${name} photo`}
                    className="w-full h-full object-cover opacity-60"
                  />
                </div>
                {/* Storybook placeholder */}
                <div className="h-48 rounded-2xl overflow-hidden bg-gradient-to-b from-[#6B5BB0] via-[#2A2470] to-[#1E1B4B] border-2 border-[#6E67B8]">
                  <img
                    src={`/api/placeholder/150/192?text=${encodeURIComponent(name + " Character")}`}
                    alt={`${name} character`}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Arrow */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-accent-gold border-4 border-cream flex items-center justify-center">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#14163A"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <strong className="font-display text-2xl font-black text-text-dark">
                    {name}
                  </strong>
                  <span className="block text-sm text-text-dark-muted">
                    {name === "Pip" ? "The family dog" : `Hero`}
                  </span>
                </div>
                <span className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-[#FFD9C7] text-text-dark">
                  Ready
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-3">
          <Link
            href="/create"
            className="bg-accent-gold text-brand-dark no-underline font-extrabold text-lg px-9 py-5 rounded-full shadow-xl hover:bg-accent-gold-light transition-colors"
          >
            Get started
          </Link>
          <span className="text-sm text-accent-teal-light">
            One photo per person · up to 5 in a book
          </span>
        </div>
      </section>

      {/* Step 2: Choose an adventure */}
      <section className="bg-brand-dark px-6 md:px-20 py-28">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div className="max-w-[760px]">
            <span className="font-handwritten text-3xl font-bold text-accent-gold">
              Step 2 · Choose an adventure
            </span>
            <h2 className="mt-4 text-4xl md:text-[56px] font-black tracking-tight leading-tight text-white">
              Choose a world to explore
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-text-muted">
              Every story has its own parts to play. Pick one, then choose who
              plays the captain, the wizard or the star player.
            </p>
          </div>
          <Link
            href="/worlds"
            className="shrink-0 no-underline font-extrabold text-base px-6 py-4 rounded-full border-2 border-accent-gold text-white hover:bg-accent-gold hover:text-brand-dark transition-colors"
          >
            Discover adventures
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {stories.map((story) => (
            <div
              key={story.slug}
              className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl overflow-hidden flex flex-col"
            >
              <div className="h-[272px] bg-gradient-to-br from-[#2C4F3E] to-[#1B1446] relative overflow-hidden">
                <img
                  src={`/api/placeholder/400/272?text=${encodeURIComponent(story.title)}`}
                  alt={story.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute left-4 top-4 bg-[rgba(20,22,58,0.85)] text-white text-sm font-extrabold px-3 py-1.5 rounded-full">
                  {story.cast}
                </span>
              </div>
              <div className="flex-1 p-6 flex flex-col gap-3">
                <h3 className="text-2xl font-black text-white leading-tight">
                  {story.title}
                </h3>
                <p className="text-base text-text-muted leading-relaxed">
                  {story.tagline}
                </p>
                <div className="mt-auto pt-2 flex justify-between items-center">
                  <span className="text-sm font-bold text-[#A9A4D8]">
                    24 pages
                  </span>
                  <Link
                    href={`/worlds/${story.slug}`}
                    className="text-accent-gold font-extrabold text-sm hover:text-accent-gold-light"
                  >
                    Preview the book
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/worlds"
            className="inline-block bg-accent-gold text-brand-dark no-underline font-extrabold text-lg px-8 py-4 rounded-full hover:bg-accent-gold-light transition-colors"
          >
            Discover all adventures
          </Link>
        </div>
      </section>

      {/* Step 3: Pick an enchantment */}
      <section className="bg-brand-purple px-6 md:px-20 py-28">
        <div className="max-w-[760px]">
          <span className="font-handwritten text-3xl font-bold text-accent-gold">
            Step 3 · Pick an enchantment
          </span>
          <h2 className="mt-4 text-4xl md:text-[56px] font-black tracking-tight leading-tight text-white">
            Try on a different kind of magic
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-text-muted">
            Your adventure, seven enchantments. Pick a style and watch the same
            story transform before your eyes.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {artStyles.map((style, i) => (
            <button
              key={style.slug}
              className={`text-left border-none bg-transparent p-0 cursor-pointer flex flex-col gap-3 ${
                i === 0 ? "opacity-100" : "opacity-70 hover:opacity-100"
              }`}
            >
              <div
                className={`h-32 rounded-2xl overflow-hidden bg-brand-dark ${
                  i === 0
                    ? "ring-3 ring-accent-gold"
                    : "ring-1 ring-brand-purple-muted"
                }`}
              >
                <img
                  src={`/api/placeholder/120/128?text=${encodeURIComponent(style.name)}`}
                  alt={style.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <span
                className={`text-sm font-extrabold ${
                  i === 0 ? "text-white" : "text-[#A9A4D8]"
                }`}
              >
                {style.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Step 4: Choose your book (Pricing) */}
      <section className="bg-cream text-text-dark px-6 md:px-20 py-28">
        <div className="text-center mb-12">
          <span className="font-handwritten text-3xl font-bold text-accent-rust">
            Step 4 · Choose your book
          </span>
          <h2 className="mt-4 text-4xl md:text-[56px] font-black tracking-tight">
            Peek for free. Pay when you're spellbound.
          </h2>
          <p className="mt-4 text-lg text-text-dark-muted">
            See your crew on the cover before you buy. Every book includes 3
            free amendments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              tag: "Instant",
              name: "Digital book",
              price: "$14.20",
              ship: "no shipping",
              items: [
                "Illustrated PDF and e-reader version",
                "Read on any screen in minutes",
                "3 free amendments",
              ],
              featured: false,
            },
            {
              tag: "Great value",
              name: "Softcover",
              price: "$23",
              ship: "+ shipping",
              items: [
                "Matte paperback for everyday reading",
                "Includes the digital copy",
                "3 free amendments",
              ],
              featured: false,
            },
            {
              tag: "Most loved",
              name: "Deluxe hardcover",
              price: "$34",
              ship: "+ shipping",
              items: [
                "Gold-foil hardcover, premium paper",
                "Personalised dedication page",
                "Includes the digital copy",
                "3 free amendments",
              ],
              featured: true,
            },
            {
              tag: "For gifting",
              name: "Treasure chest",
              price: "$119",
              ship: "+ shipping",
              items: [
                "Deluxe hardcover in a keepsake box",
                "Character poster print",
                "Gift message and chosen delivery date",
                "3 free amendments",
              ],
              featured: false,
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`rounded-[28px] p-0 pt-0 flex flex-col min-h-[440px] overflow-hidden ${
                plan.featured
                  ? "bg-brand-purple text-white border-2 border-accent-gold"
                  : "bg-white border border-[#EADBBE]"
              }`}
            >
              <div
                className={`h-[180px] overflow-hidden ${
                  plan.featured
                    ? "bg-[#2A2470]"
                    : "bg-[#F4E4C8]"
                }`}
              >
                <img
                  src={`/api/placeholder/300/180?text=${encodeURIComponent(plan.name)}`}
                  alt={plan.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 flex flex-col gap-4 flex-1">
                <span
                  className={`font-handwritten text-lg ${
                    plan.featured ? "text-accent-gold" : "text-accent-rust"
                  }`}
                >
                  {plan.tag}
                </span>
                <h3 className="text-[30px] font-black leading-tight">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-2">
                  <strong className="font-display text-[44px]">
                    {plan.price}
                  </strong>
                  <span
                    className={`text-sm font-bold ${
                      plan.featured ? "text-text-muted" : "text-text-dark-muted"
                    }`}
                  >
                    {plan.ship}
                  </span>
                </div>
                {plan.items.map((item, i) => (
                  <span
                    key={i}
                    className="text-base leading-snug flex gap-2 items-start"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill={plan.featured ? "#F4C95D" : "#0F8C7A"}
                      className="shrink-0 mt-1"
                    >
                      <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
                    </svg>
                    {item}
                  </span>
                ))}
                <Link
                  href="/create"
                  className={`mt-auto text-center no-underline font-extrabold text-base py-4 rounded-full ${
                    plan.featured
                      ? "bg-accent-gold text-brand-dark"
                      : "bg-brand-purple text-white"
                  }`}
                >
                  {plan.featured ? "Create my hardcover" : "Start free preview"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative bg-brand-dark px-6 md:px-20 py-32 overflow-hidden">
        <div className="relative flex flex-col items-center text-center gap-6">
          <svg width="64" height="64" viewBox="0 0 70 70">
            <path
              d="M48 8a28 28 0 1 0 14 40A24 24 0 0 1 48 8z"
              fill="#F4C95D"
            />
          </svg>
          <h2 className="text-4xl md:text-[68px] font-black tracking-tight leading-none text-white max-w-[900px]">
            Tonight's bedtime story could star{" "}
            <span className="italic text-accent-gold">them.</span>
          </h2>
          <p className="text-xl text-text-muted">
            Upload one photo. The first glimpse of magic is on us.
          </p>
          <Link
            href="/create"
            className="bg-accent-gold text-brand-dark no-underline font-extrabold text-xl px-10 py-5 rounded-full shadow-[0_0_50px_rgba(244,201,93,0.4)] hover:bg-accent-gold-light transition-colors"
          >
            Turn the first page
          </Link>
        </div>
      </section>

      {/* Footer */}
      <div className="flex-grow bg-brand-darker" />
      <Footer />
    </div>
  );
}
