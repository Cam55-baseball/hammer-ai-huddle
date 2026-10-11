import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExerciseDisclosure } from "../ExerciseDisclosure";
import { ExerciseInstructions } from "../ExerciseInstructions";
import { Input } from "@/components/ui/input";
import { OptionalSurvey } from "../../logging/OptionalSurvey";
import { ReleaseCountdown } from "../ReleaseCountdown";

describe("exercise interaction", () => {
  it("shows the exact midnight notice with no build status or countdown", () => {
    const { container } = render(<ReleaseCountdown />);
    expect(container.textContent).toBe("Tomorrow's plan becomes visible at midnight");
  });
  it("opens and closes optional survey fields after the effort question", () => {
    render(<><label>How hard 1–10<Input aria-label="How hard 1–10" /></label><OptionalSurvey><Input aria-label="Survey notes" /></OptionalSurvey></>);
    const toggle = screen.getByRole("button", { name: "Survey (optional)" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByLabelText("Survey notes")).toBeTruthy();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });
  it("opens and closes independently without losing a draft or sticking after nested drawer taps", () => {
    render(<>{["Repeated 90-Foot Sprints", "Cable hip snap"].map((name) => <ExerciseDisclosure key={name} name={name}>
      <Input aria-label={`${name} draft`} defaultValue="1" />
      <ExerciseInstructions name={name} />
    </ExerciseDisclosure>)}</>);
    for (const name of ["Repeated 90-Foot Sprints", "Cable hip snap"]) {
      const toggle = screen.getByRole("button", { name });
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      fireEvent.click(toggle);
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      fireEvent.change(screen.getByLabelText(`${name} draft`), { target: { value: "7" } });
      const drawer = screen.getByRole("button", { name: "How to do it" });
      fireEvent.click(drawer);
      expect(drawer.getAttribute("aria-expanded")).toBe("true");
      fireEvent.click(drawer);
      expect(drawer.getAttribute("aria-expanded")).toBe("false");
      fireEvent.click(toggle);
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      fireEvent.click(toggle);
      expect((screen.getByLabelText(`${name} draft`) as HTMLInputElement).value).toBe("7");
      fireEvent.click(toggle);
    }
  });
});