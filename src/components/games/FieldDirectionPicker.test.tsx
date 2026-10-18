import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FieldDirectionPicker } from "./FieldDirectionPicker";

describe("FieldDirectionPicker", () => {
  it("spots are reachable as buttons and Enter selects one", () => {
    const onChange = vi.fn();
    render(<FieldDirectionPicker value={null} onChange={onChange} />);
    const spots = screen.getAllByRole("button");
    expect(spots.length).toBeGreaterThan(0);
    fireEvent.keyDown(spots[0], { key: "Enter" });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).not.toBeNull();
  });
});
