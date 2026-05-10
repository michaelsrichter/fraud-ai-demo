import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfigPanel } from "../../src/components/ConfigPanel";

describe("ConfigPanel", () => {
  it("renders generate button and presets", () => {
    render(<ConfigPanel onGenerate={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: /generate/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Low" })).toBeInTheDocument();
  });

  it("shows config fields by default", () => {
    render(<ConfigPanel onGenerate={vi.fn()} />);
    expect(screen.getByText(/record count/i)).toBeInTheDocument();
    expect(screen.getByText(/fraud intensity/i)).toBeInTheDocument();
  });

  it("shows preset buttons", () => {
    render(<ConfigPanel onGenerate={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Low" })).toBeInTheDocument();
  });

  it("disables generate button when isGenerating", () => {
    render(<ConfigPanel onGenerate={vi.fn()} isGenerating={true} />);
    const buttons = screen.getAllByRole("button", { name: /generating/i });
    buttons.forEach(btn => expect(btn).toBeDisabled());
  });
});
