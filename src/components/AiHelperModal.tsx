type AiHelperModalProps = {
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
};

export const AiHelperModal: React.FC<AiHelperModalProps> = ({
  value,
  onChange,
  onCancel,
  onGenerate,
  isGenerating,
}) => {
  const titleId = "ai-helper-title";
  const descriptionId = "ai-helper-description";
  const textareaId = "ai-goal-textarea";

  return (
    <div
      className="modal-backdrop"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div
        className="modal"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <h3 id={titleId} className="modal-title">
          AI Goal Helper
        </h3>
        <p id={descriptionId} className="modal-subtitle">
          Tell the AI your main goal and it will suggest 8 pillars and 8 actions
          each to fill your Harada grid.
        </p>
        <label htmlFor={textareaId} className="sr-only">
          Enter your main goal
        </label>
        <textarea
          id={textareaId}
          className="ai-goal-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Example: Run a full marathon by November, feeling strong and injury-free."
          aria-label="Enter your main goal for AI generation"
          disabled={isGenerating}
        />
        {isGenerating ? (
          <div className="ai-loading-container">
            <div className="ai-loading-spinner">
              <div className="ai-spinner-ring"></div>
              <div className="ai-spinner-ring"></div>
              <div className="ai-spinner-ring"></div>
            </div>
            <p className="ai-loading-text">AI is crafting your action map...</p>
            <p className="ai-loading-subtext">This usually takes about 20 seconds</p>
          </div>
        ) : (
          <div className="modal-footer">
            <button
              type="button"
              className="modal-close-btn"
              onClick={onCancel}
              data-testid="ai-helper-cancel"
            >
              Cancel
            </button>
            <button
              type="button"
              className="ai-generate-btn"
              onClick={onGenerate}
              disabled={!value.trim()}
              data-testid="ai-helper-generate"
            >
              Generate with AI
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

