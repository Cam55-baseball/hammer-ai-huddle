/**
 * Phase 0 — Replay Validation Tool
 *
 * Re-runs the deterministic cache-fingerprint builder N times against a fixed
 * synthetic input and asserts byte-identical output. Once Phase 2–4 land, this
 * script will additionally re-run the landmark→event→metric pipeline against
 * a fixed landmarks.jsonl fixture and assert byte-identical
 * events_sha256_hex / metrics_sha256_hex.
 *
 * Run locally:
 *   bunx tsx scripts/replay/verify-determinism.ts
 *   bun run scripts/replay/verify-determinism.ts
 *
 * Exit code 0 = all runs identical. Non-zero = determinism violation.
 */

import { buildCacheFingerprint, sha256OfCanonicalJson } from "../../src/lib/biomech/fingerprint";

const RUNS = 10;

const fixture = {
  videoSha256Hex: "a".repeat(64),
  fpsTrue: 59.94,
  landingTimeSec: 1.234567,
  directionSign: 1 as const,
  calibrationHpx: 612.5,
};

const jsonFixture = {
  events: {
    t_lift: { frame_index: 12, t_seconds: 0.2, confidence: 0.81 },
    t_strike: { frame_index: 47, t_seconds: 0.78, confidence: 0.76 },
  },
  metrics: { tempo_sec: { value: 0.58, score: 72, confidence: 0.78 } },
};

async function main() {
  const fingerprints = new Set<string>();
  const jsonHashes = new Set<string>();

  for (let i = 0; i < RUNS; i++) {
    fingerprints.add(await buildCacheFingerprint(fixture));
    jsonHashes.add(await sha256OfCanonicalJson(jsonFixture));
  }

  let failed = false;
  if (fingerprints.size !== 1) {
    console.error(`[FAIL] cache fingerprint produced ${fingerprints.size} distinct values over ${RUNS} runs`);
    for (const f of fingerprints) console.error("  -", f);
    failed = true;
  } else {
    console.log(`[ok] cache fingerprint identical across ${RUNS} runs: ${[...fingerprints][0]}`);
  }

  if (jsonHashes.size !== 1) {
    console.error(`[FAIL] canonical-JSON hash produced ${jsonHashes.size} distinct values over ${RUNS} runs`);
    for (const h of jsonHashes) console.error("  -", h);
    failed = true;
  } else {
    console.log(`[ok] canonical JSON hash identical across ${RUNS} runs: ${[...jsonHashes][0]}`);
  }

  if (failed) {
    process.exit(1);
  }
  console.log(`[ok] Phase 0 determinism foundation verified.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
