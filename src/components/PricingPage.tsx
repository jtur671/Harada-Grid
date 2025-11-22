import React from "react";
import type { User } from "@supabase/supabase-js";
import { AppHeader } from "./AppHeader";
import { AuthModal } from "./AuthModal";

type AuthView = "login" | "signup" | null;
type AppView = "home" | "builder" | "harada" | "dashboard" | "pricing";
type Plan = "free" | "premium";

type PricingPageProps = {
  user: User | null;
  isAdmin: boolean;
  authView: AuthView;
  currentPlan: Plan | null;
  onSetAuthView: (view: AuthView) => void;
  onSelectPlan: (plan: Plan) => void;
  onSetAppView: (view: AppView) => void;
};

export const PricingPage: React.FC<PricingPageProps> = ({
  user,
  isAdmin,
  authView,
  currentPlan,
  onSetAuthView,
  onSelectPlan,
  onSetAppView,
}) => {
  const isLoggedIn = !!user;

  return (
    <div className="app app-dark">
      <div className="home-shell">
        <AppHeader
          showBackButton={true}
          onBackClick={() => onSetAppView("home")}
          user={user}
          isAdmin={isAdmin}
          onSetAuthView={onSetAuthView}
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
                onClick={() => onSelectPlan("premium")}
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
      </main>
      </div>
    </div>
  );
};

