import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { DashboardPage } from "./DashboardPage";
import type { User } from "@supabase/supabase-js";

// Mock Supabase
const mockDelete = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("../supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      delete: vi.fn(() => ({
        eq: mockEq,
      })),
    })),
  },
}));

// Mock user
const mockUser: User = {
  id: "user-123",
  email: "test@example.com",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00Z",
} as User;

// Mock projects data
const mockProjects = [
  {
    id: "project-1",
    title: "My First Map",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "project-2",
    title: "Career Goals",
    updated_at: "2024-01-20T14:30:00Z",
  },
  {
    id: "project-3",
    title: "Health & Fitness",
    updated_at: "2024-01-25T09:15:00Z",
  },
];

describe("DashboardPage - Delete Functionality", () => {
  const mockOnSetState = vi.fn();
  const mockOnSetViewMode = vi.fn();
  const mockOnSetStartModalOpen = vi.fn();
  const mockOnSetAppView = vi.fn();
  const mockOnSetAuthView = vi.fn();
  const mockOnSetCurrentProjectId = vi.fn();
  const mockOnDeleteProject = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.confirm
    window.confirm = vi.fn(() => true);
  });

  it("renders delete buttons for each project", () => {
    render(
      <DashboardPage
        projects={mockProjects}
        user={mockUser}
        isAdmin={false}
        authView={null}
        onSetState={mockOnSetState}
        onSetViewMode={mockOnSetViewMode}
        onSetStartModalOpen={mockOnSetStartModalOpen}
        onSetAppView={mockOnSetAppView}
        onSetAuthView={mockOnSetAuthView}
        onSetCurrentProjectId={mockOnSetCurrentProjectId}
        onDeleteProject={mockOnDeleteProject}
      />
    );

    const deleteButtons = screen.getAllByLabelText("Delete map");
    expect(deleteButtons).toHaveLength(mockProjects.length);
  });

  it("calls onDeleteProject when delete button is clicked and confirmed", async () => {
    const user = userEvent.setup();
    window.confirm = vi.fn(() => true);

    render(
      <DashboardPage
        projects={mockProjects}
        user={mockUser}
        isAdmin={false}
        authView={null}
        onSetState={mockOnSetState}
        onSetViewMode={mockOnSetViewMode}
        onSetStartModalOpen={mockOnSetStartModalOpen}
        onSetAppView={mockOnSetAppView}
        onSetAuthView={mockOnSetAuthView}
        onSetCurrentProjectId={mockOnSetCurrentProjectId}
        onDeleteProject={mockOnDeleteProject}
      />
    );

    const deleteButtons = screen.getAllByLabelText("Delete map");
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to delete this map?"
    );
    expect(mockOnDeleteProject).toHaveBeenCalledWith("project-1");
  });

  it("does not call onDeleteProject when user cancels confirmation", async () => {
    const user = userEvent.setup();
    window.confirm = vi.fn(() => false);

    render(
      <DashboardPage
        projects={mockProjects}
        user={mockUser}
        isAdmin={false}
        authView={null}
        onSetState={mockOnSetState}
        onSetViewMode={mockOnSetViewMode}
        onSetStartModalOpen={mockOnSetStartModalOpen}
        onSetAppView={mockOnSetAppView}
        onSetAuthView={mockOnSetAuthView}
        onSetCurrentProjectId={mockOnSetCurrentProjectId}
        onDeleteProject={mockOnDeleteProject}
      />
    );

    const deleteButtons = screen.getAllByLabelText("Delete map");
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockOnDeleteProject).not.toHaveBeenCalled();
  });

  it("does not trigger project open when delete button is clicked", async () => {
    const user = userEvent.setup();
    window.confirm = vi.fn(() => true);

    render(
      <DashboardPage
        projects={mockProjects}
        user={mockUser}
        isAdmin={false}
        authView={null}
        onSetState={mockOnSetState}
        onSetViewMode={mockOnSetViewMode}
        onSetStartModalOpen={mockOnSetStartModalOpen}
        onSetAppView={mockOnSetAppView}
        onSetAuthView={mockOnSetAuthView}
        onSetCurrentProjectId={mockOnSetCurrentProjectId}
        onDeleteProject={mockOnDeleteProject}
      />
    );

    const deleteButtons = screen.getAllByLabelText("Delete map");
    await user.click(deleteButtons[1]);

    // Should not call onSetAppView (which would open the project)
    expect(mockOnSetAppView).not.toHaveBeenCalled();
    expect(mockOnDeleteProject).toHaveBeenCalledWith("project-2");
  });

  it("renders all project titles correctly", () => {
    render(
      <DashboardPage
        projects={mockProjects}
        user={mockUser}
        isAdmin={false}
        authView={null}
        onSetState={mockOnSetState}
        onSetViewMode={mockOnSetViewMode}
        onSetStartModalOpen={mockOnSetStartModalOpen}
        onSetAppView={mockOnSetAppView}
        onSetAuthView={mockOnSetAuthView}
        onSetCurrentProjectId={mockOnSetCurrentProjectId}
        onDeleteProject={mockOnDeleteProject}
      />
    );

    expect(screen.getByText("My First Map")).toBeInTheDocument();
    expect(screen.getByText("Career Goals")).toBeInTheDocument();
    expect(screen.getByText("Health & Fitness")).toBeInTheDocument();
  });

  it("shows empty state when no projects", () => {
    render(
      <DashboardPage
        projects={[]}
        user={mockUser}
        isAdmin={false}
        authView={null}
        onSetState={mockOnSetState}
        onSetViewMode={mockOnSetViewMode}
        onSetStartModalOpen={mockOnSetStartModalOpen}
        onSetAppView={mockOnSetAppView}
        onSetAuthView={mockOnSetAuthView}
        onSetCurrentProjectId={mockOnSetCurrentProjectId}
        onDeleteProject={mockOnDeleteProject}
      />
    );

    expect(
      screen.getByText(/You don't have any saved maps yet/i)
    ).toBeInTheDocument();
  });
});

