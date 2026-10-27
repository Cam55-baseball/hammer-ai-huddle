import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import { MovementScreenForm } from "./MovementScreenForm";
import type { MovementScreen } from "@/lib/assessment/movementScreen";
it("emits exact bilateral observations without filling the unmeasured side", () => {
  const change = vi.fn();
  render(<MovementScreenForm value={{}} onChange={change} onPain={() => {}} />);
  fireEvent.change(document.getElementById("shoulder_ir-left") as HTMLInputElement, { target: { value: "40" } });
  expect(change).toHaveBeenCalledWith({ version: 2, observations: { shoulder_ir: { left: "40" } } });
});
it("pain immediately requests help and survives an unrelated observation", () => {
  const pain = vi.fn();
  function Harness() {
    const [value, setValue] = useState<MovementScreen>({});
    return <MovementScreenForm value={value} onChange={setValue} onPain={pain} />;
  }
  render(<Harness />);
  fireEvent.click(screen.getAllByRole("button", { name: "0 · Pain — stop" })[0]);
  expect(pain).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alert")).toBeTruthy();
});