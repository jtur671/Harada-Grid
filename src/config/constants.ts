// API endpoints
export const AI_HELPER_URL =
  (import.meta.env.VITE_AI_HELPER_URL as string | undefined) ?? "/api/ai-helper";
export const PILLAR_REFINE_URL =
  (import.meta.env.VITE_PILLAR_REFINE_URL as string | undefined) ?? "/api/pillar-refine";

// Plan limits
export const FREE_PLAN_MAP_LIMIT = 3;
export const PRO_PLAN_MAP_LIMIT = Infinity; // No limit for pro users

// LocalStorage keys
export const PLAN_STORAGE_KEY = "actionmaps-plan";
export const START_MODAL_DISMISSED_KEY = "actionmaps-start-modal-dismissed";


