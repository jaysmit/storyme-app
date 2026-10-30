import Link from "next/link";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

export default function PricingPage() {
  const plans = [
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
  ];

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-black text-white mb-4">Pricing</h1>
            <p className="text-xl text-text-muted max-w-2xl mx-auto">
              Every story starts with a free preview. Pay only when you're ready to bring it home.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-3xl flex flex-col overflow-hidden ${
                  plan.featured
                    ? "bg-brand-purple text-white border-2 border-accent-gold"
                    : "bg-brand-purple-light border border-brand-purple-muted text-white"
                }`}
              >
                <div
                  className={`h-[140px] overflow-hidden ${
                    plan.featured ? "bg-[#2A2470]" : "bg-brand-purple-muted"
                  }`}
                >
                  <img
                    src={`/api/placeholder/300/140?text=${encodeURIComponent(plan.name)}`}
                    alt={plan.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6 flex flex-col gap-4 flex-1">
                  <span
                    className={`font-handwritten text-lg ${
                      plan.featured ? "text-accent-gold" : "text-accent-teal"
                    }`}
                  >
                    {plan.tag}
                  </span>
                  <h3 className="text-2xl font-black leading-tight">{plan.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <strong className="font-display text-4xl">{plan.price}</strong>
                    <span className="text-sm text-text-muted">{plan.ship}</span>
                  </div>
                  {plan.items.map((item, i) => (
                    <span key={i} className="text-sm flex gap-2 items-start">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill={plan.featured ? "#F4C95D" : "#0F8C7A"}
                        className="shrink-0 mt-0.5"
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
                        : "bg-accent-gold text-brand-dark"
                    }`}
                  >
                    Start creating
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
