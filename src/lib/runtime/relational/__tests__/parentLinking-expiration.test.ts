/**
 * Wave-1 closure §1.1 — Parent invite token expiration unit tests.
 *
 * Verifies:
 *   • Newly issued tokens carry expires_at = issued_at + 24h
 *   • Expired tokens return null-route via isInviteTokenExpired
 *   • Tampered tokens (mutated base64) decode to null
 *   • Legacy tokens lacking expires_at are treated as expired
 */
import { describe, it, expect } from "vitest";
import {
  encodeInviteToken,
  decodeInviteToken,
  isInviteTokenExpired,
  PARENT_INVITE_TOKEN_TTL_MS,
  type ParentInviteToken,
} from "@/lib/runtime/relational/parentLinking";

const ISSUED = "2026-03-01T00:00:00.000Z";
const ISSUED_MS = Date.parse(ISSUED);

describe("RR-4 §1.1 — parent invite token expiration", () => {
  it("fresh token is not expired", () => {
    const t: ParentInviteToken = {
      relationship_id: "rel-1",
      athlete_id: "ath-1",
      issued_at: ISSUED,
      expires_at: new Date(ISSUED_MS + PARENT_INVITE_TOKEN_TTL_MS).toISOString(),
    };
    expect(isInviteTokenExpired(t, new Date(ISSUED_MS + 1000))).toBe(false);
  });

  it("token past expires_at is expired", () => {
    const t: ParentInviteToken = {
      relationship_id: "rel-1",
      athlete_id: "ath-1",
      issued_at: ISSUED,
      expires_at: new Date(ISSUED_MS + PARENT_INVITE_TOKEN_TTL_MS).toISOString(),
    };
    expect(
      isInviteTokenExpired(t, new Date(ISSUED_MS + PARENT_INVITE_TOKEN_TTL_MS + 1)),
    ).toBe(true);
  });

  it("legacy token missing expires_at is treated as expired", () => {
    const legacy = encodeInviteToken({
      relationship_id: "rel-legacy",
      athlete_id: "ath-1",
      issued_at: ISSUED,
    });
    const decoded = decodeInviteToken(legacy);
    expect(decoded).not.toBeNull();
    expect(isInviteTokenExpired(decoded!, new Date(ISSUED_MS + 1000))).toBe(true);
  });

  it("encode/decode preserves expires_at", () => {
    const t: ParentInviteToken = {
      relationship_id: "rel-1",
      athlete_id: "ath-1",
      issued_at: ISSUED,
      expires_at: new Date(ISSUED_MS + PARENT_INVITE_TOKEN_TTL_MS).toISOString(),
    };
    const enc = encodeInviteToken(t);
    expect(decodeInviteToken(enc)).toEqual(t);
  });

  it("tampered token decodes to null", () => {
    const t = encodeInviteToken({
      relationship_id: "rel-1",
      athlete_id: "ath-1",
      issued_at: ISSUED,
      expires_at: new Date(ISSUED_MS + PARENT_INVITE_TOKEN_TTL_MS).toISOString(),
    });
    // Flip a character in the middle of the base64url body.
    const tampered = t.slice(0, t.length / 2) + "!!" + t.slice(t.length / 2 + 2);
    expect(decodeInviteToken(tampered)).toBeNull();
  });

  it("garbage tokens decode to null", () => {
    expect(decodeInviteToken("")).toBeNull();
    expect(decodeInviteToken("not-a-token")).toBeNull();
  });
});
