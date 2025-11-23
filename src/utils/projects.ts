import type { HaradaState, ExampleId, ProjectSummary } from "../types";
import { TEMPLATES } from "../templates";
import { createEmptyState } from "./harada";

export const deriveTitleFromState = (state: HaradaState): string => {
  const trimmed = state.goal?.trim();
  if (trimmed) {
    return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed;
  }
  return "Untitled map";
};

export const getNextDefaultTitle = (projects: ProjectSummary[]): string => {
  const base = "Action Map ";

  let max = 0;

  for (const p of projects) {
    const name = (p.title ?? "").trim();
    if (name.toLowerCase().startsWith(base.toLowerCase())) {
      const suffix = name.slice(base.length).trim();
      const num = parseInt(suffix, 10);
      if (!Number.isNaN(num) && num > max) {
        max = num;
      }
    }
  }

  return `${base}${max + 1}`;
};

export const buildExampleState = (id: ExampleId): HaradaState => {
  const templateIdMap: Record<ExampleId, string> = {
    career: "career",
    sidebiz: "sidebiz",
    wellbeing: "wellbeing",
  };

  const template = TEMPLATES.find((t) => t.id === templateIdMap[id]);
  const base = createEmptyState();

  if (!template) return base;

  return {
    ...base,
    goal: template.goal,
    pillars: template.pillars,
    tasks: template.tasks,
  };
};

