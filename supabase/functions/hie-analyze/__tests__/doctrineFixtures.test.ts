// Deno test — hitting doctrine attribution fixtures.
//
// Verifies P1..P4 fixtures correctly identify their priority phase and that
// missingness paths return confidence=0 without fabrication.
//
//   deno test --allow-net --allow-env supabase/functions/hie-analyze/__tests__/doctrineFixtures.test.ts

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  deriveHittingDoctrineAttribution,
  WeaknessClusterLite,
} from "../../_shared/deriveHittingDoctrine.ts";

const sufficientDepth = { signalDepth: 12 };

Deno.test("P1 fixture — jammed_elbow symptom resolves to P1 priority", () => {
  const clusters: WeaknessClusterLite[] = [
    {
      area: "hitting",
      issue: "Jammed on inside fastballs",
      impact: "high",
      data_points: {
        metric: "inside_weakness",
        symptoms: ["hand_load_before_hip_load", "no_separation"],
      },
    },
  ];
  const r = deriveHittingDoctrineAttribution(clusters, sufficientDepth);
  assertEquals(r.priority_phase, "P1");
  assertEquals(r.violated_phases.includes("P1"), true);
  assertEquals(r.causal_chains.P1?.phase, "P1");
  assertEquals(r.roadmap.length > 0, true);
  assertEquals(r.confidence > 0, true);
});

Deno.test("P2 fixture — explicit P2 symptoms resolve to P2 priority", () => {
  const clusters: WeaknessClusterLite[] = [
    {
      area: "hitting",
      issue: "Front shoulder pulling out",
      impact: "high",
      data_points: {
        metric: "pull_off",
        symptoms: ["front_shoulder_pulls_out", "chest_not_square_to_plate", "long_stride"],
      },
    },
  ];
  const r = deriveHittingDoctrineAttribution(clusters, sufficientDepth);
  assertEquals(r.priority_phase, "P2");
  assertEquals(r.violated_phases.includes("P2"), true);
});

Deno.test("P3 fixture — late_swing_high_velocity via velocity_weakness → P3", () => {
  const clusters: WeaknessClusterLite[] = [
    {
      area: "hitting",
      issue: "Weak vs high velocity",
      impact: "high",
      data_points: {
        metric: "velocity_weakness",
        symptoms: ["not_sideways_at_landing", "foot_down_late"],
      },
    },
  ];
  const r = deriveHittingDoctrineAttribution(clusters, sufficientDepth);
  assertEquals(r.priority_phase, "P3");
  assertEquals(r.violated_phases.includes("P3"), true);
});

Deno.test("P4 fixture — casting + rollover resolves to P4 priority (most-important phase)", () => {
  const clusters: WeaknessClusterLite[] = [
    {
      area: "hitting",
      issue: "Casting the barrel",
      impact: "high",
      data_points: {
        metric: "down_weakness",
        symptoms: ["casting", "rollover", "hands_lead_elbow"],
      },
    },
  ];
  const r = deriveHittingDoctrineAttribution(clusters, sufficientDepth);
  assertEquals(r.priority_phase, "P4");
  assertEquals(r.violated_phases.includes("P4"), true);
  assertEquals(r.causal_chains.P4?.phase, "P4");
});

Deno.test("missingness — empty clusters return confidence=0 without fabrication", () => {
  const r = deriveHittingDoctrineAttribution([], sufficientDepth);
  assertEquals(r.priority_phase, null);
  assertEquals(r.confidence, 0);
  assertEquals(r.violated_phases.length, 0);
  assertEquals(r.roadmap.length, 0);
  assertEquals(r.missingness.reason, "no_hitting_clusters");
});

Deno.test("missingness — unmapped metric returns confidence=0", () => {
  const clusters: WeaknessClusterLite[] = [
    {
      area: "hitting",
      issue: "Some unknown issue",
      impact: "low",
      data_points: { metric: "totally_unknown_metric" },
    },
  ];
  const r = deriveHittingDoctrineAttribution(clusters, sufficientDepth);
  assertEquals(r.priority_phase, null);
  assertEquals(r.confidence, 0);
  assertEquals(r.missingness.reason, "unmapped_clusters");
});

Deno.test("below_threshold — low signal depth blocks priority emission", () => {
  const clusters: WeaknessClusterLite[] = [
    {
      area: "hitting",
      issue: "Inside jam",
      impact: "high",
      data_points: { metric: "inside_weakness", symptoms: ["jammed_elbow"] },
    },
  ];
  const r = deriveHittingDoctrineAttribution(clusters, { signalDepth: 2 });
  assertEquals(r.priority_phase, null);
  assertEquals(r.confidence, 0);
  assertEquals(r.missingness.reason, "below_threshold");
});

Deno.test("engine_version is pinned for replay equivalence", () => {
  const r = deriveHittingDoctrineAttribution([], sufficientDepth);
  assertEquals(r.engine_version, "hie-doctrine-v1.0.0");
});
