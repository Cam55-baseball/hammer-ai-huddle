# Recommendation Resolution Audit

**Generated:** 2026-06-06  
**Engine pins:** `pie-v2.0.0`, `hie-1.0.0`  
**Source script:** `scripts/audit-recommendation-resolution.ts`

For every PIE V2 signal and every HIE hitting phase we verify that at least
one assignable drill, one playable video, one coach action, and one athlete
action exist. RED = launch blocker. YELLOW = soft-launch acceptable but
flagged for next sprint. GREEN = fully resolved.

---

## PIE V2 signals (13)

| Signal | Drills | Videos | Coach action | Athlete action | Verdict |
|---|---|---|---|---|---|
| energy_angle | ✅ (4 tiers) | ✅ (5 types) | ✅ teaching progression | ✅ required outputs | GREEN |
| visual_stability | ✅ | ✅ | ✅ | ✅ | GREEN |
| separation | ✅ | ✅ | ✅ | ✅ | GREEN |
| tempo | ✅ | ✅ | ✅ | ✅ | GREEN |
| stride | ✅ | ✅ | ✅ | ✅ | GREEN |
| head_stability | ✅ | ✅ | ✅ | ✅ | GREEN |
| hip_alignment | ✅ | ✅ | ✅ | ✅ | GREEN |
| front_side | ✅ | ✅ | ✅ | ✅ | GREEN |
| head_alignment | ✅ | ✅ | ✅ | ✅ | GREEN |
| shoulder_level | ✅ | ✅ | ✅ | ✅ | GREEN |
| rear_foot_drag | ✅ | ✅ | ✅ | ✅ | GREEN |
| extension_consistency (tracked) | ✅ (L1/L2 only) | ✅ (education) | ✅ | ✅ | GREEN |
| arm_slot_consistency (tracked) | ✅ (L1/L2 only) | ✅ (education) | ✅ | ✅ | GREEN |

Catalog wiring confirmed via `PIE_V2_DRILL_CATALOG` (52 entries: 13 × 4 tiers)
and `PIE_V2_VIDEO_CATALOG` (65 entries: 13 × 5 video types). No dead refs.

## HIE hitting phases (4)

| Phase | Drills | Videos | Coach action | Athlete action | Verdict |
|---|---|---|---|---|---|
| P1 stance/setup | dynamic (per snapshot prescriptive_actions) | dynamic (`VideoSuggestionsPanel`) | `HittingDoctrineBlock` shows roadmap | causal chain rendered | GREEN |
| P2 load/rhythm | dynamic | dynamic | ✅ | ✅ | GREEN |
| P3 swing | dynamic | dynamic | ✅ | ✅ | GREEN |
| P4 contact | dynamic | dynamic | ✅ | ✅ | GREEN |

## Catalog hygiene

- ❌ Drills without parent signal: **0**
- ❌ Videos without parent signal: **0**
- ❌ Drills referencing missing video_refs: scan via script — **0** (all video_refs resolve inside `PIE_V2_VIDEO_CATALOG`)
- ❌ Dead URL: **none in catalog** (catalog stores ids, not URLs; library_videos URL resolution happens at render time and is guarded by `VideoSuggestionsPanel`)

## Verdict

**17 / 17 signals GREEN.** No RED. Recommendation resolution is launch-ready
for baseball pitching + hitting.
