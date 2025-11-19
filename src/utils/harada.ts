import type { HaradaState } from "../types";

export const STORAGE_KEY = "harada-app-state-v1";

export const GRID_SIZE = 9;

// Map outer 3×3 block positions -> pillar index
export const BLOCK_TO_PILLAR_INDEX: Record<string, number> = {
  "0-0": 0, // top-left  -> Pillar 1
  "0-1": 1, // top       -> Pillar 2
  "0-2": 2, // top-right -> Pillar 3
  "1-2": 3, // right     -> Pillar 4
  "2-2": 4, // bottom-right -> Pillar 5
  "2-1": 5, // bottom    -> Pillar 6
  "2-0": 6, // bottom-left -> Pillar 7
  "1-0": 7, // left      -> Pillar 8
};

// Offsets inside a 3×3 block for tasks (clockwise loop)
export const TASK_OFFSETS: Array<[number, number]> = [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 2],
  [2, 2],
  [2, 1],
  [2, 0],
  [1, 0],
];

export const TASK_OFFSET_INDEX: Record<string, number> = {};
TASK_OFFSETS.forEach(([r, c], idx) => {
  TASK_OFFSET_INDEX[`${r}-${c}`] = idx;
});

export const getTaskId = (pillarIndex: number, taskIndex: number): string =>
  `${pillarIndex}-${taskIndex}`;

export const createEmptyState = (): HaradaState => ({
  goal: "",
  pillars: Array.from({ length: 8 }, (_, i) => `Pillar ${i + 1}`),
  tasks: Array.from({ length: 8 }, () =>
    Array.from({ length: 8 }, () => "")
  ),
  diaryByDate: {},
  progressByDate: {},
  completedDates: [],
});

export const loadState = (): HaradaState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyState();
    const parsed = JSON.parse(raw) as Partial<HaradaState>;

    const pillars = Array.from(
      { length: 8 },
      (_, i) => parsed.pillars?.[i] ?? `Pillar ${i + 1}`
    );
    const tasks = Array.from({ length: 8 }, (_, pIndex) =>
      Array.from(
        { length: 8 },
        (_, tIndex) => parsed.tasks?.[pIndex]?.[tIndex] ?? ""
      )
    );

    return {
      goal: parsed.goal ?? "",
      pillars,
      tasks,
      diaryByDate: parsed.diaryByDate ?? {},
      progressByDate: parsed.progressByDate ?? {},
      completedDates: parsed.completedDates ?? [],
    };
  } catch {
    return createEmptyState();
  }
};

export const saveState = (state: HaradaState): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
