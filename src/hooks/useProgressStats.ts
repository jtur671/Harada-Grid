import { useEffect, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { HaradaState } from "../types";
import { getTaskId } from "../utils/harada";

type ProgressSummary = {
  defined: number;
  completed: number;
};

export type ProgressStats = {
  progressForDay: string[];
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
            if (progressForDay.includes(id)) {
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
    }, [progressForDay, state.pillars, state.tasks]);

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
    diaryEntry,
    pillarCompletion,
    totalDefinedTasks,
    completedDefinedTasks,
    progressPercent,
  };
};

