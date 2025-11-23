export type HaradaState = {
  goal: string;
  pillars: string[]; // 8 pillars
  tasks: string[][]; // [pillarIndex][taskIndex] => description (8 x 8)
  diaryByDate: Record<string, string>;
  progressByDate: Record<string, string[]>; // date => ["p-t", ...]
  completedDates: string[]; // dates where full grid was completed
};

export type AppView = "home" | "builder" | "harada" | "dashboard" | "pricing" | "support";
export type AuthView = "login" | "signup" | null;
export type SubscriptionPlan = "free" | "premium" | null;
export type ExampleId = "career" | "sidebiz" | "wellbeing";

export type ProjectSummary = {
  id: string;
  title: string | null;
  goal: string | null;
  updated_at: string;
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
