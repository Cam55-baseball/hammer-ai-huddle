import { describe, it, expect } from "vitest";
import { coachPendingPlayerRequests } from "@/components/connections/CoachConnectionsView";
describe("coach My Connections (Nov 4 r2 #2)", () => {
  it("shows only waiting incoming player requests inline", () => {
    const base = { can_answer: true, other_name: "P", team_name: null };
    const out = coachPendingPlayerRequests([
      { ...base, id: "a", kind: "coach_player", incoming: true, status: "pending" },
      { ...base, id: "b", kind: "coach_player", incoming: false, status: "pending" },
      { ...base, id: "c", kind: "scout_player", incoming: true, status: "pending" },
      { ...base, id: "d", kind: "coach_player", incoming: true, status: "accepted" },
    ]);
    expect(out.map(r => r.id)).toEqual(["a"]);
  });
});
