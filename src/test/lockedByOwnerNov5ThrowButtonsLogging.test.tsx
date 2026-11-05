import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LegacyDrillInlineLog } from "@/components/hammer/logging/LegacyDrillInlineLog";
import { showsThrowLogButton } from "@/lib/hammer/practiceWindow";

// locked by owner Nov 5: throwing-log button only on catch play; Defense and Pitching log on their own card.
const CATCH = ["Warm-up throws", "Catch play", "Build-up ladder", "Light catch", "Long toss", "Arm-strength day", "Owner catch-play drill"];
const DEFENSE = ["Double-play / quick-release rep", "Position throws", "Catch play"];
const PITCHING = ["Bullpen", "Mound work", "Circle work", "Outing", "Catch play"];
const dosage = "60ft x 10 throws, 90ft x 8 throws";
const show = (modality: string, name: string) =>
  render(<MemoryRouter><LegacyDrillInlineLog modality={modality} name={name} dosage={dosage} storageKey={`k-${modality}-${name}`} completed={false} onSave={() => {}} /></MemoryRouter>);

describe("locked by owner Nov 5: throwing-log button by purpose", () => {
  for (const name of DEFENSE) it(`no button on Defense: ${name}`, () => {
    expect(showsThrowLogButton("defense", name)).toBe(false);
    expect(show("defense", name).queryByTestId("throw-item-log-button")).toBeNull();
  });
  for (const name of PITCHING) it(`no button on Pitching: ${name}`, () => {
    expect(showsThrowLogButton("pitching", name)).toBe(false);
    expect(show("pitching", name).queryByTestId("throw-item-log-button")).toBeNull();
  });
  for (const modality of ["warmup", "throwing"]) for (const name of CATCH) it(`button on ${modality} catch play: ${name}`, () => {
    expect(showsThrowLogButton(modality, name)).toBe(true);
    expect(show(modality, name).getByTestId("throw-item-log-button")).toBeTruthy();
  });
  it("pitcher Throwing card never offers it for bullpen/mound work", () => {
    for (const name of ["Bullpen", "Mound session", "Circle work"]) expect(showsThrowLogButton("throwing", name)).toBe(false);
  });
});
