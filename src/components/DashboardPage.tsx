import React from "react";
import { supabase } from "../supabaseClient";
import type { User } from "@supabase/supabase-js";
import type { HaradaState } from "../types";
import { createEmptyState } from "../utils/harada";
import { AuthModal } from "./AuthModal";
import { AppHeader } from "./AppHeader";

type ProjectSummary = {
  id: string;
  title: string | null;
  goal: string | null;
  updated_at: string;
};

type AuthView = "login" | "signup" | null;

type DashboardPageProps = {
  projects: ProjectSummary[];
  user: User | null;
  isAdmin: boolean;
  isPro?: boolean;
  hasReachedMapLimit?: boolean;
  authView: AuthView;
  currentProjectId: string | null; // Add current project ID to check if same project
  appView: "home" | "builder" | "harada" | "dashboard" | "pricing" | "support" | "subscription"; // Add app view to check if in builder
  onSetState: (state: HaradaState) => void;
  onSetViewMode: (mode: "map" | "grid") => void;
  onSetStartModalOpen: (open: boolean) => void;
  onSetAppView: (view: "home" | "builder" | "harada" | "dashboard" | "pricing" | "support" | "subscription") => void;
  onSetAuthView: (view: AuthView) => void;
  onSetCurrentProjectId: (id: string | null) => void;
  onDeleteProject: (projectId: string) => void;
  onProjectTitleUpdated: (id: string, newTitle: string) => void;
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  projects,
  user,
  isAdmin,
  isPro = false,
  hasReachedMapLimit = false,
  authView,
  currentProjectId,
  appView,
  onSetState,
  onSetViewMode,
  onSetStartModalOpen,
  onSetAppView,
  onSetAuthView,
  onSetCurrentProjectId,
  onDeleteProject,
  onProjectTitleUpdated,
}) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState("");

  const startEditing = (project: ProjectSummary) => {
    setEditingId(project.id);
    setDraftTitle(project.title || "Action Map");
  };

  const commitRename = async (project: ProjectSummary) => {
    const trimmed = draftTitle.trim();
    if (!trimmed || trimmed === project.title) {
      setEditingId(null);
      return;
    }

    if (!user) {
      setEditingId(null);
      return;
    }

    const now = new Date().toISOString();

    // SECURITY: Always verify user_id to prevent modifying other users' projects
    const { error } = await supabase
      .from("action_maps")
      .update({
        title: trimmed,
        updated_at: now,
      })
      .eq("id", project.id)
      .eq("user_id", user.id); // CRITICAL: Prevent modifying other users' projects

    if (error) {
      console.error("Failed to rename project", error);
    } else {
      onProjectTitleUpdated(project.id, trimmed);
      setEditingId(null);
    }
  };

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
          onGoToSubscription={() => onSetAppView("subscription")}
        />

        <main className="dashboard-main">
          <div className="dashboard-header">
            <div>
              <h1 className="dashboard-title">Your Action Maps</h1>
              <p className="dashboard-subtitle">
                Open an existing map or start a new one.
              </p>
            </div>
            {!hasReachedMapLimit && (
              <button
                type="button"
                className="hero-primary-cta"
                onClick={() => {
                  // new blank map + onboarding modal again
                  onSetState(createEmptyState());
                  onSetViewMode("grid");
                  onSetStartModalOpen(true);
                  onSetCurrentProjectId(null); // We're starting a fresh project
                  onSetAppView("builder");
                }}
              >
                New map
              </button>
            )}
            {hasReachedMapLimit && (
              <div className="dashboard-limit-message">
                <p className="dashboard-limit-text">
                  You've reached the limit of 3 maps on the free plan.
                </p>
                <button
                  type="button"
                  className="hero-primary-cta"
                  onClick={() => onSetAppView("pricing")}
                >
                  Upgrade to Pro
                </button>
              </div>
            )}
          </div>

          {projects.length === 0 ? (
            <p className="dashboard-empty">
              You don&apos;t have any saved maps yet. Start a new one to see it
              here next time.
            </p>
          ) : (
            <div className="dashboard-grid">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="dashboard-card"
                  role="button"
                  tabIndex={0}
                  onClick={async () => {
                    if (editingId === p.id) return; // Don't open if editing
                    if (!user) return; // Security: must be logged in
                    
                    // CRITICAL: If this is the same project already open, don't reload from database
                    // This preserves in-memory state like completed actions
                    if (currentProjectId === p.id && appView === "builder") {
                      // Same project already open - just ensure we're in builder view
                      // Don't reload state, preserve current state with completed actions
                      onSetAppView("builder");
                      return;
                    }
                    
                    // Different project or not in builder - load from database
                    // Load this project and jump into builder (View mode)
                    // SECURITY: Always verify user_id to prevent data leaks
                    const { data, error } = await supabase
                      .from("action_maps")
                      .select("state")
                      .eq("id", p.id)
                      .eq("user_id", user.id) // CRITICAL: Prevent access to other users' projects
                      .single();

                    if (!error && data?.state) {
                      const loadedState = data.state as HaradaState;
                      // Set project ID FIRST to prevent autosave from saving to wrong project
                      onSetCurrentProjectId(p.id);
                      // Set state immediately - the loaded state should override any localStorage state
                      onSetState(loadedState);
                      onSetViewMode("grid");
                      onSetStartModalOpen(false);
                      onSetAppView("builder");
                    } else {
                      console.error("[Dashboard] Error loading project:", error, "data:", data);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.currentTarget.click();
                    }
                  }}
                >
                  {/* TITLE / RENAME */}
                  {editingId === p.id ? (
                    <input
                      className="dashboard-card-title-input"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onBlur={() => commitRename(p)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitRename(p);
                        } else if (e.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <h2
                      className="dashboard-card-title"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(p);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startEditing(p);
                      }}
                    >
                      {p.title || "Action Map"}
                    </h2>
                  )}

                  {/* SUBHEADER = MAIN GOAL */}
                  <p className="dashboard-card-goal">
                    {p.goal || "No main goal yet"}
                  </p>

                  <p className="dashboard-card-meta">
                    Updated {new Date(p.updated_at).toLocaleDateString()}
                  </p>

                  <button
                    type="button"
                    className="dashboard-card-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Are you sure you want to delete this map?")) {
                        onDeleteProject(p.id);
                      }
                    }}
                    aria-label="Delete map"
                  >
                    ×
                  </button>
                </div>
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

