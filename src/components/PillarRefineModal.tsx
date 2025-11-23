import React from "react";

type PillarRefineModalProps = {
  isOpen: boolean;
  currentPillar: string;
  goal: string;
  onClose: () => void;
  onSelect: (refinedPillar: string) => void;
  isGenerating: boolean;
  suggestions?: string[];
};

export const PillarRefineModal: React.FC<PillarRefineModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  isGenerating,
  suggestions = [],
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pillar-refine-title"
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="pillar-refine-title" className="modal-title">
          Refine Pillar with AI
        </h3>
        <p className="modal-subtitle">
          AI will suggest 5 alternative ideas for this pillar based on your main goal.
        </p>

        {isGenerating ? (
          <div className="ai-loading-container">
            <div className="ai-loading-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <p className="ai-loading-text">AI is generating suggestions...</p>
            <p className="ai-loading-subtext">This usually takes about 10 seconds</p>
          </div>
        ) : suggestions.length > 0 ? (
          <div className="pillar-suggestions-list">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                className="pillar-suggestion-card"
                onClick={() => {
                  onSelect(suggestion);
                  onClose();
                }}
              >
                <div className="pillar-suggestion-number">{index + 1}</div>
                <div className="pillar-suggestion-text">{suggestion}</div>
              </button>
            ))}
          </div>
        ) : null}

        <div className="modal-footer">
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

