import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TemplateModal } from "./TemplateModal";
import type { Template } from "../templates";

const sampleTemplates: Template[] = [
  {
    id: "sample",
    name: "Sample Template",
    description: "Test description",
    goal: "Goal",
    pillars: Array(8).fill("Pillar") as string[],
    tasks: Array(8)
      .fill(null)
      .map(() => Array(8).fill("")),
  },
];

describe("TemplateModal", () => {
  it("calls onApply with the selected template", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <TemplateModal templates={sampleTemplates} onClose={vi.fn()} onApply={onApply} />
    );

    await user.click(screen.getByRole("button", { name: /sample template/i }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(sampleTemplates[0]);
  });

  it("triggers onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <TemplateModal templates={sampleTemplates} onClose={onClose} onApply={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

