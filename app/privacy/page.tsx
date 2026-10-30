import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header theme="dark" />

      <main className="flex-1 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-black text-white mb-8">Privacy Policy</h1>

          <div className="prose prose-invert max-w-none space-y-8">
            <section className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Your Privacy Matters</h2>
              <p className="text-text-muted">
                At StoryMe, we take the privacy of you and your family seriously. This policy
                explains how we collect, use, and protect your personal information.
              </p>
            </section>

            <section className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Photos & Images</h2>
              <p className="text-text-muted mb-4">
                Photos you upload are used solely to create your personalized storybook
                characters. We:
              </p>
              <ul className="list-disc pl-6 text-text-muted space-y-2">
                <li>Never share your photos with third parties</li>
                <li>Encrypt all images in transit and at rest</li>
                <li>Delete original photos within 90 days of book completion</li>
                <li>Allow you to request immediate deletion at any time</li>
              </ul>
            </section>

            <section className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Personal Information</h2>
              <p className="text-text-muted">
                We collect only the information necessary to create and deliver your book:
                your email address, shipping address (for printed books), and payment
                information (processed securely by our payment provider).
              </p>
            </section>

            <section className="bg-brand-purple-light border border-brand-purple-muted rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Contact Us</h2>
              <p className="text-text-muted">
                If you have any questions about our privacy practices, please contact us at{" "}
                <a href="mailto:privacy@storyme.com" className="text-accent-gold hover:underline">
                  privacy@storyme.com
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
