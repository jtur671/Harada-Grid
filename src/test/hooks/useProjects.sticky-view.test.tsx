import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useProjects } from "../../hooks/useProjects";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../supabaseClient";

// Mock Supabase
vi.mock("../../supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    })),
  },
}));

// Mock storage utilities
vi.mock("../../utils/storage", () => ({
  getCachedProjects: vi.fn(() => null),
  setCachedProjects: vi.fn(),
  clearCachedProjects: vi.fn(),
}));

describe("useProjects - Sticky View Logic", () => {
  const mockUser: User = {
    id: "test-user-id",
    email: "test@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;

  const mockOnViewChange = vi.fn();
  const mockOnViewModeChange = vi.fn();
  const mockOnStartModalChange = vi.fn();
  const mockHasDismissedStartModal = vi.fn(() => false);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("should NOT redirect when in builder view", async () => {
    const { result } = renderHook(() =>
      useProjects({
        user: mockUser,
        isPro: false,
        plan: "free",
        onViewChange: mockOnViewChange,
        onViewModeChange: mockOnViewModeChange,
        onStartModalChange: mockOnStartModalChange,
        hasDismissedStartModal: mockHasDismissedStartModal,
        currentAppView: "builder", // User is in builder view
      })
    );

    // Call loadProjects (which would normally redirect)
    await result.current.loadProjects(false);

    // Wait a bit for any async operations
    await waitFor(() => {
      expect(mockOnViewChange).not.toHaveBeenCalled();
    });
  });

  it("should NOT redirect when on pricing page", async () => {
    const { result } = renderHook(() =>
      useProjects({
        user: mockUser,
        isPro: false,
        plan: null,
        onViewChange: mockOnViewChange,
        onViewModeChange: mockOnViewModeChange,
        onStartModalChange: mockOnStartModalChange,
        hasDismissedStartModal: mockHasDismissedStartModal,
        currentAppView: "pricing", // User is on pricing page
      })
    );

    // Call loadProjects
    await result.current.loadProjects(false);

    // Should not redirect away from pricing
    await waitFor(() => {
      expect(mockOnViewChange).not.toHaveBeenCalled();
    });
  });

  it("should NOT redirect when user has a project open", async () => {
    const { result } = renderHook(() =>
      useProjects({
        user: mockUser,
        isPro: false,
        plan: "free",
        onViewChange: mockOnViewChange,
        onViewModeChange: mockOnViewModeChange,
        onStartModalChange: mockOnStartModalChange,
        hasDismissedStartModal: mockHasDismissedStartModal,
        currentAppView: "dashboard",
      })
    );

    // Set a current project ID (user has a project open)
    result.current.setCurrentProjectId("project-123");

    // Call loadProjects
    await result.current.loadProjects(false);

    // Should skip loading entirely when project is open
    await waitFor(() => {
      expect(mockOnViewChange).not.toHaveBeenCalled();
    });
  });

  it("should NOT redirect when preserveView is true", async () => {
    const { result } = renderHook(() =>
      useProjects({
        user: mockUser,
        isPro: false,
        plan: "free",
        onViewChange: mockOnViewChange,
        onViewModeChange: mockOnViewModeChange,
        onStartModalChange: mockOnStartModalChange,
        hasDismissedStartModal: mockHasDismissedStartModal,
        currentAppView: "dashboard",
      })
    );

    // Call loadProjects with preserveView = true
    await result.current.loadProjects(true);

    // Should not change view when preserveView is true
    await waitFor(() => {
      expect(mockOnViewChange).not.toHaveBeenCalled();
    });
  });

  it("should NOT redirect when user has existing projects", async () => {
    // Mock Supabase to return projects
    const mockProjects = [
      { id: "project-1", title: "Project 1", updated_at: new Date().toISOString(), state: null },
    ];

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: mockProjects,
            error: null,
          })),
        })),
      })),
    } as any);

    const { result } = renderHook(() =>
      useProjects({
        user: mockUser,
        isPro: false,
        plan: "free",
        onViewChange: mockOnViewChange,
        onViewModeChange: mockOnViewModeChange,
        onStartModalChange: mockOnStartModalChange,
        hasDismissedStartModal: mockHasDismissedStartModal,
        currentAppView: "dashboard",
      })
    );

    // Call loadProjects
    await result.current.loadProjects(false);

    // Should not redirect if user has projects (they know how to navigate)
    await waitFor(() => {
      expect(mockOnViewChange).not.toHaveBeenCalled();
    });
  });

  it("should respect cooldown period between loads", async () => {
    const { result } = renderHook(() =>
      useProjects({
        user: mockUser,
        isPro: false,
        plan: "free",
        onViewChange: mockOnViewChange,
        onViewModeChange: mockOnViewModeChange,
        onStartModalChange: mockOnStartModalChange,
        hasDismissedStartModal: mockHasDismissedStartModal,
        currentAppView: "dashboard",
      })
    );

    // First load
    await result.current.loadProjects(false);

    // Immediately try to load again (should be blocked by cooldown)
    await result.current.loadProjects(false);

    // Should only call Supabase once due to cooldown
    await waitFor(() => {
      const selectCalls = vi.mocked(supabase.from).mock.calls.length;
      // Should be called once (second call blocked by cooldown)
      expect(selectCalls).toBeLessThanOrEqual(1);
    });
  });

  it("should allow redirect for new user with no projects when NOT in builder/pricing", async () => {
    const { result } = renderHook(() =>
      useProjects({
        user: mockUser,
        isPro: false,
        plan: null, // No plan set
        onViewChange: mockOnViewChange,
        onViewModeChange: mockOnViewModeChange,
        onStartModalChange: mockOnStartModalChange,
        hasDismissedStartModal: mockHasDismissedStartModal,
        currentAppView: "home", // Not in builder or pricing
      })
    );

    // Call loadProjects for new user with no projects
    await result.current.loadProjects(false);

    // Should redirect to pricing (new user with no plan)
    await waitFor(() => {
      expect(mockOnViewChange).toHaveBeenCalledWith("pricing");
    });
  });

  it("should NOT redirect if just loaded recently (within 2 seconds)", async () => {
    const { result } = renderHook(() =>
      useProjects({
        user: mockUser,
        isPro: false,
        plan: "free",
        onViewChange: mockOnViewChange,
        onViewModeChange: mockOnViewModeChange,
        onStartModalChange: mockOnStartModalChange,
        hasDismissedStartModal: mockHasDismissedStartModal,
        currentAppView: "dashboard",
      })
    );

    // First load
    await result.current.loadProjects(false);

    // Wait a very short time (less than 2 seconds)
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Try to load again immediately
    await result.current.loadProjects(false);

    // Should not redirect if just loaded
    await waitFor(() => {
      // Should not have called onViewChange multiple times
      expect(mockOnViewChange).not.toHaveBeenCalled();
    });
  });
});

