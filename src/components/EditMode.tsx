import type { HaradaState } from "../types";

type EditModeProps = {
  state: HaradaState;
  activePillar: number;
  onSelectPillar: (index: number) => void;
  onGoalChange: (value: string) => void;
  onPillarChange: (index: number, value: string) => void;
  onTaskChange: (
    pillarIndex: number,
    taskIndex: number,
    value: string
  ) => void;
};

export const EditMode: React.FC<EditModeProps> = ({
  state,
  activePillar,
  onSelectPillar,
  onGoalChange,
  onPillarChange,
  onTaskChange,
}) => (
  <>
    <div className="goal-map">
      <div className="goal-center-card">
        <div className="goal-label">Main Goal</div>
        <textarea
          className="goal-input"
          value={state.goal}
          onChange={(e) => onGoalChange(e.target.value)}
          placeholder="Run a marathon, write a book, change careers…"
        />
      </div>

      <div className="pillar-grid">
        {state.pillars.map((pillar, index) => (
          <button
            key={index}
            type="button"
            className={
              "pillar-card" +
              (activePillar === index ? " pillar-card-active" : "")
            }
            onClick={() => onSelectPillar(index)}
          >
            <span className="pillar-card-index">{index + 1}</span>
            <span className="pillar-card-name">
              {pillar || `Pillar ${index + 1}`}
            </span>
          </button>
        ))}
      </div>
    </div>

    <div className="pillar-detail">
      <div className="pillar-detail-header">
        <div className="pillar-detail-label">Selected Pillar</div>
        <input
          className="pillar-name-input"
          value={state.pillars[activePillar] || ""}
          onChange={(e) => onPillarChange(activePillar, e.target.value)}
          placeholder={`Pillar ${activePillar + 1}`}
        />
        <span className="pillar-detail-meta">8 actions</span>
      </div>

      <div className="tasks-grid">
        {state.tasks[activePillar].map((task, tIndex) => (
          <div key={tIndex} className="task-card">
            <span className="task-number">{tIndex + 1}</span>
            <textarea
              className="task-input"
              value={task}
              onChange={(e) => onTaskChange(activePillar, tIndex, e.target.value)}
              placeholder={`Action ${tIndex + 1}`}
            />
          </div>
        ))}
      </div>
    </div>
  </>
);

