import { useMemo } from "react";
import type { HaradaState } from "../types";
import { formatDisplayDate } from "../utils/date";
import { TraditionalGrid } from "./TraditionalGrid";

const HISTORY_VISIBLE_COUNT = 5;

type ViewModeProps = {
  state: HaradaState;
  selectedDate: string;
  diaryEntry: string;
  progressForDay: string[];
  allCompletedTasks: string[];
  pillarCompletion: { defined: number; completed: number }[];
  completedDefinedTasks: number;
  totalDefinedTasks: number;
  progressPercent: number;
  collapsedPillars: boolean[];
  onTogglePillar: (pillarIndex: number) => void;
  onToggleTask: (taskId: string) => void;
  onDiaryChange: (value: string) => void;
  historyOpen: boolean;
  onToggleHistory: () => void;
  expandedDiaryDates: Record<string, boolean>;
  onToggleDiaryDate: (date: string) => void;
  olderExpanded: boolean;
  onToggleOlder: () => void;
};

export const ViewMode: React.FC<ViewModeProps> = ({
  state,
  selectedDate,
  diaryEntry,
  progressForDay,
  allCompletedTasks,
  pillarCompletion,
  completedDefinedTasks,
  totalDefinedTasks,
  progressPercent,
  collapsedPillars,
  onTogglePillar,
  onToggleTask,
  onDiaryChange,
  historyOpen,
  onToggleHistory,
  expandedDiaryDates,
  onToggleDiaryDate,
  olderExpanded,
  onToggleOlder,
}) => {
  const { historyDates, latestDates, olderDates } = useMemo(() => {
    const allDatesSet = new Set<string>();

    Object.keys(state.diaryByDate).forEach((date) => {
      if ((state.diaryByDate[date] ?? "").trim()) {
        allDatesSet.add(date);
      }
    });

    Object.keys(state.progressByDate).forEach((date) => {
      const actions = state.progressByDate[date] ?? [];
      if (actions.length > 0) {
        allDatesSet.add(date);
      }
    });

    (state.completedDates ?? []).forEach((date) => {
      allDatesSet.add(date);
    });

    allDatesSet.delete(selectedDate);

    const sortedDates = Array.from(allDatesSet).sort((a, b) =>
      a < b ? 1 : a > b ? -1 : 0
    );

    return {
      historyDates: sortedDates,
      latestDates: sortedDates.slice(0, HISTORY_VISIBLE_COUNT),
      olderDates: sortedDates.slice(HISTORY_VISIBLE_COUNT),
    };
  }, [
    selectedDate,
    state.completedDates,
    state.diaryByDate,
    state.progressByDate,
  ]);

  const renderHistoryEntry = (date: string) => {
    const actions = state.progressByDate[date] ?? [];
    const actionsCount = actions.length;
    const diaryText = state.diaryByDate[date] ?? "";
    const expanded = !!expandedDiaryDates[date];
    const fullyDone = state.completedDates?.includes(date);

    let summary: string;
    if (fullyDone) {
      summary = "Completed full grid";
    } else if (actionsCount === 0) {
      summary = "No actions completed";
    } else if (actionsCount === 1) {
      summary = "Completed 1 action";
    } else {
      summary = `Completed ${actionsCount} actions`;
    }

    return (
      <li key={date} className="diary-history-entry">
        <button
          type="button"
          className="diary-history-entry-header"
          onClick={() => onToggleDiaryDate(date)}
        >
          <span className="diary-history-entry-date">
            {formatDisplayDate(date)}
          </span>
          <span className="diary-history-entry-summary">{summary}</span>
          <span className="diary-history-chevron">
            {expanded ? "▴" : "▾"}
          </span>
        </button>
        {expanded && (
          <div className="diary-history-entry-body">
            <div className="diary-history-entry-text">
              {diaryText.trim()
                ? diaryText
                : fullyDone
                  ? "Full grid completed. No diary entry saved."
                  : "No diary entry for this day—just checkmarks."}
            </div>
          </div>
        )}
      </li>
    );
  };

  return (
    <>
      <div className="progress-bar-section">
        <div className="progress-bar-header">
          <span className="progress-bar-title">Today&apos;s Progress</span>
          <span className="progress-bar-count">
            {completedDefinedTasks} / {totalDefinedTasks || 0} actions
          </span>
        </div>
        <div className="progress-bar-track">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="progress-pillars-row">
          {pillarCompletion.map((p, index) => {
            const isComplete = p.defined > 0 && p.completed === p.defined;
            return (
              <div
                key={index}
                className={
                  "progress-pillar-dot" +
                  (isComplete ? " progress-pillar-dot-complete" : "")
                }
                title={state.pillars[index] || `Pillar ${index + 1}`}
              >
                {index + 1}
              </div>
            );
          })}
        </div>
      </div>

      <div className="view-diary">
        <h3>Daily Diary</h3>
        <p className="panel-subtitle small">
          Today&apos;s date and reflection for your current actions.
        </p>

        <div className="date-row">
          <span className="date-row-label">Today:</span>
          <span className="date-static">{formatDisplayDate(selectedDate)}</span>
        </div>

        <textarea
          className="diary-input"
          value={diaryEntry}
          onChange={(e) => onDiaryChange(e.target.value)}
          placeholder="Reflect on today. What worked? What didn't? What will you adjust tomorrow?"
        />
        <p className="diary-auto-save-label">
          Auto-saves as you type. No need to save manually.
        </p>

        <div className="diary-history">
          <button
            type="button"
            className="diary-history-header"
            onClick={onToggleHistory}
          >
            <span>Diary History</span>
            <span className="diary-history-count">
              {historyDates.length} {historyDates.length === 1 ? "day" : "days"}
            </span>
            <span className="diary-history-chevron">
              {historyOpen ? "▴" : "▾"}
            </span>
          </button>

          {historyOpen && (
            <div className="diary-history-body">
              {historyDates.length === 0 ? (
                <p className="diary-history-empty">
                  No previous diary or action history yet.
                </p>
              ) : (
                <ul className="diary-history-list">
                  {latestDates.map(renderHistoryEntry)}

                  {olderDates.length > 0 && (
                    <li className="diary-history-older">
                      <button
                        type="button"
                        className="diary-history-entry-header older-header"
                        onClick={onToggleOlder}
                      >
                        <span className="diary-history-entry-date">
                          Older (
                          {formatDisplayDate(olderDates[olderDates.length - 1])}{" "}
                          – {formatDisplayDate(olderDates[0])})
                        </span>
                        <span className="diary-history-entry-summary">
                          {olderDates.length}{" "}
                          {olderDates.length === 1 ? "day" : "days"}
                        </span>
                        <span className="diary-history-chevron">
                          {olderExpanded ? "▴" : "▾"}
                        </span>
                      </button>
                      {olderExpanded && (
                        <ul className="diary-history-list nested">
                          {olderDates.map(renderHistoryEntry)}
                        </ul>
                      )}
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      <TraditionalGrid
        state={state}
        collapsedPillars={collapsedPillars}
        onTogglePillar={onTogglePillar}
        progressForDay={progressForDay}
        allCompletedTasks={allCompletedTasks}
        onToggleTask={onToggleTask}
      />
    </>
  );
};

