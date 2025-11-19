type AiHelperModalProps = {
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onGenerate: () => void;
};

export const AiHelperModal: React.FC<AiHelperModalProps> = ({
  value,
  onChange,
  onCancel,
  onGenerate,
}) => (
  <div className="modal-backdrop" onClick={onCancel}>
    <div
      className="modal"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <h3 className="modal-title">AI Goal Helper</h3>
      <p className="modal-subtitle">
        Tell the AI your main goal and it will suggest 8 pillars and 8 actions
        each to fill your Harada grid.
      </p>
      <textarea
        className="ai-goal-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Example: Run a full marathon by November, feeling strong and injury-free."
      />
      <div className="modal-footer">
        <button type="button" className="modal-close-btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="ai-generate-btn"
          onClick={onGenerate}
          disabled={!value.trim()}
        >
          Generate with AI
        </button>
      </div>
    </div>
  </div>
);

