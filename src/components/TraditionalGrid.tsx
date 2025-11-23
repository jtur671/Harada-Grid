import React from "react";
import type { TraditionalGridProps, CellKind } from "../types";
import { GRID_SIZE, BLOCK_TO_PILLAR_INDEX, TASK_OFFSET_INDEX, getTaskId } from "../utils/harada";

export const TraditionalGrid: React.FC<TraditionalGridProps> = ({
  state,
  collapsedPillars,
  onTogglePillar,
  progressForDay: _progressForDay, // Keep for type compatibility but use allCompletedTasks for display
  allCompletedTasks,
  onToggleTask,
}) => {
  const cells: CellKind[][] = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    const rowArr: CellKind[] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      let cell: CellKind = { type: "empty" };

      // Center cell = goal
      if (row === 4 && col === 4) {
        cell = { type: "goal" };
      } else if (row >= 3 && row <= 5 && col >= 3 && col <= 5) {
        // rest of central 3×3 is empty
        cell = { type: "empty" };
      } else {
        // Outer 3×3 blocks
        const blockRow = Math.floor(row / 3);
        const blockCol = Math.floor(col / 3);

        if (!(blockRow === 1 && blockCol === 1)) {
          const pillarIndex = BLOCK_TO_PILLAR_INDEX[`${blockRow}-${blockCol}`];

          if (pillarIndex != null) {
            const localRow = row - blockRow * 3;
            const localCol = col - blockCol * 3;

            if (localRow === 1 && localCol === 1) {
              // center of outer block = pillar cell (black)
              cell = { type: "pillar", pillarIndex };
            } else {
              // outer rim of block = actions
              const tIndex = TASK_OFFSET_INDEX[`${localRow}-${localCol}`] ?? 0;
              cell = { type: "task", pillarIndex, taskIndex: tIndex };
            }
          }
        }
      }

      rowArr.push(cell);
    }
    cells.push(rowArr);
  }

  return (
    <div className="traditional-wrapper">
      <div className="traditional-title">8 Pillars × 8 Actions = 64 Tasks</div>
      <div className="traditional-grid">
        {cells.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r}-${c}`;
            let className = "traditional-cell";
            let content: React.ReactNode = "";
            let onClick: (() => void) | undefined;

            if (cell.type === "goal") {
              className += " traditional-goal-cell";
              content =
                state.goal.trim() !== "" ? (
                  state.goal
                ) : (
                  <span className="placeholder">Main Goal</span>
                );
            } else if (cell.type === "pillar") {
              className += " traditional-pillar-cell";
              const label =
                state.pillars[cell.pillarIndex] ||
                `Pillar ${cell.pillarIndex + 1}`;
              content = label;
              onClick = () => onTogglePillar(cell.pillarIndex);
            } else if (cell.type === "task") {
              const collapsed = collapsedPillars[cell.pillarIndex];
              const taskId = getTaskId(cell.pillarIndex, cell.taskIndex);
              // Use allCompletedTasks so tasks from previous days still show as green
              const done = allCompletedTasks.includes(taskId);
              onClick = () => onToggleTask(taskId);


              if (collapsed) {
                // collapsed = whole block looks like pillar
                className += " traditional-pillar-cell";
                content = "";
              } else {
                className += " traditional-task-cell";
                if (done) {
                  className += " traditional-task-done";
                }
                const text =
                  state.tasks[cell.pillarIndex]?.[cell.taskIndex] ?? "";
                content =
                  text.trim() !== "" ? (
                    text
                  ) : (
                    <span className="placeholder">
                      Action {cell.taskIndex + 1}
                    </span>
                  );
                onClick = () => onToggleTask(taskId);
              }
            } else {
              className += " traditional-empty-cell";
            }

            return (
              <div key={key} className={className} onClick={onClick}>
                {content}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

