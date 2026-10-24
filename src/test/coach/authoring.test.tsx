import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoachExerciseAuthoring } from "@/components/custom-activities/CoachExerciseAuthoring";
import type { Exercise } from "@/types/customActivity";
vi.mock("@/hooks/useWorkoutCatalog", () => ({ useWorkoutCatalog: () => ({ data: [{ id: "catalog", slug: "catalog_drill", name: "Reviewed drill", default_sets: 2, default_reps: 8, dosage_unit: "total_reps", equipment: ["bat"], equipment_requirements: ["net"], equipment_alternatives: [["tee", "baseballs"], ["partner"]] }], isLoading: false, error: null }) }));
function Editor({ changed }: { changed: (rows: Exercise[]) => void }) {
  const [rows, setRows] = useState<Exercise[]>([]);
  return <CoachExerciseAuthoring exercises={rows} onChange={value => { changed(value); setRows(value); }} />;
}
afterEach(cleanup);
describe("coach authoring preserves declared catalog metadata", () => {
  it("keeps exact catalog identity, dose, measure and complete gear alternatives", () => {
    const changed = vi.fn(); render(<Editor changed={changed} />);
    fireEvent.change(screen.getByRole("combobox", { name: "Exercise Vault item" }), { target: { value: "catalog_drill" } });
    fireEvent.click(screen.getByRole("button", { name: "Add selected" }));
    expect(changed.mock.lastCall?.[0][0]).toMatchObject({ slug: "catalog_drill", sets: 2, reps: 8, dosage_unit: "total_reps", equipment_requirements: ["bat", "net"], equipment_alternatives: [["tee", "baseballs"], ["partner"]] });
    expect((screen.getByRole("combobox", { name: "Measure for Reviewed drill" }) as HTMLSelectElement).value).toBe("total_reps");
  });
  it("maps own-item common gear and preserves unknown words for review", () => {
    const changed = vi.fn(); render(<Editor changed={changed} />);
    fireEvent.click(screen.getByRole("button", { name: "My own item" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Exercise name" }), { target: { value: "Coach drill" } });
    fireEvent.change(screen.getByLabelText("Gear"), { target: { value: "dumbbells, field space, mystery gear" } });
    expect(changed.mock.lastCall?.[0][0].equipment_requirements).toEqual(["dumbbell", "open_field", "mystery gear"]);
    expect(changed.mock.lastCall?.[0][0].slug).toBeUndefined();
  });
});