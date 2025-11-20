import type { Template } from "../templates";
import type { HaradaState } from "../types";

export const withGoal = (state: HaradaState, goal: string): HaradaState => ({
  ...state,
  goal,
});

export const withPillar = (
  state: HaradaState,
  pillarIndex: number,
  name: string
): HaradaState => {
  if (pillarIndex < 0 || pillarIndex >= state.pillars.length) {
    return state;
  }

  const pillars = [...state.pillars];
  pillars[pillarIndex] = name;

  return {
    ...state,
    pillars,
  };
};

export const withTask = (
  state: HaradaState,
  pillarIndex: number,
  taskIndex: number,
  value: string
): HaradaState => {
  if (
    pillarIndex < 0 ||
    pillarIndex >= state.tasks.length ||
    taskIndex < 0 ||
    taskIndex >= state.tasks[pillarIndex].length
  ) {
    return state;
  }

  const tasks = state.tasks.map((col, colIndex) =>
    colIndex === pillarIndex ? [...col] : col
  );
  tasks[pillarIndex][taskIndex] = value;

  return {
    ...state,
    tasks,
  };
};

export const withToggledTaskForDay = (
  state: HaradaState,
  date: string,
  taskId: string
): HaradaState => {
  const current = state.progressByDate[date] ?? [];
  const hasTask = current.includes(taskId);
  const updated = hasTask
    ? current.filter((id) => id !== taskId)
    : [...current, taskId];

  return {
    ...state,
    progressByDate: {
      ...state.progressByDate,
      [date]: updated,
    },
  };
};

export const withAppliedTemplate = (
  _state: HaradaState,
  template: Template
): HaradaState => {
  const nextPillars = Array.from(
    { length: 8 },
    (_, index) => template.pillars[index] ?? `Pillar ${index + 1}`
  );

  const nextTasks = Array.from({ length: 8 }, (_, pIndex) =>
    Array.from(
      { length: 8 },
      (_, tIndex) => template.tasks[pIndex]?.[tIndex] ?? ""
    )
  );

  return {
    goal: template.goal,
    pillars: nextPillars,
    tasks: nextTasks,
    diaryByDate: {},
    progressByDate: {},
    completedDates: [],
  };
};

