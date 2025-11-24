import type { SubscriptionPlan } from "../types";
import { PLAN_STORAGE_KEY, START_MODAL_DISMISSED_KEY } from "../config/constants";

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


