import { expect, it } from "vitest";
import { saveBeforeAssessmentNavigation } from "./draftFlush";
for (const action of ["Next", "Back", "Skip"]) it(`${action} waits for entered answers to save`, async () => {
  const events: string[] = [];
  expect(await saveBeforeAssessmentNavigation(async () => { events.push("saved"); return true; }, async () => { events.push(action); })).toBe(true);
  expect(events).toEqual(["saved", action]);
});
it("a refused draft save prevents assessment navigation", async () => {
  let navigated = false;
  expect(await saveBeforeAssessmentNavigation(async () => false, async () => { navigated = true; })).toBe(false);
  expect(navigated).toBe(false);
});