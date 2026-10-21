import { describe, expect, it } from "vitest";
import { swapV2Allowed } from "../../supabase/functions/_shared/swapV2Access";

const off = { feature_key: "swap_v2", mode: "off", allowlist: ["test-player"], updated_by: "owner" };
describe("owner's Swap release gate", () => {
  it("OFF denies an ordinary signed-in player", () => expect(swapV2Allowed(off, "ordinary-player")).toBe(false));
  it("OFF permits an active owner or admin", () => expect(swapV2Allowed(off, "owner", true)).toBe(true));
  it("OFF permits only named TEST exceptions", () => expect(swapV2Allowed(off, "test-player")).toBe(true));
  it("a missing switch denies even staff", () => expect(swapV2Allowed(null, "owner", true)).toBe(false));
  it("signed-out callers are denied", () => expect(swapV2Allowed(off, null, true)).toBe(false));
});