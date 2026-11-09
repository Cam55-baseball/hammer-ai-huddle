/** Owner Nov 9 (round 3): an impossible typed number shows the friendly note and can't be saved. */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WeightLogEntry } from "@/components/nutrition-hub/WeightLogEntry";
import { ImpossibleNumberNote } from "@/components/measure/ImpossibleNumberNote";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (_k: string, d?: string) => d ?? _k }) }));

describe("weight log entry screen", () => {
  it("an impossible weight shows the note and does not save", () => {
    const onSubmit = vi.fn(async () => ({}));
    const { container } = render(<WeightLogEntry onSubmit={onSubmit} />);
    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1734" } });
    expect(screen.getByTestId("impossible-number").textContent).toBe("That number doesn't look right — double-check it.");
    fireEvent.submit(container.querySelector("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
  });
  it("a normal weight shows no note and saves", () => {
    const onSubmit = vi.fn(async () => ({}));
    const { container } = render(<WeightLogEntry onSubmit={onSubmit} />);
    const input = container.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: "180" } });
    expect(screen.queryByTestId("impossible-number")).toBeNull();
    fireEvent.submit(container.querySelector("form")!);
    expect(onSubmit).toHaveBeenCalledWith(180, null, null, expect.any(String));
  });
});

describe("the note", () => {
  it("renders only when shown", () => {
    const { rerender } = render(<ImpossibleNumberNote show={false} />);
    expect(screen.queryByRole("alert")).toBeNull();
    rerender(<ImpossibleNumberNote show />);
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
