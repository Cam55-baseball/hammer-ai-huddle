import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { OWNER_POSITION_ONLY_USER_ID, ownerPositionOnly } from "./ownerPositionException";

describe("owner-only position-player exception", () => {
  it("applies to the owner Cam Williams account", () => {
    expect(ownerPositionOnly("95de827d-7418-460b-8b79-267bf79bdca4")).toBe(true);
  });
  it("does not apply to any other account, including other owners", () => {
    for (const id of [null, undefined, "", "95de827d", "95DE827D-7418-460B-8B79-267BF79BDCA4", "00000000-0000-0000-0000-000000000000", OWNER_POSITION_ONLY_USER_ID + " "]) {
      expect(ownerPositionOnly(id as string)).toBe(false);
    }
  });
  it("the generator uses the exception to force a position schedule", () => {
    const src = readFileSync("supabase/functions/wk-generate-daily/index.ts", "utf8");
    expect(src).toMatch(/ownerPositionOnly\(user\.id\)/);
  });
});
