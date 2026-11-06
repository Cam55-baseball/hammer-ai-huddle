import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { athletesOnly, sponsorOptions, searchSponsorOptions } from "../orgPeople";
import { groupMembers } from "@/components/organization/OrganizationMemberList";
import { SponsorPlayerPicker } from "@/components/organization/SponsorshipsCard";

const roster = [
  { user_id: "c1", full_name: "Coach Carter", role_in_org: "coach" },
  { user_id: "a2", full_name: "Zoe Young", role_in_org: "player" },
  { user_id: "a1", full_name: "Ava Brooks", role_in_org: "player" },
  { user_id: "o1", full_name: "Owner Org", role_in_org: "owner" },
];

describe("owner Nov 6 r3 — org people by role", () => {
  it("a coach never appears in an athlete list", () => {
    expect(athletesOnly(roster).map(r => r.user_id)).toEqual(["a2", "a1"]);
    const athletes = groupMembers(roster).find(([k]) => k === "Athletes")![1];
    expect(athletes.map(r => r.user_id)).not.toContain("c1");
    expect(sponsorOptions(roster).map(o => o.id)).not.toContain("c1");
  });
  it("sponsor picker renders full names sorted, with team and position, searchable", () => {
    const opts = sponsorOptions(roster, { a1: ["Varsity"] }, { a1: "SS" });
    expect(opts.map(o => o.name)).toEqual(["Ava Brooks", "Zoe Young"]);
    expect(searchSponsorOptions(opts, "zoe").map(o => o.id)).toEqual(["a2"]);
    render(<SponsorPlayerPicker options={opts} value="" onChange={() => {}} />);
    expect(screen.getByText("Ava Brooks")).toBeTruthy();
    expect(screen.getByText("Varsity · SS")).toBeTruthy();
    expect(screen.queryByText("Player")).toBeNull();
  });
});
