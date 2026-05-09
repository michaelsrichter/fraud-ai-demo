import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfigPanel } from "../../src/components/ConfigPanel";

describe("ConfigPanel", () => {
  it("renders generate button and presets", () => {
    render(<ConfigPanel onGenerate={vi.fn()} />);
    expect(screen.getByRole("button", { name: /generate/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Low" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show configuration/i })).toBeInTheDocument();
  });

  it("shows config fields after expanding", async () => {
    render(<ConfigPanel onGenerate={vi.fn()} />);
    // Fields are hidden by default
    expect(screen.queryByText(/record count/i)).not.toBeInTheDocument();
    // Click to expand
    await screen.getByRole("button", { name: /show configuration/i }).click();
    expect(screen.getByText(/record count/i)).toBeInTheDocument();
    expect(screen.getByText(/intensity/i)).toBeInTheDocument();
  });

  it("shows preset buttons", () => {
    render(<ConfigPanel onGenerate={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Low" })).toBeInTheDocument();
  });

  it("disables generate button when isGenerating", () => {
    render(<ConfigPanel onGenerate={vi.fn()} isGenerating={true} />);
    expect(screen.getByRole("button", { name: /generating/i })).toBeDisabled();
  });
});
