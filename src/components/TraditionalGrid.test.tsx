import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TraditionalGrid } from "./TraditionalGrid";
import { createEmptyState, getTaskId } from "../utils/harada";

const baseState = () => {
  const state = createEmptyState();
  state.goal = "Launch Product";
  state.pillars[0] = "Product";
  state.tasks[0][0] = "Design UI";
  return state;
};

describe("TraditionalGrid", () => {
  it("invokes onTogglePillar when a pillar cell is clicked", async () => {
    const user = userEvent.setup();
    const onTogglePillar = vi.fn();

    render(
      <TraditionalGrid
        state={baseState()}
        collapsedPillars={Array(8).fill(false)}
        onTogglePillar={onTogglePillar}
        progressForDay={[]}
        onToggleTask={vi.fn()}
      />
    );

    await user.click(screen.getByText("Product"));
    expect(onTogglePillar).toHaveBeenCalledWith(0);
  });

  it("invokes onToggleTask with the task id and reflects completion state", async () => {
    const user = userEvent.setup();
    const onToggleTask = vi.fn();
    const taskId = getTaskId(0, 0);

    const { rerender } = render(
      <TraditionalGrid
        state={baseState()}
        collapsedPillars={Array(8).fill(false)}
        onTogglePillar={vi.fn()}
        progressForDay={[]}
        onToggleTask={onToggleTask}
      />
    );

    const taskCell = screen.getByText("Design UI");
    await user.click(taskCell);
    expect(onToggleTask).toHaveBeenCalledWith(taskId);

    rerender(
      <TraditionalGrid
        state={baseState()}
        collapsedPillars={Array(8).fill(false)}
        onTogglePillar={vi.fn()}
        progressForDay={[taskId]}
        onToggleTask={onToggleTask}
      />
    );

    expect(taskCell.closest(".traditional-cell")).toHaveClass("traditional-task-done");
  });
});

