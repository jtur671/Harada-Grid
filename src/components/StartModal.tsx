import React from "react";

type StartModalProps = {
  isOpen: boolean;
  onClose: () => void | Promise<void>;
  onFillYourself: () => void | Promise<void>;
  onUseAI: () => void | Promise<void>;
};

export const StartModal: React.FC<StartModalProps> = ({
  isOpen,
  onClose,
  onFillYourself,
  onUseAI,
}) => {
  if (!isOpen) return null;

  return (
    <div className="start-overlay" role="dialog" aria-modal="true">
      <div className="start-card">
        <h2 className="start-title">How do you want to start?</h2>
        <p className="start-subtitle">
          You&apos;re looking at the View mode right now. Choose how you want
          to build your first Action Map.
        </p>

        <div className="start-actions">
          <button
            type="button"
            className="start-btn-primary"
            onClick={onFillYourself}
          >
            Fill it out yourself
          </button>
          <button
            type="button"
            className="start-btn-secondary"
            onClick={onUseAI}
          >
            Use AI to create my board
          </button>
        </div>

        <button type="button" className="start-skip" onClick={onClose}>
          Skip for now
        </button>
      </div>
    </div>
  );
};

