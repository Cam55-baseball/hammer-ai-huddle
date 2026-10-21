import { describe, it, expect } from "vitest";
import { excludeTestAdmin, TEST_ADMIN_PROOF_ID } from "./testAdminExclusion";

describe("owner-authorized proof administrator exclusion", () => {
  it("excludes the exact proof profile but retains ordinary system demo athletes", () => {
    expect(excludeTestAdmin([{ id: TEST_ADMIN_PROOF_ID }, { id: "demo-player", is_system_account: true }]))
      .toEqual([{ id: "demo-player", is_system_account: true }]);
  });
  it("excludes proof role and subscription rows before counting", () => {
    expect(excludeTestAdmin([{ user_id: TEST_ADMIN_PROOF_ID }, { user_id: "real-player" }]))
      .toEqual([{ user_id: "real-player" }]);
  });
});