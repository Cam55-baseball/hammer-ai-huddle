import { describe, it, expect } from "vitest";
import { appendVersion, badgeFor, latestVersion, principlesInUse, type PrincipleVersion } from "./principles";

const v1: PrincipleVersion = {
  id: "v1", principle_id: "p", version: 1, body: "Stay through the ball", sport: "baseball", area: "mechanics",
  situation: null, applies_when: null, not_when: null, connected_work: null,
  evidence_kind: "experience", evidence_note: null, created_at: "2026-10-18T00:00:00Z",
};

describe("coaching principles", () => {
  it("a switched-off principle is removed from use", () => {
    const list = [{ id: "a", active: true, current_version: 1 }, { id: "b", active: false, current_version: 2 }];
    expect(principlesInUse(list).map((p) => p.id)).toEqual(["a"]);
  });
  it("an edit adds version 2 and never overwrites version 1", () => {
    const { version: _drop, ...rest } = v1;
    const next = appendVersion([v1], { ...rest, id: "v2", body: "Stay through the ball, eyes level" });
    expect(next).toHaveLength(2);
    expect(next[0]).toEqual(v1);
    expect(next[1].version).toBe(2);
    expect(latestVersion(next)?.body).toBe("Stay through the ball, eyes level");
  });
  it("badges move only with real outcomes across players", () => {
    const base = { advice: 0, followed: 0, players_followed: 0, worked: 0, no_change: 0, got_worse: 0, players_worked: 0 };
    expect(badgeFor(null)).toBe("Hammers belief");
    expect(badgeFor({ ...base, worked: 3, players_worked: 3 })).toBe("Seen in Hammers players");
    expect(badgeFor({ ...base, worked: 10, players_worked: 10, got_worse: 2 })).toBe("Proven at Hammers");
    expect(badgeFor({ ...base, worked: 10, players_worked: 10, no_change: 10 })).toBe("Seen in Hammers players");
  });
});
