import { describe, it, expect } from "vitest";
import { pickNewest } from "../nativeSessionStore";

const s = (exp: number) => JSON.stringify({ access_token: "a", refresh_token: "r", expires_at: exp });

describe("pickNewest (native session migration)", () => {
  it("keeps the existing web session when native storage is empty (upgrade path)", () => {
    expect(pickNewest(s(100), null)).toBe(s(100));
  });
  it("restores from native storage when iOS cleared localStorage", () => {
    expect(pickNewest(null, s(100))).toBe(s(100));
  });
  it("prefers the copy that expires later", () => {
    expect(pickNewest(s(100), s(200))).toBe(s(200));
    expect(pickNewest(s(300), s(200))).toBe(s(300));
  });
  it("returns null when neither exists", () => {
    expect(pickNewest(null, null)).toBeNull();
  });
});
