import { describe, expect, it } from "vitest";
import { drillVideoLabel, parseDrillVideoLink, drillVideoFromUrl } from "./drillVideoSource";

const embed = (u: string) => (parseDrillVideoLink(u) as { kind: string; embedUrl?: string } | null);

describe("drill video links (owner Oct 28)", () => {
  it("TikTok uses the official embed player", () => {
    expect(embed("https://www.tiktok.com/@coach/video/7212345678901234567")).toMatchObject({ kind: "tiktok", embedUrl: "https://www.tiktok.com/embed/v2/7212345678901234567" });
  });
  it("Instagram posts and reels use the official /embed page", () => {
    expect(embed("https://www.instagram.com/reel/Cx12AbCdEf/")).toMatchObject({ kind: "instagram", embedUrl: "https://www.instagram.com/reel/Cx12AbCdEf/embed" });
    expect(embed("https://instagram.com/p/Bq9xyz123/")).toMatchObject({ kind: "instagram", embedUrl: "https://www.instagram.com/p/Bq9xyz123/embed" });
  });
  it("X / Twitter posts use the official Tweet embed", () => {
    expect(embed("https://x.com/coach/status/1712345678901234567")).toMatchObject({ kind: "x", embedUrl: "https://platform.twitter.com/embed/Tweet.html?id=1712345678901234567&dnt=true" });
    expect(embed("https://twitter.com/coach/status/1712345678901234567")?.kind).toBe("x");
  });
  it("Facebook videos use the official video plugin", () => {
    const fb = embed("https://www.facebook.com/coach/videos/123456789012345/");
    expect(fb?.kind).toBe("facebook");
    expect(fb?.embedUrl).toContain("https://www.facebook.com/plugins/video.php?href=");
  });
  it("any other https link becomes a Watch-on button only, never an embed", () => {
    expect(parseDrillVideoLink("https://www.hudl.com/video/3/123")).toEqual({ kind: "external", url: "https://www.hudl.com/video/3/123", siteName: "Hudl" });
  });
  it("rejects http, junk, and platform pages that are not a video post", () => {
    expect(parseDrillVideoLink("http://www.hudl.com/v")).toBeNull();
    expect(parseDrillVideoLink("not a link")).toBeNull();
    expect(parseDrillVideoLink("https://www.instagram.com/coach/")).toBeNull();
    expect(parseDrillVideoLink("https://x.com/coach")).toBeNull();
  });
  it("shows the platform name", () => {
    expect(drillVideoLabel(parseDrillVideoLink("https://x.com/a/status/123456789"))).toBe("X (official player)");
    expect(drillVideoLabel(parseDrillVideoLink("https://www.hudl.com/v/1"))).toBe("Link to Hudl (opens outside the app)");
    expect(drillVideoLabel(drillVideoFromUrl("https://p.supabase.co/storage/v1/object/public/videos/a.mp4"))).toBe("Your upload");
  });
});
