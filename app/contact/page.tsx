import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-black text-white mb-4">Contact Us</h1>
            <p className="text-xl text-text-muted">
              We'd love to hear from you. Reach out with any questions or feedback.
            </p>
          </div>

          <div className="bg-brand-purple-light border border-brand-purple-muted rounded-3xl p-8">
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  Your name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold"
                  placeholder="jane@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-white mb-2">
                  Message
                </label>
                <textarea
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl bg-brand-dark border border-brand-purple-muted text-white placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-gold resize-none"
                  placeholder="Tell us what's on your mind..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-accent-gold text-brand-dark font-extrabold py-4 rounded-full hover:bg-accent-gold-light transition-colors"
              >
                Send message
              </button>
            </form>
          </div>

          <div className="mt-8 text-center text-text-muted">
            <p>
              Or email us directly at{" "}
              <a href="mailto:hello@storyme.com" className="text-accent-gold hover:underline">
                hello@storyme.com
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
