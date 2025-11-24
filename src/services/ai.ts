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
  // Add timeout to prevent hanging requests (60 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(AI_HELPER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ goal: goal.trim() }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI helper error: ${response.status} ${errorText}`);
    }

    return (await response.json()) as AiHelperResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("AI request timed out. Please try again. The AI may be taking longer than expected.");
      }
      if (error.message.includes("Failed to fetch") || error.message.includes("ERR_CONNECTION_REFUSED")) {
        throw new Error("Cannot connect to AI service. Make sure the Cloudflare Pages dev server is running.");
      }
      throw error;
    }
    throw new Error("Unknown error occurred while generating AI map");
  }
};

export const refinePillar = async (
  goal: string,
  currentPillar: string
): Promise<PillarRefineResponse> => {
  // Add timeout to prevent hanging requests (30 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(PILLAR_REFINE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ goal, currentPillar }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pillar refine error: ${response.status} ${errorText}`);
    }

    return (await response.json()) as PillarRefineResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("AI request timed out. Please try again.");
      }
      if (error.message.includes("Failed to fetch") || error.message.includes("ERR_CONNECTION_REFUSED")) {
        throw new Error("Cannot connect to AI service. Make sure the Cloudflare Pages dev server is running.");
      }
      throw error;
    }
    throw new Error("Unknown error occurred while refining pillar");
  }
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
