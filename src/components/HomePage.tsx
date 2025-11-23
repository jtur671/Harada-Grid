import React from "react";
import type { User } from "@supabase/supabase-js";
import type { HaradaState } from "../types";
import { TraditionalGrid } from "./TraditionalGrid";
import { AuthModal } from "./AuthModal";
import { AppHeader } from "./AppHeader";

type AuthView = "login" | "signup" | null;
type ExampleId = "career" | "sidebiz" | "wellbeing";
type AppView = "home" | "builder" | "harada" | "dashboard" | "pricing" | "support";

type HomePageProps = {
  user: User | null;
  isAdmin: boolean;
  isPro?: boolean;
  authView: AuthView;
  exampleId: ExampleId;
  exampleState: HaradaState;
  onSetAppView: (view: AppView) => void;
  onSetAuthView: (view: AuthView) => void;
  onExampleChange: (id: ExampleId) => void;
};

export const HomePage: React.FC<HomePageProps> = ({
  user,
  isAdmin,
  isPro = false,
  authView,
  exampleId,
  exampleState,
  onSetAppView,
  onSetAuthView,
  onExampleChange,
}) => {
  return (
    <div className="app app-dark">
      <div className="home-shell">
        <AppHeader
          showBackButton={false}
          user={user}
          isAdmin={isAdmin}
          isPro={isPro}
          onSetAuthView={onSetAuthView}
          onGoToPricing={() => onSetAppView("pricing")}
          onGoToDashboard={() => onSetAppView("dashboard")}
          onGoToSupport={() => onSetAppView("support")}
        />

        <main className="home-main">
          <section className="home-hero">
            <div className="home-hero-inner">
              <p className="home-hero-kicker">Harada-inspired goal OS</p>

              <h1 className="home-hero-title">
                Don&apos;t let dreams stay in your dreams
              </h1>

              <p className="home-hero-subtitle">
                Turn your biggest goals into a clear, actionable plan. One goal,
                8 pillars, 64 actions—all in one place, powered by AI to help you
                get started in minutes.
              </p>

              {/* AI highlight */}
              <div className="home-hero-ai-card">
                <span className="ai-pill">NEW</span>
                <div className="home-hero-ai-text">
                  <p className="home-hero-ai-title">AI-assisted goal planning</p>
                  <p className="home-hero-ai-body">
                    Tell us your goal in one sentence and let AI draft pillars and
                    actions you can tweak in minutes.
                  </p>
                </div>
              </div>

              {/* Main CTAs */}
              <div className="home-hero-ctas">
                <button
                  type="button"
                  className="hero-primary-cta hero-primary-cta-large"
                  onClick={() => onSetAppView("builder")}
                >
                  Get started free
                </button>
                <button
                  type="button"
                  className="hero-secondary-cta hero-secondary-cta-large"
                  onClick={() =>
                    document
                      .getElementById("examples")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  View examples
                </button>
                <button
                  type="button"
                  className="hero-secondary-cta hero-secondary-cta-large hero-outline-cta"
                  onClick={() => onSetAppView("harada")}
                >
                  What is the Harada Method?
                </button>
              </div>

              {/* Scroll CTAs for Why / How */}
              <div className="home-hero-anchors">
                <button
                  type="button"
                  className="hero-anchor-btn"
                  onClick={() =>
                    document
                      .getElementById("why")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  Why Action Maps?
                </button>
                <button
                  type="button"
                  className="hero-anchor-btn"
                  onClick={() =>
                    document
                      .getElementById("how-it-works")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  How it works
                </button>
              </div>

              <p className="home-hero-meta">
                Free to try • No credit card required • Works in any browser
              </p>
            </div>

            {/* Testimonial star badge */}
            <div className="home-hero-testimonial">
              <div className="testimonial-star">
                <span className="testimonial-icon">⭐</span>
                <span className="testimonial-text">
                  Used by Shohei Ohtani to become MLB&apos;s #1 draft pick
                </span>
              </div>
            </div>
          </section>

          <section className="home-features" id="why">
            <h2 className="home-section-title">Why Action Maps?</h2>
            <p className="home-section-subtitle">
              Old-school planning templates, updated for how you actually work.
            </p>
            <div className="home-feature-grid">
              <article className="home-feature-card">
                <h3>See the whole map</h3>
                <p>
                  The 8 × 8 grid shows how every action ladders up to your main
                  goal, instead of being scattered across tools.
                </p>
              </article>
              <article className="home-feature-card">
                <h3>Everything in one place</h3>
                <p>
                  Goals, pillars, actions, and progress all live together. No
                  more bouncing between docs, kanban boards, and calendars.
                </p>
              </article>
              <article className="home-feature-card">
                <h3>Built for product brains</h3>
                <p>
                  Treat pillars like themes and actions like tickets. Use View
                  mode as your daily control panel.
                </p>
              </article>
            </div>
          </section>

          <section className="home-how" id="how-it-works">
            <h2 className="home-section-title">How it works</h2>
            <p className="home-section-subtitle">
              Borrowed from the Harada Method, tuned for modern workflows.
            </p>
            <ol className="home-how-grid">
              <li className="home-how-step">
                <h3>1. Set your one big goal</h3>
                <p>
                  Drop your north star in the center. Think outcomes, not tasks.
                </p>
              </li>
              <li className="home-how-step">
                <h3>2. Define 8 pillars</h3>
                <p>
                  Choose the key areas that must move for this goal to happen
                  (product, health, finances, relationships, etc.).
                </p>
              </li>
              <li className="home-how-step">
                <h3>3. Map 64 actions</h3>
                <p>
                  Add up to 8 concrete actions per pillar. Small enough to do,
                  big enough to matter.
                </p>
              </li>
              <li className="home-how-step">
                <h3>4. Flip to View mode</h3>
                <p>
                  Use the traditional grid to track today. Tap actions to mark
                  them done and see your progress bar move.
                </p>
              </li>
            </ol>
          </section>

          <section className="home-examples" id="examples">
            <h2 className="home-section-title">Examples</h2>
            <p className="home-section-subtitle">
              See Action Maps in View mode for real-world goals.
            </p>

            <div className="examples-toggle">
              <button
                type="button"
                className={
                  "examples-toggle-btn" +
                  (exampleId === "career" ? " examples-toggle-btn-active" : "")
                }
                onClick={() => onExampleChange("career")}
              >
                Career change
              </button>
              <button
                type="button"
                className={
                  "examples-toggle-btn" +
                  (exampleId === "sidebiz" ? " examples-toggle-btn-active" : "")
                }
                onClick={() => onExampleChange("sidebiz")}
              >
                Launch a side project
              </button>
              <button
                type="button"
                className={
                  "examples-toggle-btn" +
                  (exampleId === "wellbeing"
                    ? " examples-toggle-btn-active"
                    : "")
                }
                onClick={() => onExampleChange("wellbeing")}
              >
                Wellbeing reset
              </button>
            </div>

            <div className="examples-grid-shell">
              <TraditionalGrid
                state={exampleState}
                collapsedPillars={Array(8).fill(false)}
                onTogglePillar={() => {}}
                progressForDay={[]}
                allCompletedTasks={[]}
                onToggleTask={() => {}}
              />
            </div>
          </section>
        </main>

        <AuthModal
          authView={authView}
          onClose={() => onSetAuthView(null)}
          onSwitchView={(view) => onSetAuthView(view)}
        />

        <footer className="home-footer">
          <p>
            Built for humans who like grids. Not affiliated with the official
            Harada Method.
          </p>
        </footer>
      </div>
    </div>
  );
};

