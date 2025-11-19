type ResetModalProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

export const ResetModal: React.FC<ResetModalProps> = ({
  onCancel,
  onConfirm,
}) => (
  <div className="modal-backdrop" onClick={onCancel}>
    <div
      className="modal"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <h3 className="modal-title">Reset everything?</h3>
      <p className="modal-subtitle">
        This will clear your main goal, all pillars, all actions, all daily
        diary entries, and all completion history. This cannot be undone.
      </p>
      <div className="modal-footer">
        <button type="button" className="modal-close-btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="reset-confirm-btn" onClick={onConfirm}>
          Yes, reset everything
        </button>
      </div>
    </div>
  </div>
);

