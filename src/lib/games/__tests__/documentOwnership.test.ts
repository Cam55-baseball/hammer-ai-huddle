import { describe, expect, it } from "vitest";
import { ownsImport } from "../../../../supabase/functions/gp-ingest-document/ownership";

const doc = { user_id: "player", game_id: "game", file_url: "gp-documents://player/game/photo.png" };
const game = { user_id: "player", deleted_at: null };
const check = (document = doc, owner = game, bucket = "gp-documents", path = "player/game/photo.png") =>
  ownsImport("player", "game", bucket, path, document, owner);

describe("document import ownership", () => {
  it("allows only the caller's saved document and game", () => expect(check()).toBe(true));
  it("refuses another player's document", () => expect(check({ ...doc, user_id: "other" })).toBe(false));
  it("refuses another player's game", () => expect(check(doc, { ...game, user_id: "other" })).toBe(false));
  it("refuses a mismatched document game", () => expect(check({ ...doc, game_id: "other" })).toBe(false));
  it("refuses a different storage object", () => expect(check(doc, game, "gp-documents", "player/game/other.png")).toBe(false));
  it("refuses an arbitrary bucket", () => expect(check(doc, game, "videos")).toBe(false));
  it("refuses deleted games", () => expect(check(doc, { ...game, deleted_at: "2026-10-18" })).toBe(false));
  it("refuses missing resources", () => expect(ownsImport("player", "game", "gp-documents", "player/game/photo.png", null, game)).toBe(false));
});