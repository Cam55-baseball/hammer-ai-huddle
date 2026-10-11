import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parsePrivateMediaRef, PRIVATE_MEDIA_BUCKETS } from "../privateMedia";

describe("private media links", () => {
  it("old public athlete video links are recognised and re-signed", () => {
    expect(parsePrivateMediaRef("https://x.co/storage/v1/object/public/videos/u1/clip%201.mov#t=0.1"))
      .toEqual({ bucket: "videos", path: "u1/clip 1.mov" });
  });
  it("scout application letters and videos are private", () => {
    expect(PRIVATE_MEDIA_BUCKETS).toEqual(expect.arrayContaining(["videos", "scout-letters", "scout-videos"]));
    expect(parsePrivateMediaRef("https://x.co/storage/v1/object/public/scout-letters/u/letter.pdf")?.bucket).toBe("scout-letters");
  });
  it("public marketing buckets and outside links are left alone", () => {
    expect(parsePrivateMediaRef("https://x.co/storage/v1/object/public/promo-videos/a.mp4")).toBeNull();
    expect(parsePrivateMediaRef("https://youtube.com/watch?v=1")).toBeNull();
  });
  it("profile setup only requests coach/scout roles as pending", () => {
    const src = readFileSync("src/pages/ProfileSetup.tsx", "utf8");
    expect(src).toContain("status: dbRole === 'player' ? 'active' : 'pending'");
  });
});
