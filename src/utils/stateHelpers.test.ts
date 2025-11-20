import { describe, expect, it } from "vitest";
import { createEmptyState } from "./harada";
import type { Template } from "../templates";
import {
  withAppliedTemplate,
  withGoal,
  withPillar,
  withTask,
  withToggledTaskForDay,
} from "./stateHelpers";

describe("stateHelpers", () => {
  it("updates the main goal without mutating other properties", () => {
    const state = createEmptyState();
    const next = withGoal(state, "Ship an app");

    expect(next.goal).toBe("Ship an app");
    expect(next.pillars).toEqual(state.pillars);
    expect(next).not.toBe(state);
  });

  it("updates a pillar name immutably", () => {
    const state = createEmptyState();
    const next = withPillar(state, 2, "Marketing");

    expect(next.pillars[2]).toBe("Marketing");
    expect(next.pillars).not.toBe(state.pillars);
    expect(next.pillars[0]).toBe(state.pillars[0]);
  });

  it("sets a specific task value without mutating other pillars", () => {
    const state = createEmptyState();
    const next = withTask(state, 1, 3, "Write launch plan");

    expect(next.tasks[1][3]).toBe("Write launch plan");
    expect(next.tasks[1]).not.toBe(state.tasks[1]);
    expect(next.tasks[0]).toBe(state.tasks[0]);
  });

  it("toggles a task for a given day on and off", () => {
    const state = createEmptyState();
    const date = "2025-01-01";
    const taskId = "1-2";

    const afterAdd = withToggledTaskForDay(state, date, taskId);
    expect(afterAdd.progressByDate[date]).toEqual([taskId]);

    const afterRemove = withToggledTaskForDay(afterAdd, date, taskId);
    expect(afterRemove.progressByDate[date]).toEqual([]);
  });

  it("applies a template and resets derived collections", () => {
    const template: Template = {
      id: "test",
      name: "Test",
      description: "Test template",
      goal: "Test Goal",
      pillars: Array.from({ length: 8 }, (_, i) => `Pillar ${i + 1} name`),
      tasks: Array.from({ length: 8 }, (_, pIndex) =>
        Array.from({ length: 8 }, (_, tIndex) => `Task ${pIndex}-${tIndex}`)
      ),
    };

    const state = createEmptyState();
    state.diaryByDate["2025-01-01"] = "Existing diary";

    const next = withAppliedTemplate(state, template);

    expect(next.goal).toBe(template.goal);
    expect(next.pillars).toEqual(template.pillars);
    expect(next.tasks).toEqual(template.tasks);
    expect(next.diaryByDate).toEqual({});
    expect(next.progressByDate).toEqual({});
  });
});

