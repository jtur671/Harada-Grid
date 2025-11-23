import React from "react";

type ProjectSummary = {
  id: string;
  title: string | null;
  goal?: string | null;
  updated_at?: string;
};

type MiniDashboardProps = {
  projects: ProjectSummary[];
  currentProjectId: string | null;
  onSelectProject: (id: string) => void;
  onNewMap?: () => void;
};

export const MiniDashboard: React.FC<MiniDashboardProps> = ({
  projects,
  currentProjectId,
  onSelectProject,
  onNewMap,
}) => {
  const [isOpen, setIsOpen] = React.useState(true);

  const currentProject = currentProjectId
    ? projects.find((p) => p.id === currentProjectId)
    : null;

  return (
    <aside
      className={`mini-dashboard ${isOpen ? "mini-dashboard-open" : "mini-dashboard-collapsed"}`}
    >
      <button
        type="button"
        className="mini-dashboard-toggle"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        {isOpen ? "‹" : "›"}
      </button>

      {isOpen ? (
        <div className="mini-dashboard-body">
          <div className="mini-dashboard-header">
            <div>
              <div className="mini-dashboard-label">Your maps</div>
              <div className="mini-dashboard-count">
                {projects.length === 0
                  ? "No maps yet"
                  : `${projects.length} map${projects.length === 1 ? "" : "s"}`}
              </div>
            </div>

            {onNewMap && (
              <button
                type="button"
                className="mini-dashboard-new"
                onClick={(e) => {
                  e.stopPropagation();
                  onNewMap();
                }}
              >
                + New
              </button>
            )}
          </div>

          <div className="mini-dashboard-list">
            {projects.length === 0 ? (
              <p className="mini-dashboard-empty">
                Start a new Action Map to see it here.
              </p>
            ) : (
              projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={
                    "mini-dashboard-item" +
                    (p.id === currentProjectId ? " mini-dashboard-item-active" : "")
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProject(p.id);
                  }}
                >
                  <div className="mini-dashboard-item-title">
                    {p.title || "Action Map"}
                  </div>
                  {p.goal && (
                    <div className="mini-dashboard-item-goal" title={p.goal}>
                      {p.goal}
                    </div>
                  )}
                  {p.updated_at && (
                    <div className="mini-dashboard-item-meta">
                      {new Date(p.updated_at).toLocaleDateString()}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="mini-dashboard-collapsed-content">
          {currentProjectId && currentProject ? (
            <button
              type="button"
              className="mini-dashboard-icon"
              onClick={() => setIsOpen(true)}
              title={currentProject.title || "Action Map"}
            >
              <div className="mini-dashboard-icon-text">
                {(() => {
                  const title = currentProject.title || "Action Map";
                  const words = title.split(" ");
                  const letters = words.map((word) => word[0]).join("").toUpperCase();
                  // Extract trailing number if present
                  const match = title.match(/(\d+)$/);
                  const number = match ? match[1] : "";
                  // Take first 2 letters + number, or first 3 characters
                  return number ? letters.slice(0, 2) + number : letters.slice(0, 3);
                })()}
              </div>
            </button>
          ) : (
            <div className="mini-dashboard-icon-placeholder" />
          )}
          {onNewMap && (
            <button
              type="button"
              className="mini-dashboard-new-collapsed"
              onClick={(e) => {
                e.stopPropagation();
                onNewMap();
              }}
              title="New map"
            >
              +
            </button>
          )}
        </div>
      )}
    </aside>
  );
};

