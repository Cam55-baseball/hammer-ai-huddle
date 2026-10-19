import { expect, it } from "vitest";
import { GAME_IQ_AVAILABLE_TO_ATHLETES, gameIqVisible } from "./athleteFeatureAvailability";
import { canSeeReportCard } from "@/lib/reportCard/visibility";

it("keeps Game IQ off for athletes until the owner releases it", () => {
  expect(GAME_IQ_AVAILABLE_TO_ATHLETES).toBe(false);
});

it("shows Game IQ only to owner and admin", () => {
  expect(gameIqVisible({ isOwner: true, isAdmin: false })).toBe(true);
  expect(gameIqVisible({ isOwner: false, isAdmin: true })).toBe(true);
  expect(gameIqVisible({ isOwner: false, isAdmin: false })).toBe(false);
});

it("shows the Report Card only to owner and admin", () => {
  expect(canSeeReportCard({ isOwner: true, isAdmin: false })).toBe(true);
  expect(canSeeReportCard({ isOwner: false, isAdmin: true })).toBe(true);
  expect(canSeeReportCard({ isOwner: false, isAdmin: false })).toBe(false);
});
