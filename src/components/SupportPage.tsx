import React, { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AppHeader } from "./AppHeader";

type AuthView = "login" | "signup" | null;
type SupportTab = "support" | "suggestions";

type SupportPageProps = {
  user: User | null;
  isAdmin: boolean;
  isPro?: boolean;
  onSetAuthView: (view: AuthView) => void;
  onGoToPricing?: () => void;
  onGoToDashboard?: () => void;
};

export const SupportPage: React.FC<SupportPageProps> = ({
  user,
  isAdmin,
  isPro = false,
  onSetAuthView,
  onGoToPricing,
  onGoToDashboard,
}) => {
  const [activeTab, setActiveTab] = useState<SupportTab>("support");
  return (
    <div className="app builder-app">
      <div className="builder-shell">
        <AppHeader
          user={user}
          isAdmin={isAdmin}
          isPro={isPro}
          onSetAuthView={onSetAuthView}
          onGoToPricing={onGoToPricing}
          onGoToDashboard={onGoToDashboard}
        />

        <main className="support-main">
          <div className="support-container">
            <div className="support-header">
              <h1 className="support-title">Support & Help</h1>
              <p className="support-subtitle">
                Get help using Action Maps or share your ideas with us
              </p>
            </div>

            <div className="support-tabs">
              <button
                type="button"
                className={`support-tab ${activeTab === "support" ? "support-tab-active" : ""}`}
                onClick={() => setActiveTab("support")}
              >
                Support
              </button>
              <button
                type="button"
                className={`support-tab ${activeTab === "suggestions" ? "support-tab-active" : ""}`}
                onClick={() => setActiveTab("suggestions")}
              >
                Suggestions / Bugs / Ideas
              </button>
            </div>

            <div className="support-content">
              {activeTab === "support" ? (
                <>
                  <section className="support-section">
                    <h2 className="support-section-title">Getting Started</h2>
                    <div className="support-card">
                      <h3 className="support-card-title">What is the Harada Method?</h3>
                      <p className="support-card-text">
                        The Harada Method is a goal-setting framework that helps you break down your biggest goals into actionable steps using a structured grid. One main goal, 8 pillars, and 64 specific actions. It's the same method used by world-class athletes like Shohei Ohtani to achieve extraordinary results.
                      </p>
                    </div>

                    <div className="support-card">
                      <h3 className="support-card-title">How to Create Your First Map</h3>
                      <ol className="support-list">
                        <li>Click "New map" on your dashboard</li>
                        <li>Choose to skip, use AI, or fill it out yourself</li>
                        <li>If using AI, enter your main goal and let AI generate your pillars and actions</li>
                        <li>Edit and refine your map as needed</li>
                        <li>Start tracking your daily progress</li>
                      </ol>
                    </div>

                    <div className="support-card">
                      <h3 className="support-card-title">Using AI Features</h3>
                      <p className="support-card-text">
                        Action Maps includes AI-powered features to help you get started:
                      </p>
                      <ul className="support-list">
                        <li><strong>AI Goal Helper:</strong> Generate a complete action map from a single goal</li>
                        <li><strong>Pillar Refinement:</strong> Get 5 AI suggestions for any pillar in edit mode</li>
                      </ul>
                    </div>
                  </section>

                  <section className="support-section">
                    <h2 className="support-section-title">Account & Plans</h2>
                    <div className="support-card">
                      <h3 className="support-card-title">Free Plan</h3>
                      <ul className="support-list">
                        <li>Up to 3 action maps</li>
                        <li>All core features</li>
                        <li>AI assistance</li>
                      </ul>
                    </div>

                    <div className="support-card">
                      <h3 className="support-card-title">Pro Plan</h3>
                      <ul className="support-list">
                        <li>Unlimited action maps</li>
                        <li>All free features</li>
                        <li>Priority support</li>
                      </ul>
                    </div>
                  </section>

                  <section className="support-section">
                    <h2 className="support-section-title">Contact Us</h2>
                    <div className="support-card support-card-highlight">
                      <p className="support-card-text">
                        Need help? Have a question or feature request? We'd love to hear from you! 🚀
                      </p>
                      <p className="support-card-text">
                        Email us at:{" "}
                        <a href="mailto:actionmaps8@gmail.com" className="support-link">
                          actionmaps8@gmail.com
                        </a>
                      </p>
                      <p className="support-card-text support-card-note">
                        We typically respond within 24 hours.
                      </p>
                    </div>
                  </section>
                </>
              ) : (
              <section className="support-section">
                <h2 className="support-section-title">Share Your Ideas</h2>
                <div className="support-card">
                  <h3 className="support-card-title">Feature Requests</h3>
                  <p className="support-card-text">
                    Have an idea to improve Action Maps? We'd love to hear it! Share your feature requests and we'll consider them for future updates.
                  </p>
                </div>

                <div className="support-card">
                  <h3 className="support-card-title">Report a Bug</h3>
                  <p className="support-card-text">
                    Found something that's not working as expected? Let us know! Please include:
                  </p>
                  <ul className="support-list">
                    <li>What you were trying to do</li>
                    <li>What happened instead</li>
                    <li>Steps to reproduce the issue</li>
                    <li>Screenshots if possible</li>
                  </ul>
                </div>

                <div className="support-card support-card-highlight">
                  <h3 className="support-card-title">Submit Your Feedback</h3>
                  <p className="support-card-text">
                    Send us your suggestions, bug reports, or ideas at:{" "}
                    <a href="mailto:actionmaps8@gmail.com?subject=Feature Request / Bug Report" className="support-link">
                      actionmaps8@gmail.com
                    </a>
                  </p>
                  <p className="support-card-text">
                    Please include:
                  </p>
                  <ul className="support-list">
                    <li><strong>Type:</strong> Feature Request, Bug Report, or Idea</li>
                    <li><strong>Description:</strong> Clear explanation of what you're suggesting or reporting</li>
                    <li><strong>Why it matters:</strong> How this would help you or other users</li>
                  </ul>
                  <p className="support-card-note">
                    We read every submission and appreciate your feedback! 💙
                  </p>
                </div>
              </section>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

