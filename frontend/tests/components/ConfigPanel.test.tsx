import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfigPanel } from "../../src/components/ConfigPanel";

describe("ConfigPanel", () => {
  it("renders all controls", () => {
    render(<ConfigPanel onGenerate={vi.fn()} />);
    expect(screen.getByText(/record count/i)).toBeInTheDocument();
    expect(screen.getByText(/intensity/i)).toBeInTheDocument();
    expect(screen.getByText(/threshold gaming/i)).toBeInTheDocument();
    expect(screen.getByText(/unusual frequency/i)).toBeInTheDocument();
    expect(screen.getByText(/vendor anomaly/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate/i })).toBeInTheDocument();
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
