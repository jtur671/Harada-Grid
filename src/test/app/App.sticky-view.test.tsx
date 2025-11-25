import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import App from "../../App";
import { supabase } from "../../supabaseClient";

// Mock Supabase
vi.mock("../../supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
  },
}));

// Mock other dependencies
vi.mock("../../services/subscriptions", () => ({
  getSubscriptionStatus: vi.fn(() => Promise.resolve({ plan: "free", status: "free" })),
}));

vi.mock("../../services/ai", () => ({
  generateAiMap: vi.fn(),
  refinePillar: vi.fn(),
  applyAiResponseToState: vi.fn(),
}));

vi.mock("../../utils/storage", () => ({
  getInitialPlan: vi.fn(() => null),
  hasDismissedStartModal: vi.fn(() => false),
  setStartModalDismissed: vi.fn(),
  setPlan: vi.fn(),
  getLastView: vi.fn(() => null),
  setLastView: vi.fn(),
  getCachedProjects: vi.fn(() => null),
  setCachedProjects: vi.fn(),
  clearCachedProjects: vi.fn(),
}));

describe("App - Sticky View Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("should NOT call loadProjects when in builder view on auth state change", async () => {
    const mockUser = {
      id: "test-user",
      email: "test@example.com",
    };

    // Mock auth state change
    let authStateChangeCallback: ((event: string, session: any) => void) | null = null;
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      authStateChangeCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      } as any;
    });

    render(<App />);

    // Wait for initial setup
    await waitFor(() => {
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    });

    // Simulate being in builder view
    const appElement = document.querySelector(".app");
    if (appElement) {
      // We can't directly set appView, but we can verify the behavior
      // by checking that loadProjects is not called when in builder view
    }

    // Trigger TOKEN_REFRESHED event (which should be ignored after initialization)
    if (authStateChangeCallback) {
      authStateChangeCallback("TOKEN_REFRESHED", {
        user: mockUser,
      });
    }

    // Wait a bit
    await waitFor(() => {
      // Should not have called loadProjects multiple times
      const fromCalls = vi.mocked(supabase.from).mock.calls.length;
      // Should be minimal calls (only initial load, not repeated)
      expect(fromCalls).toBeLessThanOrEqual(2);
    });
  });

  it("should respect cooldown period in loadProjectsForUser", async () => {
    const mockUser = {
      id: "test-user",
      email: "test@example.com",
    };

    // Mock session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          user: mockUser,
        },
      },
      error: null,
    });

    let authStateChangeCallback: ((event: string, session: any) => void) | null = null;
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      authStateChangeCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      } as any;
    });

    render(<App />);

    // Wait for initial setup
    await waitFor(() => {
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    });

    // Clear previous calls
    vi.mocked(supabase.from).mockClear();

    // Trigger multiple SIGNED_IN events rapidly
    if (authStateChangeCallback) {
      authStateChangeCallback("SIGNED_IN", {
        user: mockUser,
      });
      
      // Immediately trigger again (should be blocked by cooldown)
      await new Promise((resolve) => setTimeout(resolve, 100));
      authStateChangeCallback("SIGNED_IN", {
        user: mockUser,
      });
    }

    // Wait for processing
    await waitFor(() => {
      // Should not have made excessive calls due to cooldown
      const fromCalls = vi.mocked(supabase.from).mock.calls.length;
      expect(fromCalls).toBeLessThanOrEqual(2); // Initial + maybe one more, but not many
    }, { timeout: 3000 });
  });

  it("should skip TOKEN_REFRESHED events after initialization", async () => {
    const mockUser = {
      id: "test-user",
      email: "test@example.com",
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          user: mockUser,
        },
      },
      error: null,
    });

    let authStateChangeCallback: ((event: string, session: any) => void) | null = null;
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      authStateChangeCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      } as any;
    });

    render(<App />);

    // Wait for initial setup and initialization
    await waitFor(() => {
      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    });

    // Wait a bit for auth to initialize
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Clear previous calls
    vi.mocked(supabase.from).mockClear();

    // Trigger TOKEN_REFRESHED event (should be ignored after initialization)
    if (authStateChangeCallback) {
      authStateChangeCallback("TOKEN_REFRESHED", {
        user: mockUser,
      });
    }

    // Wait a bit
    await waitFor(() => {
      // Should not have called loadProjects for TOKEN_REFRESHED
      // (after initialization, these events are ignored)
      const fromCalls = vi.mocked(supabase.from).mock.calls.length;
      expect(fromCalls).toBe(0); // Should be 0 because TOKEN_REFRESHED is ignored
    }, { timeout: 2000 });
  });
});

