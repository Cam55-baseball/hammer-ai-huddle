import { describe, expect, it } from "vitest";
import { videoStoragePath } from "../../../supabase/functions/_shared/classicAnalysis";
import { readUploadFacts } from "./uploadFacts";

describe("server watches the uploaded clip", () => {
  it("finds the clip's storage key from every saved link form", () => {
    const base = "https://x.supabase.co/storage/v1/object";
    expect(videoStoragePath(`${base}/public/videos/u1/170.mov`)).toBe("u1/170.mov");
    expect(videoStoragePath(`${base}/sign/videos/u1/170.MOV?token=abc`)).toBe("u1/170.MOV");
    expect(videoStoragePath(`${base}/authenticated/videos/u1/a%20b.mp4`)).toBe("u1/a b.mp4");
  });
  it("returns nothing for links outside the videos bucket", () => {
    expect(videoStoragePath(null)).toBeNull();
    expect(videoStoragePath("https://x.supabase.co/storage/v1/object/public/thumbnails/u1/a.jpg")).toBeNull();
  });
});

describe("the phone never has to play the clip", () => {
  it("falls back to the file fingerprint when the phone can't read the video", async () => {
    const facts = await readUploadFacts(new Blob([new Uint8Array([1])]), {
      probeTimeoutMs: 20,
      probe: () => new Promise(() => {}), // e.g. iPhone Safari never loads the clip
      hash: async () => "a".repeat(64),
    });
    expect(facts.sha256_hex).toBe("a".repeat(64));
    expect(facts.probe).toBeNull();
    expect(facts.fps_true).toBeNull();
    expect(facts.width).toBeNull();
  });
});
