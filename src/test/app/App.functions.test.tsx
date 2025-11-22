import { describe, it, expect } from "vitest";
import { deriveTitleFromState } from "../../App";
import { createEmptyState } from "../../utils/harada";
import type { HaradaState } from "../../types";

describe("deriveTitleFromState", () => {
  it("returns the goal when it is less than 80 characters", () => {
    const state: HaradaState = {
      ...createEmptyState(),
      goal: "Build a successful startup",
    };
    expect(deriveTitleFromState(state)).toBe("Build a successful startup");
  });

  it("truncates goal when it exceeds 80 characters", () => {
    const longGoal =
      "This is a very long goal that definitely exceeds the 80 character limit and should be truncated properly";
    const state: HaradaState = {
      ...createEmptyState(),
      goal: longGoal,
    };
    const result = deriveTitleFromState(state);
    expect(result).toHaveLength(80);
    expect(result.endsWith("...")).toBe(true);
    expect(result).toBe(longGoal.slice(0, 77) + "...");
  });

  it("returns 'Untitled map' when goal is empty", () => {
    const state: HaradaState = {
      ...createEmptyState(),
      goal: "",
    };
    expect(deriveTitleFromState(state)).toBe("Untitled map");
  });

  it("returns 'Untitled map' when goal is only whitespace", () => {
    const state: HaradaState = {
      ...createEmptyState(),
      goal: "   \n\t  ",
    };
    expect(deriveTitleFromState(state)).toBe("Untitled map");
  });

  it("trims whitespace from goal before checking length", () => {
    const state: HaradaState = {
      ...createEmptyState(),
      goal: "   Short goal   ",
    };
    expect(deriveTitleFromState(state)).toBe("Short goal");
  });

  it("handles exactly 80 characters correctly", () => {
    const exactly80Chars = "a".repeat(80);
    const state: HaradaState = {
      ...createEmptyState(),
      goal: exactly80Chars,
    };
    expect(deriveTitleFromState(state)).toBe(exactly80Chars);
  });

  it("handles 81 characters correctly (truncates)", () => {
    const exactly81Chars = "a".repeat(81);
    const state: HaradaState = {
      ...createEmptyState(),
      goal: exactly81Chars,
    };
    const result = deriveTitleFromState(state);
    expect(result).toHaveLength(80);
    expect(result).toBe("a".repeat(77) + "...");
  });
});

// Note: handleDeleteProject, ensureProjectForCurrentState, and auto-save
// are tested through integration tests in DashboardPage.test.tsx and
// would require complex App component mounting with full state management.
// The critical paths are covered through:
// 1. DashboardPage.test.tsx - Delete UI and handler calls
// 2. Manual/E2E testing for project creation and auto-save flows

