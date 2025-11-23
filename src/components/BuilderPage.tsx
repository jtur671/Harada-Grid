import React, { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import type { HaradaState } from "../types";
import type { Template } from "../templates";
import { EditMode } from "./EditMode";
import { ViewMode } from "./ViewMode";
import { TemplateModal } from "./TemplateModal";
import { AiHelperModal } from "./AiHelperModal";
import { ResetModal } from "./ResetModal";
import { AuthModal } from "./AuthModal";
import { PillarRefineModal } from "./PillarRefineModal";
import { StartModal } from "./StartModal";
import { AppHeader } from "./AppHeader";
import { MiniDashboard } from "./MiniDashboard";
import { triggerPrintWithBodyClass } from "../utils/print";
import { supabase } from "../supabaseClient";

type AuthView = "login" | "signup" | null;
type AppView = "home" | "builder" | "harada" | "dashboard" | "pricing" | "support";

type BuilderPageProps = {
  state: HaradaState;
  mapTitle: string;
  setMapTitle: (title: string) => void;
  viewMode: "map" | "grid";
  setViewMode: (mode: "map" | "grid") => void;
  selectedDate: string;
  activePillar: number;
  setActivePillar: (index: number) => void;
  collapsedPillars: boolean[];
  setCollapsedPillars: React.Dispatch<React.SetStateAction<boolean[]>>;
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
  expandedDiaryDates: Record<string, boolean>;
  setExpandedDiaryDates: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  olderExpanded: boolean;
  setOlderExpanded: (expanded: boolean) => void;
  templatesOpen: boolean;
  setTemplatesOpen: (open: boolean) => void;
  aiModalOpen: boolean;
  setAiModalOpen: (open: boolean) => void;
  aiGoalText: string;
  setAiGoalText: (text: string) => void;
  isAiGenerating: boolean;
  resetOpen: boolean;
  setResetOpen: (open: boolean) => void;
  startModalOpen: boolean;
  setStartModalOpen: (open: boolean) => void;
  onDismissStartModalPermanently?: () => void;
  authView: AuthView;
  setAuthView: (view: AuthView) => void;
  user: User | null;
  isAdmin: boolean;
  isPro?: boolean;
  isLoggedIn: boolean;
  progressForDay: string[];
  allCompletedTasks: string[];
  diaryEntry: string;
  pillarCompletion: { defined: number; completed: number }[];
  totalDefinedTasks: number;
  completedDefinedTasks: number;
  progressPercent: number;
  onUpdateGoal: (value: string) => void;
  onUpdatePillar: (index: number, value: string) => void;
  onUpdateTask: (pillarIndex: number, taskIndex: number, value: string) => void;
  onToggleTaskForDay: (taskId: string) => void;
  onUpdateDiary: (value: string) => void;
  onTogglePillarCollapse: (index: number) => void;
  onToggleHistory: () => void;
  onToggleDiaryDateExpanded: (date: string) => void;
  onToggleOlder: () => void;
  onApplyTemplate: (template: Template) => void;
  onAiGenerate: () => void;
  onConfirmReset: () => void;
  onSetAppView: (view: AppView) => void;
  onEnsureProject: () => void;
  templates: Template[];
  currentProjectTitle?: string;
  currentProjectId?: string | null;
  onProjectTitleUpdated?: (id: string, newTitle: string) => void;
  // Mini dashboard props
  projects: {
    id: string;
    title: string | null;
    goal?: string | null;
    updated_at?: string;
  }[];
  onOpenProjectFromSidebar: (id: string) => void;
  onNewMapFromSidebar?: () => void;
  hasReachedMapLimit?: boolean;
  // Pillar refine props
  pillarRefineModalOpen: boolean;
  setPillarRefineModalOpen: (open: boolean) => void;
  pillarRefineIndex: number;
  pillarRefineSuggestions: string[];
  isPillarRefining: boolean;
  onPillarRefine: (pillarIndex: number) => void;
  onSelectRefinedPillar: (suggestion: string) => void;
};

export const BuilderPage: React.FC<BuilderPageProps> = ({
  state,
  mapTitle,
  setMapTitle,
  viewMode,
  setViewMode,
  selectedDate,
  activePillar,
  setActivePillar,
  collapsedPillars,
  historyOpen,
  setHistoryOpen,
  expandedDiaryDates,
  olderExpanded,
  setOlderExpanded,
  templatesOpen,
  setTemplatesOpen,
  aiModalOpen,
  setAiModalOpen,
  aiGoalText,
  setAiGoalText,
  isAiGenerating,
  resetOpen,
  setResetOpen,
  startModalOpen,
  setStartModalOpen,
  onDismissStartModalPermanently,
  authView,
  setAuthView,
  user,
  isAdmin,
  isPro = false,
  isLoggedIn,
  progressForDay,
  allCompletedTasks,
  diaryEntry,
  pillarCompletion,
  totalDefinedTasks,
  completedDefinedTasks,
  progressPercent,
  onUpdateGoal,
  onUpdatePillar,
  onUpdateTask,
  onToggleTaskForDay,
  onUpdateDiary,
  onTogglePillarCollapse,
  onToggleHistory,
  onToggleDiaryDateExpanded,
  onToggleOlder,
  onApplyTemplate,
  onAiGenerate,
  onConfirmReset,
  onSetAppView,
  onEnsureProject,
  templates,
  currentProjectTitle = "Action Map",
  currentProjectId,
  onProjectTitleUpdated,
  projects,
  onOpenProjectFromSidebar,
  onNewMapFromSidebar,
  hasReachedMapLimit = false,
  pillarRefineModalOpen,
  setPillarRefineModalOpen,
  pillarRefineIndex,
  pillarRefineSuggestions,
  isPillarRefining,
  onPillarRefine,
  onSelectRefinedPillar,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(currentProjectTitle);

  // Sync tempTitle when currentProjectTitle changes (e.g., renamed from dashboard)
  useEffect(() => {
    if (!isEditingTitle) {
      setTempTitle(currentProjectTitle);
    }
  }, [currentProjectTitle, isEditingTitle]);

  const handleStartEditTitle = () => {
    setTempTitle(currentProjectTitle);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    const trimmed = tempTitle.trim();
    const finalTitle = trimmed || "Your Action Map";
    
    // Update local state
    setMapTitle(finalTitle);
    setIsEditingTitle(false);

    // Save to database if we have a project ID
    if (currentProjectId && user && onProjectTitleUpdated) {
      try {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from("action_maps")
          .update({
            title: finalTitle,
            updated_at: now,
          })
          .eq("id", currentProjectId)
          .eq("user_id", user.id);

        if (error) {
          console.error("Error updating project title:", error);
        } else {
          // Update the projects list in App.tsx
          onProjectTitleUpdated(currentProjectId, finalTitle);
        }
      } catch (e) {
        console.error("Error updating project title:", e);
      }
    }
  };

  const handleCancelEditTitle = () => {
    setTempTitle(mapTitle);
    setIsEditingTitle(false);
  };

  const handleExport = () => {
    // We only show the button in View mode, but keep this guard just in case
    if (viewMode !== "grid") {
      setViewMode("grid");
    }

    // Remember current history UI state so we can restore after printing
    const prevHistoryOpen = historyOpen;
    const prevOlderExpanded = olderExpanded;

    // Make sure diary history + older block are expanded for print
    setHistoryOpen(true);
    setOlderExpanded(true);

    // Wait a tick so React can render the expanded history,
    // then trigger print with a special body class
    setTimeout(() => {
      triggerPrintWithBodyClass("print-mode");

      // Restore previous UI state after printing
      setTimeout(() => {
        setHistoryOpen(prevHistoryOpen);
        setOlderExpanded(prevOlderExpanded);
      }, 100);
    }, 100);
  };

  return (
    <div className="app builder-app">
      <div className="builder-shell">
        <AppHeader
          user={user}
          isAdmin={isAdmin}
          isPro={isPro}
          onSetAuthView={setAuthView}
          onGoToPricing={() => onSetAppView("pricing")}
          onGoToDashboard={() => onSetAppView("dashboard")}
          onGoToSupport={() => onSetAppView("support")}
        />

        <main className="builder-main">
          <div className="builder-layout">
            <MiniDashboard
              projects={projects}
              currentProjectId={currentProjectId || null}
              onSelectProject={onOpenProjectFromSidebar}
              onNewMap={onNewMapFromSidebar}
              hasReachedMapLimit={hasReachedMapLimit}
            />

            <div className="builder-content">
              <div className="builder-top-row">
            <div className="builder-title-wrapper">
              {isEditingTitle ? (
                <input
                  type="text"
                  className="builder-title builder-title-editable"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSaveTitle();
                    } else if (e.key === "Escape") {
                      handleCancelEditTitle();
                    }
                  }}
                  autoFocus
                  placeholder="Your Action Map"
                />
              ) : (
                <>
                  <h1 className="builder-title">{currentProjectTitle}</h1>
                  <button
                    type="button"
                    className="builder-title-edit-btn"
                    onClick={handleStartEditTitle}
                    aria-label="Edit map title"
                  >
                    ✎
                  </button>
                </>
              )}
            </div>
            <div className="builder-status">
              {isLoggedIn ? (
                <span>Changes will be saved to your account automatically.</span>
              ) : (
                <span>
                  You&apos;re in demo mode.{" "}
                  <button
                    type="button"
                    className="builder-status-link"
                    onClick={() => setAuthView("signup")}
                  >
                    Sign up for free
                  </button>{" "}
                  to save this map.
                </span>
              )}
            </div>
          </div>

          <div className="layout">
            <section className="panel">
              <div className="panel-header-row">
                <h2>Goal Sheet</h2>
                <div className="panel-header-actions">
                  <div className="view-toggle">
                    <button
                      type="button"
                      className={
                        "view-toggle-btn" +
                        (viewMode === "grid" ? " view-toggle-btn-active" : "")
                      }
                      onClick={() => setViewMode("grid")}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className={
                        "view-toggle-btn" +
                        (viewMode === "map" ? " view-toggle-btn-active" : "")
                      }
                      onClick={() => setViewMode("map")}
                    >
                      Edit
                    </button>
                  </div>

                  {viewMode === "map" && (
                    <>
                      <button
                        type="button"
                        className="template-btn"
                        onClick={() => setTemplatesOpen(true)}
                      >
                        Templates
                      </button>
                      <button
                        type="button"
                        className="ai-template-btn"
                        onClick={() => setAiModalOpen(true)}
                      >
                        Templates (AI)
                      </button>
                      <button
                        type="button"
                        className="reset-btn"
                        onClick={() => setResetOpen(true)}
                      >
                        Reset All
                      </button>
                    </>
                  )}

                  {viewMode === "grid" && (
                    <button
                      type="button"
                      className="export-btn"
                      onClick={handleExport}
                    >
                      Export / Print
                    </button>
                  )}
                </div>
              </div>

              <p className="panel-subtitle">
                {viewMode === "map"
                  ? "Edit mode: add your main goal, rename pillars, and type in actions—or use Templates / Templates (AI) to start from a ready-made map."
                  : "View mode: see your Harada-style grid. Click a pillar to collapse it and an action to mark it done for today."}
              </p>

              {viewMode === "map" ? (
                <EditMode
                  state={state}
                  activePillar={activePillar}
                  onSelectPillar={setActivePillar}
                  onGoalChange={onUpdateGoal}
                  onPillarChange={onUpdatePillar}
                  onTaskChange={onUpdateTask}
                  onRefinePillar={onPillarRefine}
                />
              ) : (
                <ViewMode
                  state={state}
                  selectedDate={selectedDate}
                  diaryEntry={diaryEntry}
                  progressForDay={progressForDay}
                  allCompletedTasks={allCompletedTasks}
                  pillarCompletion={pillarCompletion}
                  completedDefinedTasks={completedDefinedTasks}
                  totalDefinedTasks={totalDefinedTasks}
                  progressPercent={progressPercent}
                  collapsedPillars={collapsedPillars}
                  onTogglePillar={onTogglePillarCollapse}
                  onToggleTask={onToggleTaskForDay}
                  onDiaryChange={onUpdateDiary}
                  historyOpen={historyOpen}
                  onToggleHistory={onToggleHistory}
                  expandedDiaryDates={expandedDiaryDates}
                  onToggleDiaryDate={onToggleDiaryDateExpanded}
                  olderExpanded={olderExpanded}
                  onToggleOlder={onToggleOlder}
                />
              )}

              {templatesOpen && (
                <TemplateModal
                  templates={templates}
                  onClose={() => setTemplatesOpen(false)}
                  onApply={onApplyTemplate}
                />
              )}

              {aiModalOpen && (
                <AiHelperModal
                  value={aiGoalText}
                  onChange={(next) => setAiGoalText(next)}
                  onCancel={() => setAiModalOpen(false)}
                  onGenerate={onAiGenerate}
                  isGenerating={isAiGenerating}
                />
              )}

              {resetOpen && (
                <ResetModal
                  onCancel={() => setResetOpen(false)}
                  onConfirm={onConfirmReset}
                />
              )}

              {pillarRefineModalOpen && (
                <PillarRefineModal
                  isOpen={pillarRefineModalOpen}
                  currentPillar={state.pillars[pillarRefineIndex] || ""}
                  goal={state.goal || ""}
                  onClose={() => setPillarRefineModalOpen(false)}
                  onSelect={onSelectRefinedPillar}
                  isGenerating={isPillarRefining}
                  suggestions={pillarRefineSuggestions}
                />
              )}
            </section>
          </div>
            </div>
          </div>
        </main>

        <AuthModal
          authView={authView}
          onClose={() => setAuthView(null)}
          onSwitchView={(view) => setAuthView(view)}
        />

        <StartModal
          isOpen={startModalOpen}
          onClose={async () => {
            // "Skip for now" – still create a project row
            await onEnsureProject();
            if (onDismissStartModalPermanently) {
              onDismissStartModalPermanently();
            } else {
              setStartModalOpen(false);
            }
          }}
          onFillYourself={async () => {
            await onEnsureProject();
            setViewMode("map"); // jump to Edit mode
            if (onDismissStartModalPermanently) {
              onDismissStartModalPermanently();
            } else {
              setStartModalOpen(false);
            }
          }}
          onUseAI={async () => {
            await onEnsureProject();
            if (onDismissStartModalPermanently) {
              onDismissStartModalPermanently();
            } else {
              setStartModalOpen(false);
            }
            setViewMode("map"); // edit mode so they can tweak
            setAiModalOpen(true); // open your existing AI helper modal
          }}
        />
      </div>
    </div>
  );
};

