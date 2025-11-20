import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import App from "./App";

vi.mock("./components/EditMode", () => ({
  EditMode: () => <div data-testid="edit-mode">Edit Mode</div>,
}));

vi.mock("./components/ViewMode", () => ({
  ViewMode: () => <div data-testid="view-mode">View Mode</div>,
}));

vi.mock("./supabaseClient", () => {
  const subscription = { unsubscribe: vi.fn() };

  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn().mockImplementation(() => ({
          data: { subscription },
        })),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
      },
      from: vi.fn().mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
  };
});

describe("App view toggles", () => {
  it("switches between Edit and View modes on the builder page", async () => {
    const user = userEvent.setup();
    render(<App />);

    const cta = await screen.findByRole("button", { name: /get started free/i });
    await user.click(cta);

    expect(await screen.findByTestId("edit-mode")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "View" }));
    expect(await screen.findByTestId("view-mode")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(await screen.findByTestId("edit-mode")).toBeInTheDocument();
  });
});

