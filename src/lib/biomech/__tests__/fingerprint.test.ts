import { describe, expect, it } from "vitest";
import {
  buildCacheFingerprint,
  sha256Hex,
  sha256OfCanonicalJson,
} from "../fingerprint";

describe("Phase 0 — deterministic fingerprint", () => {
  const fixture = {
    videoSha256Hex: "a".repeat(64),
    fpsTrue: 59.94,
    landingTimeSec: 1.234567,
    directionSign: 1 as const,
    calibrationHpx: 612.5,
  };

  it("sha256Hex matches a known vector", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("cache fingerprint is byte-identical across repeated calls", async () => {
    const runs = await Promise.all(
      Array.from({ length: 10 }, () => buildCacheFingerprint(fixture)),
    );
    expect(new Set(runs).size).toBe(1);
  });

  it("any input change shifts the fingerprint", async () => {
    const base = await buildCacheFingerprint(fixture);
    const shifted = await buildCacheFingerprint({ ...fixture, fpsTrue: 60 });
    expect(base).not.toBe(shifted);
  });

  it("canonical JSON hash is key-order independent", async () => {
    const a = await sha256OfCanonicalJson({ x: 1, y: 2, z: { a: 1, b: 2 } });
    const b = await sha256OfCanonicalJson({ z: { b: 2, a: 1 }, y: 2, x: 1 });
    expect(a).toBe(b);
  });

  it("null landing time hashes differently from zero", async () => {
    const withNull = await buildCacheFingerprint({ ...fixture, landingTimeSec: null });
    const withZero = await buildCacheFingerprint({ ...fixture, landingTimeSec: 0 });
    expect(withNull).not.toBe(withZero);
  });
});
