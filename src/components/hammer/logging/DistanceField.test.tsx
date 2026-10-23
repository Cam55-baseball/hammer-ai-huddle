import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DistanceField } from "./DistanceField";
describe("broad jump feet and inches", () => {
  it("stores 5 feet 6 inches as 5.5 canonical feet", () => {
    const save = vi.fn(); render(<DistanceField label="Jump" value="5" onChange={save} />);
    fireEvent.change(screen.getByLabelText("Jump inches"), { target: { value: "6" } });
    expect(save).toHaveBeenLastCalledWith("5.5");
  });
});