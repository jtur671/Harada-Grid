import React, { useEffect, useState } from "react";
import { TEMPLATES, type Template } from "./templates";
import type { HaradaState } from "./types";
import { todayISO } from "./utils/date";
import { loadState, saveState, createEmptyState } from "./utils/harada";
import { triggerPrintWithBodyClass } from "./utils/print";
import { useProgressStats } from "./hooks/useProgressStats";
import { EditMode } from "./components/EditMode";
import { ViewMode } from "./components/ViewMode";
import { TemplateModal } from "./components/TemplateModal";
import { AiHelperModal } from "./components/AiHelperModal";
import { ResetModal } from "./components/ResetModal";

const App: React.FC = () => {
  const [state, setState] = useState<HaradaState>(() => loadState());
  const [selectedDate] = useState<string>(todayISO()); // static "today"
  const [activePillar, setActivePillar] = useState<number>(0);
  const [viewMode, setViewMode] = useState<"map" | "grid">("map");
  const [collapsedPillars, setCollapsedPillars] = useState<boolean[]>(() =>
    Array(8).fill(false)
  );

  // Diary history UI
  const [historyOpen, setHistoryOpen] = useState<boolean>(true);
  const [expandedDiaryDates, setExpandedDiaryDates] = useState<
    Record<string, boolean>
  >({});
  const [olderExpanded, setOlderExpanded] = useState<boolean>(false);

  // Templates, AI, reset
  const [templatesOpen, setTemplatesOpen] = useState<boolean>(false);
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [aiGoalText, setAiGoalText] = useState<string>("");
  const [resetOpen, setResetOpen] = useState<boolean>(false);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const {
    progressForDay,
    diaryEntry,
    pillarCompletion,
    totalDefinedTasks,
    completedDefinedTasks,
    progressPercent,
  } = useProgressStats(state, selectedDate, setState);

  // ---- Basic updates ----

  const updateGoal = (value: string) => {
    setState((prev) => ({ ...prev, goal: value }));
  };

  const updatePillar = (index: number, value: string) => {
    setState((prev) => {
      const pillars = [...prev.pillars];
      pillars[index] = value;
      return { ...prev, pillars };
    });
  };

  const updateTask = (pillarIndex: number, taskIndex: number, value: string) => {
    setState((prev) => {
      const tasks = prev.tasks.map((col) => [...col]);
      tasks[pillarIndex][taskIndex] = value;
      return { ...prev, tasks };
    });
  };

  // Toggle a task for TODAY only
  const toggleTaskForDay = (taskId: string) => {
    setState((prev) => {
      const current = prev.progressByDate[selectedDate] ?? [];
      const isDone = current.includes(taskId);
      const updatedCurrent = isDone
        ? current.filter((id) => id !== taskId)
        : [...current, taskId];

      return {
        ...prev,
        progressByDate: {
          ...prev.progressByDate,
          [selectedDate]: updatedCurrent,
        },
      };
    });
  };

  const updateDiary = (value: string) => {
    setState((prev) => ({
      ...prev,
      diaryByDate: {
        ...prev.diaryByDate,
        [selectedDate]: value,
      },
    }));
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
      setHistoryOpen(prevHistoryOpen);
      setOlderExpanded(prevOlderExpanded);
    }, 50);
  };

  const handleTogglePillarCollapse = (pillarIndex: number) => {
    setCollapsedPillars((prev) => {
      const next = [...prev];
      next[pillarIndex] = !next[pillarIndex];
      return next;
    });
  };

  const applyTemplate = (template: Template) => {
    setState((prev) => ({
      ...prev,
      goal: template.goal,
      pillars: template.pillars,
      tasks: template.tasks,
    }));
    setActivePillar(0);
    setTemplatesOpen(false);
  };

  // Reset EVERYTHING (goal, pillars, tasks, diary, progress, completions)
  const handleConfirmReset = () => {
    const empty = createEmptyState();
    setState(empty);
    setActivePillar(0);
    setCollapsedPillars(Array(8).fill(false));
    setExpandedDiaryDates({});
    setOlderExpanded(false);
    setResetOpen(false);
  };

  const toggleDiaryDateExpanded = (date: string) => {
    setExpandedDiaryDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const handleToggleHistory = () => {
    setHistoryOpen((prev) => !prev);
  };

  const handleToggleOlder = () => {
    setOlderExpanded((prev) => !prev);
  };

  // AI stub (wire to OpenAI later)
  const handleAiGenerate = () => {
    console.log("AI Helper main goal:", aiGoalText);
    setAiModalOpen(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Harada Grid – Local Goal Planner</h1>
        <p className="subtitle">
          One big goal, 8 pillars, 8 actions each. All local, all yours.
        </p>
      </header>

      <main className="layout">
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
            Edit mode for building your system. View mode for a classic
            Harada-style grid. In View mode, click a pillar to collapse it or an
            action to mark it done for today.
          </p>

          {viewMode === "map" ? (
            <EditMode
              state={state}
              activePillar={activePillar}
              onSelectPillar={setActivePillar}
              onGoalChange={updateGoal}
              onPillarChange={updatePillar}
              onTaskChange={updateTask}
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
              onTogglePillar={handleTogglePillarCollapse}
              onToggleTask={toggleTaskForDay}
              onDiaryChange={updateDiary}
              historyOpen={historyOpen}
              onToggleHistory={handleToggleHistory}
              expandedDiaryDates={expandedDiaryDates}
              onToggleDiaryDate={toggleDiaryDateExpanded}
              olderExpanded={olderExpanded}
              onToggleOlder={handleToggleOlder}
            />
          )}

          {templatesOpen && (
            <TemplateModal
              templates={TEMPLATES}
              onClose={() => setTemplatesOpen(false)}
              onApply={applyTemplate}
            />
          )}

          {aiModalOpen && (
            <AiHelperModal
              value={aiGoalText}
              onChange={(next) => setAiGoalText(next)}
              onCancel={() => setAiModalOpen(false)}
              onGenerate={handleAiGenerate}
            />
          )}

          {resetOpen && (
            <ResetModal
              onCancel={() => setResetOpen(false)}
              onConfirm={handleConfirmReset}
            />
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
