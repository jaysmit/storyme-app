import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

const faqs = [
  {
    q: "How does the character transformation work?",
    a: "Upload a clear, front-facing photo of each person. Our AI creates a storybook character that maintains their likeness while fitting perfectly into the chosen art style.",
  },
  {
    q: "How many characters can I include in one book?",
    a: "Each book can feature up to 5 characters - perfect for the whole family including pets!",
  },
  {
    q: "What age range are the books suitable for?",
    a: "Our stories are designed for children aged 3-10, with different art styles suited to different age groups.",
  },
  {
    q: "How long does delivery take?",
    a: "Digital books are instant. Printed books arrive within 7 business days to most locations.",
  },
  {
    q: "Can I make changes after I've created my book?",
    a: "Yes! Every book includes 3 free amendments before printing.",
  },
  {
    q: "What if I'm not happy with the character transformation?",
    a: "We offer free regeneration if the character doesn't capture the likeness well. Simply contact us and we'll make it right.",
  },
  {
    q: "Are the photos stored securely?",
    a: "Yes, all photos are encrypted and stored securely. We never share your images with third parties.",
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-black text-white mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-text-muted">
              Everything you need to know about creating your storybook.
            </p>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-6"
              >
                <h3 className="text-lg font-bold text-white mb-3">{faq.q}</h3>
                <p className="text-text-muted">{faq.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-text-muted mb-4">Still have questions?</p>
            <a
              href="mailto:hello@storyme.com"
              className="inline-block bg-accent-gold text-brand-dark font-extrabold px-8 py-4 rounded-full"
            >
              Contact us
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
