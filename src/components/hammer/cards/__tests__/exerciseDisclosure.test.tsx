import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExerciseDisclosure } from "../ExerciseDisclosure";
import { ExerciseInstructions } from "../ExerciseInstructions";
import { Input } from "@/components/ui/input";

describe("exercise interaction", () => {
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