import { expect, it } from "vitest";
import { canaryDelegationAllowed } from "../../../supabase/functions/_shared/analysisCanaryAuth";
const config = { video_id: "clip", owner_id: "owner", enabled: true, paused_reason: null, lease_id: "lease", lease_until: "2026-10-27T04:00:00Z" };
const request = { videoId: "clip", userId: "owner", leaseId: "lease" };
it("delegates only the exact configured clip under a live lease", () => {
  expect(canaryDelegationAllowed(config, request, Date.parse("2026-10-27T03:00:00Z"))).toBe(true);
  for (const invalid of [{ ...request, videoId: "other" }, { ...request, userId: "other" }, { ...request, leaseId: "other" }]) expect(canaryDelegationAllowed(config, invalid)).toBe(false);
});
it("never replays paused, disabled, missing or expired canaries", () => {
  for (const invalid of [null,{ ...config, enabled: false },{ ...config, paused_reason: "provider_denied" },{ ...config, lease_until: "2000-01-01" }]) expect(canaryDelegationAllowed(invalid,request)).toBe(false);
});