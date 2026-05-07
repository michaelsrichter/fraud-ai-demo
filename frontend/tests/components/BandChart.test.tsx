import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BandChart } from "../../src/components/BandChart";

describe("BandChart", () => {
  it("renders empty state when all bands are 0", () => {
    render(<BandChart counts={{ high: 0, medium: 0, low: 0 }} />);
    expect(screen.getByText(/no detection data/i)).toBeInTheDocument();
  });

  it("does not show empty state when counts are non-zero", () => {
    render(<BandChart counts={{ high: 10, medium: 20, low: 70 }} />);
    expect(screen.queryByText(/no detection data/i)).not.toBeInTheDocument();
  });
});
