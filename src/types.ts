export type HaradaState = {
  goal: string;
  pillars: string[]; // 8 pillars
  tasks: string[][]; // [pillarIndex][taskIndex] => description (8 x 8)
  diaryByDate: Record<string, string>;
  progressByDate: Record<string, string[]>; // date => ["p-t", ...]
  completedDates: string[]; // dates where full grid was completed
};

export type CellKind =
  | { type: "goal" }
  | { type: "pillar"; pillarIndex: number }
  | { type: "task"; pillarIndex: number; taskIndex: number }
  | { type: "empty" };

export type TraditionalGridProps = {
  state: HaradaState;
  collapsedPillars: boolean[];
  onTogglePillar: (pillarIndex: number) => void;
  progressForDay: string[]; // Tasks completed today (for stats)
  allCompletedTasks: string[]; // All tasks completed on any date (for display)
  onToggleTask: (taskId: string) => void;
};
