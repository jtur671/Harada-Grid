import React, { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AppHeader } from "./AppHeader";
import { AuthModal } from "./AuthModal";

type AuthView = "login" | "signup" | null;
type AppView = "home" | "builder" | "harada" | "dashboard" | "pricing" | "support";
type Plan = "free" | "premium";
type ModalType = "privacy" | "terms" | null;

type PricingPageProps = {
  user: User | null;
  isAdmin: boolean;
  isPro?: boolean;
  authView: AuthView;
  currentPlan: Plan | null;
  onSetAuthView: (view: AuthView) => void;
  onSelectPlan: (plan: Plan) => void;
  onSetAppView: (view: AppView) => void;
};

export const PricingPage: React.FC<PricingPageProps> = ({
  user,
  isAdmin,
  isPro = false,
  authView,
  currentPlan,
  onSetAuthView,
  onSelectPlan,
  onSetAppView,
}) => {
  const isLoggedIn = !!user;
  const [modalType, setModalType] = useState<ModalType>(null);

  const closeModal = () => setModalType(null);

  return (
    <div className="app app-dark">
      <div className="home-shell">
        <AppHeader
          user={user}
          isAdmin={isAdmin}
          isPro={isPro}
          onSetAuthView={onSetAuthView}
          onGoToHome={() => onSetAppView("home")}
          onGoToPricing={() => onSetAppView("pricing")}
          onGoToDashboard={() => onSetAppView("dashboard")}
          onGoToSupport={() => onSetAppView("support")}
        />

        <main className="home-main">
          <div className="pricing-main">
          <div className="pricing-hero">
            <p className="pricing-eyebrow">Pricing</p>
            <h1 className="pricing-title">Simple, transparent plans</h1>
            <p className="pricing-subtitle">
              Start free and upgrade only if you need more. No hidden fees,
              cancel anytime.
            </p>
          </div>

          <div className="pricing-grid">
            {/* Free plan */}
            <section className="pricing-card">
              <header className="pricing-card-header">
                <h2 className="pricing-card-name">Free</h2>
                {currentPlan === "free" && (
                  <span className="pricing-badge">Current plan</span>
                )}
              </header>

              <p className="pricing-price">
                <span className="pricing-amount">$0</span>
                <span className="pricing-period">/ forever</span>
              </p>

              <p className="pricing-tagline">
                Perfect for getting started with Action Maps.
              </p>

              <ul className="pricing-list">
                <li>Up to 3 Action Maps</li>
                <li>AI helper on each map</li>
                <li>Export &amp; print your grid</li>
                <li>Keep everything synced to the cloud</li>
              </ul>

              <button
                type="button"
                className="hero-secondary-cta hero-secondary-cta-large"
                onClick={() => onSelectPlan("free")}
              >
                {currentPlan === "free"
                  ? "Continue with Free plan"
                  : isLoggedIn
                  ? "Choose Free plan"
                  : "Start for free"}
              </button>
            </section>

            {/* Premium plan */}
            <section className="pricing-card pricing-card-premium">
              <header className="pricing-card-header">
                <h2 className="pricing-card-name">Premium</h2>
                {currentPlan === "premium" && (
                  <span className="pricing-badge">Current plan</span>
                )}
              </header>

              <p className="pricing-price">
                <span className="pricing-amount">$10</span>
                <span className="pricing-period">/ month</span>
              </p>

              <p className="pricing-tagline">
                For serious goal-setters who want unlimited maps.
              </p>

              <ul className="pricing-list">
                <li>Unlimited Action Maps</li>
                <li>Unlimited AI interactions</li>
                <li>Priority email support</li>
                <li>Early access to new features</li>
              </ul>

              <button
                type="button"
                className="hero-primary-cta hero-primary-cta-large"
                onClick={() => {
                  // Redirect to Stripe Payment Link
                  // IMPORTANT: Configure the success URL in Stripe Dashboard:
                  // https://dashboard.stripe.com → Products → Payment Links → Edit
                  // Set success URL to: https://harada-grid.pages.dev/#success?session_id={CHECKOUT_SESSION_ID}
                  window.location.href = "https://buy.stripe.com/6oU00ieslccXaam3vieME00";
                }}
              >
                {currentPlan === "premium"
                  ? "Continue with Premium"
                  : "Upgrade to Premium"}
              </button>

              <p className="pricing-footnote">
                Payments handled securely via Stripe. You can cancel anytime
                from Settings.
              </p>
            </section>
          </div>

          {/* FAQ + final CTA */}
          <section className="pricing-faq">
            <h2 className="pricing-faq-title">Frequently Asked Questions</h2>

            <div className="pricing-faq-grid">
              <article className="pricing-faq-card">
                <h3>Can I cancel anytime?</h3>
                <p>
                  Yes! Cancel your subscription anytime from Settings. You'll keep
                  access until the end of your billing period.
                </p>
              </article>

              <article className="pricing-faq-card">
                <h3>What happens to my data if I downgrade?</h3>
                <p>
                  Your Action Maps are safe! You can view all of them, but you can
                  only edit up to 3 on the Free plan.
                </p>
              </article>

              <article className="pricing-faq-card">
                <h3>Is there a refund policy?</h3>
                <p>
                  We offer a 7-day money-back guarantee. If you're not satisfied,
                  email us at <strong>bytemorphai@gmail.com</strong>.
                </p>
              </article>

              <article className="pricing-faq-card">
                <h3>Do you offer discounts?</h3>
                <p>
                  Students and educators get 50% off! Email us from your{" "}
                  <code>.edu</code> address to get your discount code.
                </p>
              </article>
            </div>

            <div className="pricing-footer">
              <h2>Ready to achieve your goals?</h2>
              <p>
                Join thousands using Action Maps to map out their dreams.
              </p>
            </div>
          </section>
          </div>

        <AuthModal
          authView={authView}
          onClose={() => onSetAuthView(null)}
          onSwitchView={(view) => onSetAuthView(view)}
        />

        {/* Footer */}
        <footer className="pricing-footer">
          <p className="pricing-footer__disclaimer">
            Inspired by the Harada Method. Features Shohei Ohtani&apos;s plan as an example.
            Not officially affiliated.
          </p>

          <p className="pricing-footer__support">
            Support? DM on X or email me at{" "}
            <a href="mailto:bytemorphai@gmail.com">bytemorphai@gmail.com</a>
          </p>

          <p className="pricing-footer__coffee">
            <a
              href="https://buymeacoffee.com/baxterboy7w"
              target="_blank"
              rel="noreferrer"
            >
              Buy me a coffee
            </a>
          </p>

          <p className="pricing-footer__links">
            <button
              type="button"
              className="link-button"
              onClick={() => setModalType("privacy")}
            >
              Privacy
            </button>
            <span className="dot">•</span>
            <button
              type="button"
              className="link-button"
              onClick={() => setModalType("terms")}
            >
              Terms
            </button>
          </p>
        </footer>

        {/* Modal */}
        {modalType && (
          <div className="modal-backdrop" onClick={closeModal}>
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal__header">
                <h2 className="modal__title">
                  {modalType === "privacy" ? "Privacy Policy" : "Terms of Service"}
                </h2>
                <button
                  type="button"
                  className="modal__close"
                  onClick={closeModal}
                >
                  ✕
                </button>
              </div>

              <div className="modal__body">
                {modalType === "privacy" ? <PrivacyContent /> : <TermsContent />}
              </div>
            </div>
          </div>
        )}
      </main>
      </div>
    </div>
  );
};

const PrivacyContent: React.FC = () => (
  <div className="modal-text">
    <p><strong>Last updated:</strong> November 21, 2025</p>

    <h3>1. Introduction</h3>
    <p>
      Welcome to HaradaPlan (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;).
      We are committed to protecting your privacy and ensuring you have a
      positive experience while using our service. This Privacy Policy explains
      how we collect, use, disclose, and safeguard your information when you
      use our application.
    </p>

    <h3>2. Information We Collect</h3>
    <p>We collect information that you provide directly to us, including:</p>
    <ul>
      <li>Account information (name, email address) provided through authentication services</li>
      <li>Dreamsheet content and data that you create and store</li>
      <li>Usage data and preferences</li>
    </ul>

    <h3>3. Third-Party Services</h3>
    <p>We use the following third-party services to provide our application:</p>
    <ul>
      <li>
        Clerk – For user authentication and account management. Clerk&apos;s privacy policy:{" "}
        <a href="https://clerk.com/legal/privacy" target="_blank" rel="noreferrer">
          https://clerk.com/legal/privacy
        </a>
      </li>
      <li>
        Google – As an authentication provider through Clerk. Google&apos;s privacy policy:{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
          https://policies.google.com/privacy
        </a>
      </li>
      <li>
        Supabase – For database storage and backend services. Supabase&apos;s privacy policy:{" "}
        <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">
          https://supabase.com/privacy
        </a>
      </li>
      <li>
        OpenAI – For AI-powered features and content generation. OpenAI&apos;s privacy policy:{" "}
        <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noreferrer">
          https://openai.com/policies/privacy-policy
        </a>
      </li>
      <li>
        Vercel – For hosting and analytics. Vercel&apos;s privacy policy:{" "}
        <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">
          https://vercel.com/legal/privacy-policy
        </a>
      </li>
    </ul>
    <p>
      By using our service, you acknowledge that your information may be processed by these
      third-party services in accordance with their respective privacy policies.
    </p>

    <h3>4. How We Use Your Information</h3>
    <p>We use the information we collect to:</p>
    <ul>
      <li>Provide, maintain, and improve our services</li>
      <li>Process your requests and transactions</li>
      <li>Send you technical notices and support messages</li>
      <li>Respond to your comments and questions</li>
      <li>Monitor and analyze usage patterns</li>
      <li>Detect, prevent, and address technical issues</li>
    </ul>

    <h3>5. Data Storage and Security</h3>
    <p>
      Your data is stored securely using Supabase&apos;s infrastructure. We implement
      appropriate technical and organizational measures to protect your personal information.
      However, no method of transmission over the Internet or electronic storage is 100% secure,
      and we cannot guarantee absolute security.
    </p>

    <h3>6. Data Sharing</h3>
    <p>
      We do not sell, trade, or rent your personal information to third parties. We may share
      your information only as described in this policy or with your consent. Public dreamsheets
      that you choose to make public will be visible to other users of the service.
    </p>

    <h3>7. Your Rights</h3>
    <p>You have the right to:</p>
    <ul>
      <li>Access your personal information</li>
      <li>Correct inaccurate information</li>
      <li>Delete your account and associated data</li>
      <li>Export your data</li>
      <li>Opt-out of certain communications</li>
    </ul>

    <h3>8. Children&apos;s Privacy</h3>
    <p>
      Our service is not intended for children under 13 years of age. We do not knowingly collect
      personal information from children under 13.
    </p>

    <h3>9. Changes to This Policy</h3>
    <p>
      We may update this Privacy Policy from time to time. We will notify you of any changes by
      posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
    </p>

    <h3>10. Contact Us</h3>
    <p>
      If you have any questions about this Privacy Policy, please contact us at:{" "}
      <a href="mailto:bytemorphai@gmail.com">bytemorphai@gmail.com</a>
    </p>
  </div>
);

const TermsContent: React.FC = () => (
  <div className="modal-text">
    <p><strong>Last updated:</strong> November 21, 2025</p>

    <h3>1. Acceptance of Terms</h3>
    <p>
      By accessing and using HaradaPlan (&quot;the Service&quot;), you accept and agree to be
      bound by the terms and provision of this agreement. If you do not agree to these Terms of
      Service, please do not use the Service.
    </p>

    <h3>2. Description of Service</h3>
    <p>
      HaradaPlan is a web application that allows users to create, manage, and share Harada Method
      dreamsheets (Mandal-Art charts) with AI assistance. The Service is provided &quot;as is&quot;
      and &quot;as available.&quot;
    </p>

    <h3>3. User Accounts</h3>
    <p>To use certain features of the Service, you must:</p>
    <ul>
      <li>Create an account using our authentication provider (Clerk)</li>
      <li>Provide accurate and complete information</li>
      <li>Maintain the security of your account</li>
      <li>Be responsible for all activities under your account</li>
    </ul>
    <p>
      Authentication is provided by Clerk and may use Google as an authentication provider. By using
      these services, you agree to their respective terms of service.
    </p>

    <h3>4. User Content</h3>
    <p>
      You retain ownership of all content you create using the Service. By using the Service, you
      grant us:
    </p>
    <ul>
      <li>
        A worldwide, non-exclusive, royalty-free license to store, display, and distribute your
        content as necessary to provide the Service
      </li>
      <li>
        The right to make public content available to other users when you choose to make it public
      </li>
    </ul>
    <p>
      You are solely responsible for your content and warrant that you have all necessary rights to
      use and share it.
    </p>

    <h3>5. Prohibited Uses</h3>
    <p>You agree not to:</p>
    <ul>
      <li>Use the Service for any illegal purpose or in violation of any laws</li>
      <li>Violate or infringe upon the rights of others</li>
      <li>Transmit any harmful code, viruses, or malicious software</li>
      <li>Attempt to gain unauthorized access to the Service or related systems</li>
      <li>Interfere with or disrupt the Service or servers</li>
      <li>Use automated systems to access the Service without permission</li>
      <li>Impersonate any person or entity</li>
    </ul>

    <h3>6. AI-Generated Content</h3>
    <p>
      The Service uses OpenAI&apos;s AI technology to generate content. AI-generated content is
      provided for informational and assistance purposes only. We do not guarantee the accuracy,
      completeness, or usefulness of AI-generated content. You are responsible for reviewing and
      verifying any AI-generated content before using it.
    </p>

    <h3>7. Third-Party Services</h3>
    <p>The Service relies on the following third-party services:</p>
    <ul>
      <li>Clerk – Authentication and user management</li>
      <li>Google – Authentication provider</li>
      <li>Supabase – Database and backend infrastructure</li>
      <li>OpenAI – AI content generation</li>
      <li>Vercel – Hosting and infrastructure</li>
    </ul>
    <p>
      Your use of these third-party services is subject to their respective terms of service and
      privacy policies. We are not responsible for the availability, accuracy, or practices of these
      third-party services.
    </p>

    <h3>8. Service Availability</h3>
    <p>
      We strive to provide reliable service but do not guarantee that the Service will be available
      at all times. The Service may be unavailable due to maintenance, updates, or circumstances
      beyond our control. We are not liable for any downtime or service interruptions.
    </p>

    <h3>9. Limitation of Liability</h3>
    <p><strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW:</strong></p>
    <ul>
      <li>The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind</li>
      <li>
        We disclaim all warranties, express or implied, including merchantability and fitness for a
        particular purpose
      </li>
      <li>
        We shall not be liable for any indirect, incidental, special, consequential, or punitive
        damages
      </li>
      <li>
        Our total liability shall not exceed the amount you paid us in the past 12 months, or $100,
        whichever is greater
      </li>
    </ul>

    <h3>10. Indemnification</h3>
    <p>
      You agree to indemnify and hold harmless HaradaPlan, its operators, and affiliates from any
      claims, damages, losses, liabilities, and expenses (including legal fees) arising from your
      use of the Service, your content, or your violation of these Terms.
    </p>

    <h3>11. Termination</h3>
    <p>
      We may terminate or suspend your account and access to the Service immediately, without prior
      notice, for any reason, including if you breach these Terms. Upon termination, your right to
      use the Service will cease immediately.
    </p>

    <h3>12. Changes to Terms</h3>
    <p>
      We reserve the right to modify these Terms at any time. We will notify users of material
      changes by updating the &quot;Last updated&quot; date. Your continued use of the Service after
      changes constitutes acceptance of the new Terms.
    </p>

    <h3>13. Governing Law</h3>
    <p>
      These Terms shall be governed by and construed in accordance with the laws of the United
      States, without regard to its conflict of law provisions.
    </p>

    <h3>14. Contact Information</h3>
    <p>
      If you have any questions about these Terms of Service, please contact us at:{" "}
      <a href="mailto:bytemorphai@gmail.com">bytemorphai@gmail.com</a>
    </p>

    <h3>15. Disclaimer</h3>
    <p>
      HaradaPlan is not affiliated with, endorsed by, or associated with Takashi Harada or Shohei
      Ohtani. The Service is inspired by the Harada Method and features Shohei Ohtani&apos;s plan
      as an educational example only. We make no claims of official affiliation or endorsement.
    </p>
  </div>
);

