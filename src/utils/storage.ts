import type { SubscriptionPlan, AppView, ProjectSummary } from "../types";
import {
  PLAN_STORAGE_KEY,
  START_MODAL_DISMISSED_KEY,
  LAST_VIEW_KEY,
  PROJECTS_CACHE_KEY,
  PROJECTS_CACHE_TTL_MS,
} from "../config/constants";

export const getInitialPlan = (): SubscriptionPlan => {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(PLAN_STORAGE_KEY);
  return stored === "free" || stored === "premium" ? stored : null;
};

export const setPlan = (plan: SubscriptionPlan): void => {
  if (typeof window === "undefined") return;
  if (plan) {
    window.localStorage.setItem(PLAN_STORAGE_KEY, plan);
  } else {
    window.localStorage.removeItem(PLAN_STORAGE_KEY);
  }
};

export const hasDismissedStartModal = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(START_MODAL_DISMISSED_KEY) === "true";
};

export const setStartModalDismissed = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(START_MODAL_DISMISSED_KEY, "true");
};

export const getLastView = (): AppView | null => {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(LAST_VIEW_KEY);
  if (stored === "home" || stored === "builder" || stored === "dashboard" || stored === "pricing" || stored === "support" || stored === "harada") {
    return stored as AppView;
  }
  return null;
};

export const setLastView = (view: AppView): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_VIEW_KEY, view);
};

type ProjectsCacheEntry = {
  projects: ProjectSummary[];
  updatedAt: number;
};

type ProjectsCacheMap = Record<string, ProjectsCacheEntry>;

const safeParseCache = (): ProjectsCacheMap => {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(PROJECTS_CACHE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as ProjectsCacheMap;
    }
  } catch (err) {
    console.warn("[storage] Failed to parse projects cache, clearing:", err);
  }
  return {};
};

const writeCache = (map: ProjectsCacheMap): void => {
  if (typeof window === "undefined") return;
  if (Object.keys(map).length === 0) {
    window.localStorage.removeItem(PROJECTS_CACHE_KEY);
    return;
  }
  window.localStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(map));
};

export const getCachedProjects = (
  userId: string | null | undefined
): ProjectSummary[] | null => {
  if (typeof window === "undefined" || !userId) return null;
  const cache = safeParseCache();
  const entry = cache[userId];
  if (!entry) return null;
  const age = Date.now() - entry.updatedAt;
  const isStale = age > PROJECTS_CACHE_TTL_MS;
  if (isStale) {
    delete cache[userId];
    writeCache(cache);
    return null;
  }
  return entry.projects;
};

export const setCachedProjects = (
  userId: string | null | undefined,
  projects: ProjectSummary[]
): void => {
  if (typeof window === "undefined" || !userId) return;
  const cache = safeParseCache();
  cache[userId] = {
    projects,
    updatedAt: Date.now(),
  };
  writeCache(cache);
};

export const clearCachedProjects = (userId?: string | null): void => {
  if (typeof window === "undefined") return;
  if (!userId) {
    window.localStorage.removeItem(PROJECTS_CACHE_KEY);
    return;
  }
  const cache = safeParseCache();
  if (cache[userId]) {
    delete cache[userId];
    writeCache(cache);
  }
};


