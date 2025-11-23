import { AI_HELPER_URL, PILLAR_REFINE_URL } from "../config/constants";
import type { Template } from "../templates";
import type { HaradaState } from "../types";
import { withAppliedTemplate } from "../utils/stateHelpers";

export type AiHelperResponse = {
  goal: string;
  pillars: string[]; // 8 items
  tasks: string[][]; // 8 x 8
  name?: string;
  description?: string;
};

export type PillarRefineResponse = {
  suggestions: string[]; // 5 items
};

export const generateAiMap = async (goal: string): Promise<AiHelperResponse> => {
  const response = await fetch(AI_HELPER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ goal: goal.trim() }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI helper error: ${response.status} ${errorText}`);
  }

  return (await response.json()) as AiHelperResponse;
};

export const refinePillar = async (
  goal: string,
  currentPillar: string
): Promise<PillarRefineResponse> => {
  const response = await fetch(PILLAR_REFINE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ goal, currentPillar }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pillar refine error: ${response.status} ${errorText}`);
  }

  return (await response.json()) as PillarRefineResponse;
};

export const applyAiResponseToState = (
  state: HaradaState,
  aiResponse: AiHelperResponse,
  goalText: string
): { newState: HaradaState; template: Template } => {
  const template: Template = {
    id: `ai-${Date.now()}`,
    name: aiResponse.name ?? "AI-generated map",
    description:
      aiResponse.description ??
      `Generated automatically from your goal: ${goalText}`,
    goal: aiResponse.goal ?? goalText,
    pillars: aiResponse.pillars,
    tasks: aiResponse.tasks,
  };

  const newState = withAppliedTemplate(state, template);
  return { newState, template };
};

