import { useEffect, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { HaradaState } from "../types";
import { getTaskId } from "../utils/harada";

type ProgressSummary = {
  defined: number;
  completed: number;
};

export type ProgressStats = {
  progressForDay: string[]; // Tasks completed today
  allCompletedTasks: string[]; // All tasks completed on any date (cumulative)
  diaryEntry: string;
  pillarCompletion: ProgressSummary[];
  totalDefinedTasks: number;
  completedDefinedTasks: number;
  progressPercent: number;
};

export const useProgressStats = (
  state: HaradaState,
  selectedDate: string,
  setState: Dispatch<SetStateAction<HaradaState>>
): ProgressStats => {
  const progressForDay = state.progressByDate[selectedDate] ?? [];
  const diaryEntry = state.diaryByDate[selectedDate] ?? "";
  
  // Get all completed tasks from all dates (cumulative view)
  // This ensures tasks completed on previous days still show as green in the grid
  const allCompletedTasks = useMemo(() => {
    const completedSet = new Set<string>();
    // Add tasks from all dates in progressByDate
    Object.values(state.progressByDate).forEach((taskIds) => {
      taskIds.forEach((id) => completedSet.add(id));
    });
    // For dates that were fully completed, mark all defined tasks as done
    state.completedDates?.forEach(() => {
      state.pillars.forEach((_, pIndex) => {
        state.tasks[pIndex].forEach((_, tIndex) => {
          if (state.tasks[pIndex][tIndex].trim()) {
            completedSet.add(getTaskId(pIndex, tIndex));
          }
        });
      });
    });
    return Array.from(completedSet);
  }, [state.progressByDate, state.completedDates, state.pillars, state.tasks]);

  const { pillarCompletion, totalDefinedTasks, completedDefinedTasks } =
    useMemo(() => {
      let totalDefined = 0;
      let totalCompleted = 0;

      const perPillar = state.pillars.map((_, pIndex) => {
        const tasks = state.tasks[pIndex];
        let pillarDefined = 0;
        let pillarCompleted = 0;

        tasks.forEach((taskText, tIndex) => {
          if (taskText.trim()) {
            pillarDefined++;
            totalDefined++;
            const id = getTaskId(pIndex, tIndex);
            // Use allCompletedTasks (cumulative) instead of progressForDay (today only)
            // This ensures progress bar persists across days, matching the green blocks
            if (allCompletedTasks.includes(id)) {
              pillarCompleted++;
              totalCompleted++;
            }
          }
        });

        return { defined: pillarDefined, completed: pillarCompleted };
      });

      return {
        pillarCompletion: perPillar,
        totalDefinedTasks: totalDefined,
        completedDefinedTasks: totalCompleted,
      };
    }, [allCompletedTasks, state.pillars, state.tasks]);

  const progressPercent =
    totalDefinedTasks === 0
      ? 0
      : Math.round((completedDefinedTasks / totalDefinedTasks) * 100);

  useEffect(() => {
    if (totalDefinedTasks > 0 && completedDefinedTasks === totalDefinedTasks) {
      setState((prev) => {
        const prevCompleted = prev.completedDates ?? [];
        const already = prevCompleted.includes(selectedDate);
        const updatedCompleted = already
          ? prevCompleted
          : [...prevCompleted, selectedDate];

        return {
          ...prev,
          completedDates: updatedCompleted,
          progressByDate: {
            ...prev.progressByDate,
            [selectedDate]: [],
          },
        };
      });
    }
  }, [completedDefinedTasks, selectedDate, setState, totalDefinedTasks]);

  return {
    progressForDay,
    allCompletedTasks,
    diaryEntry,
    pillarCompletion,
    totalDefinedTasks,
    completedDefinedTasks,
    progressPercent,
  };
};

