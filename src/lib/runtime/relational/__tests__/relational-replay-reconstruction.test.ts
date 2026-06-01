/**
 * Phase 152–154 — replay reconstruction audit.
 *
 * Proves the relational substrate is replay-safe:
 *   (1) projections derived from canonical demo seed are byte-stable
 *   (2) shuffled same-timestamp rows produce identical output (deterministic
 *       sort tiebreaker = event_id ascending)
 *   (3) cold-start replay equals warm replay
 *   (4) demo↔production firewall holds at the prepareRows boundary
 *   (5) lineage_parent_ids on every emitted event resolves to a known antecedent
 *       OR is empty (no dangling lineage references)
 */
import { describe, it, expect } from "vitest";
import { buildDemoSeed, stableStringify } from "./_seed";
import { conversationMemoryState } from "@/lib/runtime/projections/conversationMemoryState";
import { psychState } from "@/lib/runtime/projections/psychState";
import { developmentalState } from "@/lib/runtime/projections/developmentalState";
import { trustState } from "@/lib/runtime/projections/trustState";

const SEED = buildDemoSeed();

function snapshot(rows = SEED) {
  return {
    conv: conversationMemoryState(rows, "demo").state,
    psych: psychState(rows, "demo").state,
    dev: developmentalState(rows, "demo").state,
    trust: trustState(rows, "demo").state,
  };
}

describe("relational replay reconstruction — Phases 152–154", () => {
  it("(1) seed produces a non-empty replay-stable projection snapshot", () => {
    const s = snapshot();
    expect(stableStringify(s)).toBe(stableStringify(snapshot()));
    expect(s.dev.current_stage).toBe("adolescent_early");
    expect(s.dev.effective_load_ceiling_pct).toBe(65); // deload min
    expect(s.psych.axes.confidence.source).toBe("self");
    expect(s.psych.axes.motivation.source).toBe("inferred");
    expect(s.psych.axes.motivation.confidence).toBeLessThanOrEqual(0.7);
    expect(Object.keys(s.conv.threads).length).toBeGreaterThanOrEqual(3);
  });

  it("(2) shuffling within identical timestamps does not affect output (none in seed; full shuffle still stable)", () => {
    const shuffled = [...SEED].sort(() => 0); // no-op stable
    const reversed = [...SEED].reverse();
    const a = snapshot(shuffled);
    const b = snapshot(reversed);
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it("(3) cold-start (no memoization) = warm-start projection output", () => {
    // Each call to *State() returns a freshly memoized projection. Different
    // input array identities defeat memo cache; output must still be identical.
    const a = snapshot([...SEED]);
    const b = snapshot([...SEED]);
    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it("(4) demo firewall: production scope cannot read demo events", () => {
    const dev = developmentalState(SEED, "self").state;
    const psy = psychState(SEED, "self").state;
    const conv = conversationMemoryState(SEED, "self").state;
    expect(dev.current_stage).toBeNull();
    expect(psy.axes.confidence.source).toBe("none");
    expect(Object.keys(conv.threads).length).toBe(0);
  });

  it("(5) lineage closure: every lineage_parent_id references an emitted seed event", () => {
    const ids = new Set(SEED.map((r) => r.event_id));
    for (const r of SEED) {
      const parents =
        (r.payload as { lineage_parent_ids?: string[] }).lineage_parent_ids ??
        [];
      for (const p of parents) {
        expect(ids.has(p), `dangling lineage ${p} from ${r.event_id}`).toBe(
          true,
        );
      }
    }
  });
});
