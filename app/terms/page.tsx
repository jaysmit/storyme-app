import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-black text-white mb-8">Terms of Service</h1>

          <div className="prose prose-invert max-w-none space-y-8">
            <section className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Welcome to StoryMe</h2>
              <p className="text-text-muted">
                By using StoryMe, you agree to these terms. Please read them carefully
                before creating your personalized storybook.
              </p>
            </section>

            <section className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Photo Requirements</h2>
              <p className="text-text-muted mb-4">By uploading photos, you confirm that:</p>
              <ul className="list-disc pl-6 text-text-muted space-y-2">
                <li>You have the right to use the photos</li>
                <li>You have consent from the individuals pictured (or are their guardian)</li>
                <li>The photos are appropriate for a children's storybook</li>
              </ul>
            </section>

            <section className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Your Book</h2>
              <p className="text-text-muted">
                Your personalized storybook is created for your personal, non-commercial use.
                You may share your book with family and friends. The underlying story content
                and art styles remain the property of StoryMe.
              </p>
            </section>

            <section className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Amendments & Refunds</h2>
              <p className="text-text-muted">
                Every book includes 3 free amendments before printing. If you're not satisfied
                with your book, please contact us within 14 days of delivery for a full refund.
              </p>
            </section>

            <section className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Contact</h2>
              <p className="text-text-muted">
                Questions about these terms? Contact us at{" "}
                <a href="mailto:legal@storyme.com" className="text-accent-gold hover:underline">
                  legal@storyme.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
