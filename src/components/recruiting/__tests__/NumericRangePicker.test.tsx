import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NumericRangePicker } from "../NumericRangePicker";
import { optionsForField } from "@/lib/recruiting/numericRanges";

const height = optionsForField("height_inches", "number")!;

function setup(min: number | null, max: number | null) {
  return render(
    <NumericRangePicker
      label="Minimum – maximum"
      options={height}
      min={min}
      max={max}
      onMinChange={vi.fn()}
      onMaxChange={vi.fn()}
      idPrefix="t"
    />,
  );
}

describe("NumericRangePicker", () => {
  it("renders two selects with a dash between them", () => {
    setup(null, null);
    expect(screen.getByLabelText("Minimum – maximum minimum")).toBeInTheDocument();
    expect(screen.getByLabelText("Minimum – maximum maximum")).toBeInTheDocument();
    expect(screen.getByText("–")).toBeInTheDocument();
  });

  it("shows the selected feet/inches values", () => {
    setup(72, 78);
    expect(screen.getByText("6'0\"")).toBeInTheDocument();
    expect(screen.getByText("6'6\"")).toBeInTheDocument();
  });

  it("warns when the range is backwards", () => {
    setup(78, 72);
    expect(screen.getByText(/minimum is above the maximum/i)).toBeInTheDocument();
  });
});
