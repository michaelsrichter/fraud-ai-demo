import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ModeTabBar } from "../../src/components/ModeTabBar";

describe("ModeTabBar", () => {
  it("renders all 4 mode tabs", () => {
    render(<ModeTabBar activeMode="single" onModeChange={() => {}} />);

    expect(screen.getByText("Single Agent")).toBeInTheDocument();
    expect(screen.getByText("Consensus")).toBeInTheDocument();
    expect(screen.getByText("Debate")).toBeInTheDocument();
    expect(screen.getByText("Junior → Senior")).toBeInTheDocument();
  });

  it("fires onModeChange when a tab is clicked", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();

    render(<ModeTabBar activeMode="single" onModeChange={onModeChange} />);

    await user.click(screen.getByText("Debate"));
    expect(onModeChange).toHaveBeenCalledWith("debate");

    await user.click(screen.getByText("Consensus"));
    expect(onModeChange).toHaveBeenCalledWith("consensus");
  });

  it("visually highlights the active tab with a border", () => {
    const { rerender } = render(<ModeTabBar activeMode="debate" onModeChange={() => {}} />);

    const debateButton = screen.getByText("Debate").closest("button")!;
    // Active tab should have a colored border (not the default --border)
    expect(debateButton.style.border).not.toContain("var(--border)");

    rerender(<ModeTabBar activeMode="junior-senior" onModeChange={() => {}} />);
    const jsButton = screen.getByText("Junior → Senior").closest("button")!;
    expect(jsButton.style.border).not.toContain("var(--border)");
  });
});
