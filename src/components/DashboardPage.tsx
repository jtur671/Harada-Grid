import React from "react";
import { supabase } from "../supabaseClient";
import type { User } from "@supabase/supabase-js";
import type { HaradaState } from "../types";
import { createEmptyState } from "../utils/harada";
import { AuthModal } from "./AuthModal";

type ProjectSummary = {
  id: string;
  title: string | null;
  updated_at: string;
};

type AuthView = "login" | "signup" | null;

type DashboardPageProps = {
  projects: ProjectSummary[];
  user: User | null;
  isAdmin: boolean;
  authView: AuthView;
  onSetState: (state: HaradaState) => void;
  onSetViewMode: (mode: "map" | "grid") => void;
  onSetStartModalOpen: (open: boolean) => void;
  onSetAppView: (view: "home" | "builder" | "harada" | "dashboard") => void;
  onSetAuthView: (view: AuthView) => void;
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  projects,
  user,
  isAdmin,
  authView,
  onSetState,
  onSetViewMode,
  onSetStartModalOpen,
  onSetAppView,
  onSetAuthView,
}) => {
  const isLoggedIn = !!user;

  return (
    <div className="app builder-app">
      <div className="builder-shell">
        <header className="home-nav">
          <div className="home-logo">
            <span className="home-logo-mark">◆</span>
            <span className="home-logo-text">
              Action<span>Maps</span>
            </span>
          </div>

          <nav className="home-nav-actions">
            {isLoggedIn && user?.email ? (
              <>
                {isAdmin && <span className="home-nav-user-pill">Admin</span>}
                {!isAdmin && (
                  <span className="home-nav-user-pill">{user.email}</span>
                )}
                <button
                  type="button"
                  className="home-nav-link"
                  onClick={() => supabase.auth.signOut()}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="home-nav-link"
                  onClick={() => onSetAuthView("login")}
                >
                  Log in
                </button>
                <button
                  type="button"
                  className="home-nav-cta"
                  onClick={() => onSetAuthView("signup")}
                >
                  Sign up
                </button>
              </>
            )}
          </nav>
        </header>

        <main className="dashboard-main">
          <div className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Your Action Maps</h1>
              <p className="dashboard-subtitle">
                Open an existing map or start a new one.
              </p>
            </div>
            <button
              type="button"
              className="hero-primary-cta"
              onClick={() => {
                // new blank map + onboarding modal again
                onSetState(createEmptyState());
                onSetViewMode("grid");
                onSetStartModalOpen(true);
                onSetAppView("builder");
              }}
            >
              New map
            </button>
          </div>

          {projects.length === 0 ? (
            <p className="dashboard-empty">
              You don&apos;t have any saved maps yet. Start a new one to see it
              here next time.
            </p>
          ) : (
            <div className="dashboard-grid">
              {projects.map((p) => (
                <button
                  key={p.id}
                  className="dashboard-card"
                  type="button"
                  onClick={async () => {
                    // Load this project and jump into builder (View mode)
                    const { data, error } = await supabase
                      .from("action_maps")
                      .select("state")
                      .eq("id", p.id)
                      .single();

                    if (!error && data?.state) {
                      onSetState(data.state as HaradaState);
                      onSetViewMode("grid");
                      onSetStartModalOpen(false);
                      onSetAppView("builder");
                    }
                  }}
                >
                  <h2 className="dashboard-card-title">
                    {p.title || "Untitled map"}
                  </h2>
                  <p className="dashboard-card-meta">
                    Updated {new Date(p.updated_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </main>

        <AuthModal
          authView={authView}
          onClose={() => onSetAuthView(null)}
          onSwitchView={(view) => onSetAuthView(view)}
        />
      </div>
    </div>
  );
};

