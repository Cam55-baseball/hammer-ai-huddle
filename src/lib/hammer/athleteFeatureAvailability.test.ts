import { expect, it } from "vitest";
import { GAME_IQ_AVAILABLE_TO_ATHLETES } from "./athleteFeatureAvailability";

it("keeps owner-authorized athlete Game IQ available", () => {
  expect(GAME_IQ_AVAILABLE_TO_ATHLETES).toBe(true);
});