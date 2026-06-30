/**
 * Drift guard for the Game Performance ledger adapter.
 *
 * Asserts that every value in `GP_TABLES` is a `gp_*` table name. Combined
 * with `scripts/check-no-legacy-games.sh`, this keeps the ledger as the
 * single source of truth and prevents accidental reintroduction of legacy
 * `games` / `game_*` paths.
 */
import { describe, it, expect } from "vitest";
import { GP_TABLES, gp } from "@/lib/games/ledger";

describe("gp ledger", () => {
  it("only exposes gp_* tables", () => {
    for (const name of Object.values(GP_TABLES)) {
      expect(name.startsWith("gp_")).toBe(true);
    }
  });

  it("returns a query builder for each canonical table", () => {
    for (const name of Object.values(GP_TABLES)) {
      const builder = gp(name);
      expect(builder).toBeTruthy();
      expect(typeof (builder as any).select).toBe("function");
    }
  });

  it("covers every canonical Game Performance domain", () => {
    const expected = [
      "games",
      "atBats",
      "pitches",
      "defense",
      "baserun",
      "subs",
      "pitcherDossiers",
      "opponentHitters",
      "documents",
    ];
    for (const key of expected) {
      expect(GP_TABLES).toHaveProperty(key);
    }
  });
});
