import React from "react";
import type { User } from "@supabase/supabase-js";
import type { HaradaState } from "../types";
import type { Template } from "../templates";
import { EditMode } from "./EditMode";
import { ViewMode } from "./ViewMode";
import { TemplateModal } from "./TemplateModal";
import { AiHelperModal } from "./AiHelperModal";
import { ResetModal } from "./ResetModal";
import { AuthModal } from "./AuthModal";
import { StartModal } from "./StartModal";
import { AppHeader } from "./AppHeader";
import { triggerPrintWithBodyClass } from "../utils/print";

type AuthView = "login" | "signup" | null;
type AppView = "home" | "builder" | "harada" | "dashboard" | "pricing";

type BuilderPageProps = {
  state: HaradaState;
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
  resetOpen: boolean;
  setResetOpen: (open: boolean) => void;
  startModalOpen: boolean;
  setStartModalOpen: (open: boolean) => void;
  authView: AuthView;
  setAuthView: (view: AuthView) => void;
  user: User | null;
  isAdmin: boolean;
  isLoggedIn: boolean;
  progressForDay: string[];
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
  templates: Template[];
};

export const BuilderPage: React.FC<BuilderPageProps> = ({
  state,
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
  resetOpen,
  setResetOpen,
  startModalOpen,
  setStartModalOpen,
  authView,
  setAuthView,
  user,
  isAdmin,
  isLoggedIn,
  progressForDay,
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
  templates,
}) => {
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
          showBackButton
          onBackClick={() => onSetAppView("home")}
          user={user}
          isAdmin={isAdmin}
          onSetAuthView={setAuthView}
          onGoToPricing={() => onSetAppView("pricing")}
        />

        <main className="builder-main">
          <div className="builder-top-row">
            <h1 className="builder-title">Your Action Map</h1>
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
                    Sign up
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
                        (viewMode === "map" ? " view-toggle-btn-active" : "")
                      }
                      onClick={() => setViewMode("map")}
                    >
                      Edit
                    </button>
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
                />
              ) : (
                <ViewMode
                  state={state}
                  selectedDate={selectedDate}
                  diaryEntry={diaryEntry}
                  progressForDay={progressForDay}
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
                />
              )}

              {resetOpen && (
                <ResetModal
                  onCancel={() => setResetOpen(false)}
                  onConfirm={onConfirmReset}
                />
              )}
            </section>
          </div>
        </main>

        <AuthModal
          authView={authView}
          onClose={() => setAuthView(null)}
          onSwitchView={(view) => setAuthView(view)}
        />

        <StartModal
          isOpen={startModalOpen}
          onClose={() => setStartModalOpen(false)}
          onFillYourself={() => {
            setViewMode("map"); // jump to Edit mode
            setStartModalOpen(false);
          }}
          onUseAI={() => {
            setStartModalOpen(false);
            setViewMode("map"); // edit mode so they can tweak
            setAiModalOpen(true); // open your existing AI helper modal
          }}
        />
      </div>
    </div>
  );
};

