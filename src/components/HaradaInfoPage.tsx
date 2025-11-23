import React from "react";
import type { User } from "@supabase/supabase-js";
import { AppHeader } from "./AppHeader";

type AuthView = "login" | "signup" | null;

type HaradaInfoPageProps = {
  user: User | null;
  isAdmin: boolean;
  isPro?: boolean;
  onSetAppView: (view: "home" | "builder" | "harada" | "dashboard" | "pricing" | "support") => void;
  onSetAuthView: (view: AuthView) => void;
};

export const HaradaInfoPage: React.FC<HaradaInfoPageProps> = ({
  user,
  isAdmin,
  isPro = false,
  onSetAppView,
  onSetAuthView,
}) => {
  return (
    <div className="app builder-app">
      <div className="builder-shell">
        <AppHeader
          user={user}
          isAdmin={isAdmin}
          isPro={isPro}
          onSetAuthView={onSetAuthView}
          onGoToPricing={() => onSetAppView("pricing")}
          onGoToDashboard={() => onSetAppView("dashboard")}
          onGoToSupport={() => onSetAppView("support")}
        />

        <main className="info-main">
          <div className="info-card">
            <p className="info-kicker">Harada Method 101</p>
            <h1 className="info-title">What is the Harada Method?</h1>
            <p className="info-lede">
              The Harada Method is a goal-achievement framework from Japan that
              helps people turn a single, clear objective into specific, daily
              actions they can actually follow through on.
            </p>

            <section className="info-section">
              <h2>Where it comes from</h2>
              <p>
                The method was developed by coach Takashi Harada, who worked
                with underperforming students and athletes. By helping them set
                one ambitious goal and break it into focused areas and habits,
                he saw dramatic improvements in results and confidence.
              </p>
            </section>

            <section className="info-section">
              <h2>How it works</h2>
              <ul>
                <li>
                  You choose <strong>one main goal</strong> you want to achieve.
                </li>
                <li>
                  You identify <strong>key pillars</strong> that support that
                  goal (skills, health, relationships, finances, etc.).
                </li>
                <li>
                  You list out <strong>concrete actions</strong> under each
                  pillar and track them daily in a visual grid.
                </li>
              </ul>
            </section>

            <section className="info-section">
              <h2>Why it works for modern planning</h2>
              <ul className="info-bullets">
                <li>
                  It forces you to move from vague intentions to clear steps.
                </li>
                <li>
                  The grid shows how all your actions connect to your goal.
                </li>
                <li>
                  It fits busy lives—you can tweak actions while keeping the
                  main goal steady.
                </li>
              </ul>
            </section>

            <section className="info-section">
              <h2>How Action Maps adapts it</h2>
              <p>
                Action Maps keeps the spirit of Harada—one big goal, supporting
                pillars, and daily actions—but adds modern touches like cloud
                sync and
                <span className="info-highlight"> AI-assisted templates</span>.
                You can start from a blank sheet, load a template, or let AI
                help you generate pillars and actions based on your goal.
              </p>
            </section>

            <div className="info-ctas">
              <button
                type="button"
                className="hero-primary-cta"
                onClick={() => onSetAppView("builder")}
              >
                Start your first map
              </button>
              <button
                type="button"
                className="hero-secondary-cta hero-outline-cta info-secondary"
                onClick={() => onSetAppView("home")}
              >
                Back to homepage
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

