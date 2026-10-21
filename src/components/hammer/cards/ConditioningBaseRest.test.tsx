import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConditioningBaseRest } from "./ConditioningBaseRest";
afterEach(cleanup);
describe("base-running rest counter", () => {
  it("two prescribed doubles reach home, reset the counter and switch 30s to 300s", () => {
    render(<ConditioningBaseRest basesPerRep={2} />);
    fireEvent.click(screen.getByRole("button", { name: "Finished this running rep" }));
    expect(screen.getByText(/Base count: 2 of 4/)).toBeVisible();
    expect(screen.getByText("Rest between reps time (0:30):")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Finished this running rep" }));
    expect(screen.getByText(/Base count: 0 of 4 — home reached/)).toBeVisible();
    expect(screen.getByText("Rest at home plate time (5:00):")).toBeVisible();
  });
});