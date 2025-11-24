import type { HaradaState } from "../types";

/**
 * Creates a deterministic fingerprint for the parts of the Harada state that
 * should trigger an autosave when they change.
 *
 * We intentionally include diary entries, daily progress, and completion dates
 * so that journaling and daily task completion are persisted to Supabase.
 */
export const createStateFingerprint = (state: HaradaState): string =>
  JSON.stringify({
    goal: state.goal,
    pillars: state.pillars,
    tasks: state.tasks,
    diaryByDate: state.diaryByDate,
    progressByDate: state.progressByDate,
    completedDates: state.completedDates,
  });

/**
 * Returns true when the state has any meaningful content that should be saved.
 * This prevents autosave from writing totally blank maps for brand-new users,
 * but ensures diary entries and daily completion data get persisted.
 */
export const hasMeaningfulContent = (state: HaradaState): boolean => {
  if (state.goal?.trim()) return true;
  if (state.pillars.some((p) => p?.trim())) return true;
  if (state.tasks.some((row) => row.some((t) => t?.trim()))) return true;
  if (Object.values(state.diaryByDate ?? {}).some((entry) => entry?.trim())) {
    return true;
  }
  if (Object.keys(state.progressByDate ?? {}).length > 0) return true;
  if ((state.completedDates ?? []).length > 0) return true;
  return false;
};

