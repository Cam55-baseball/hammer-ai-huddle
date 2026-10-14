import { describe, it, expect } from "vitest";
import { noticeStillNeeded } from "./noticeState";

const slugs = ["privacy", "child-safety"];
describe("privacy update notice shows once per version", () => {
  it("shows when the newest privacy version was never acknowledged", () =>
    expect(noticeStillNeeded({ privacy: 2 }, { privacy: { document_version: 1, choice: "accepted" } }, slugs)).toBe(true));
  it("never shows again once that version is saved", () =>
    expect(noticeStillNeeded({ privacy: 2 }, { privacy: { document_version: 2, choice: "accepted" } }, slugs)).toBe(false));
  it("shows once more when a newer version comes out", () =>
    expect(noticeStillNeeded({ privacy: 3 }, { privacy: { document_version: 2, choice: "accepted" } }, slugs)).toBe(true));
});
