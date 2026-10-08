import { describe, it, expect } from "vitest";
import { OWNED_TABLES as A } from "../../../supabase/functions/delete-account/ownedTables";
import { OWNED_TABLES as B } from "../../../supabase/functions/legal-consent/ownedTables";

describe("Download my data covers every table account deletion removes", () => {
  it("lists are identical", () => expect(B).toEqual(A));
  it("consent records are never deleted with the account (kept 3 years)", () => {
    expect(A.map(([t]) => t)).not.toContain("consent_records");
  });
});
