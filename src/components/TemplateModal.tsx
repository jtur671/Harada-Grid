import type { Template } from "../templates";

type TemplateModalProps = {
  templates: Template[];
  onClose: () => void;
  onApply: (template: Template) => void;
};

export const TemplateModal: React.FC<TemplateModalProps> = ({
  templates,
  onClose,
  onApply,
}) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div
      className="modal"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <h3 className="modal-title">Start from a template</h3>
      <p className="modal-subtitle">
        Applying a template will overwrite your current goal, pillars, and
        actions. Diary entries and daily check history stay.
      </p>
      <div className="template-list">
        {templates.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            className="template-card-btn"
            onClick={() => onApply(tpl)}
          >
            <div className="template-card-name">{tpl.name}</div>
            <div className="template-card-desc">{tpl.description}</div>
          </button>
        ))}
      </div>
      <div className="modal-footer">
        <button type="button" className="modal-close-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  </div>
);

