# PIE V2 — Pitching Intelligence Engine Constitution

**Sealed:** 2026-06-04 — under explicit constitutional override of the Architecture Program Closure Stop Gate (2026-06-04).

**Scope:** Baseball only. Softball untouched. Additive only.

**Subordinate to:** Eternal Laws · Megaphase 1–151 · RR-5 · RR-6 · RR-8 · Phase 31 arbitration · Megaphase 151 relational substrate · demo↔production firewall · all prior immutable invariants.

---

## §0 Doctrine

1. PIE V2 metrics are **interpretive signals**. They never author `organism_truth`, `athlete_intent`, `authority_override`, `hard_stop`, or `rehabilitation_state`.
2. All emissions ride canonical `emitAsbEvent` / `buildAsbRow` / `asb_events` + `asb_event_lineage`. **Zero parallel storage.** Topic prefix reserved: `pitching.v2.*`.
3. Existing pitching scoring is **never** mutated. PIE V2 surfaces alongside under a new `pie_v2_composite`.
4. Confidence + missingness are first-class on every emission. Provenance (`manual` · `video_derived` · `sensor_derived`) is preserved end-to-end.
5. RR-6 supremacy: any injury-adjacent advisory routes through safeguarding orchestration. **Never auto-diagnoses.** Athlete-reported pain outranks inferred mechanics.
6. RR-5 supremacy: no destiny framing, no invented feelings, no fabricated certainty. AI Hammer talking points are bounded by a constitutional envelope.
7. RR-8: athlete may decline disclosure; missingness is acceptable and never imputed.
8. Engine version pinned: `PIE_V2_ENGINE_VERSION = "v2.0.0"`. All replay determinism guarantees pin to this version.

---

## §1 Signals

| # | Signal | Type | Target | Acceptable | Topic |
|---|---|---|---|---|---|
| 1 | Energy Angle | scored | 25° | ≥18° | `pitching.v2.energy_angle` |
| 2 | Target Visual Stability | scored | eyes on target at peak lift | no early break | `pitching.v2.visual_stability` |
| 3 | Hip/Shoulder Separation Integrity | scored | hips fire, shoulders closed to foot strike | no early opening | `pitching.v2.separation` |
| 4 | Leg Lift → Foot Strike Time | scored | ≤1.05 s | ≤1.20 s | `pitching.v2.tempo` |
| 5 | Stride Length Efficiency | scored | ≥100% body height | ≥90% | `pitching.v2.stride` |
| 6 | Head Stability (vertical) | scored | ≤2% drop | ≤4% | `pitching.v2.head_stability` |
| 7 | Hip Alignment | scored | hips fired toward target, shoulders closed | — | `pitching.v2.hip_alignment` |
| 8 | Front Side Control | scored | glove inside shoulder frame, Open→Target→Closed→Body | no lateral swing | `pitching.v2.front_side` |
| 9 | Head Alignment at Release | scored | ≤15° belly-line | compounding penalty beyond | `pitching.v2.head_alignment` |
| 10 | Shoulder Level at Release | scored | ≤10° horizontal | eyes level laterally | `pitching.v2.shoulder_level` |
| 11 | Rear Foot Drag Efficiency | scored | ~2 foot lengths toward target | no out-and-around | `pitching.v2.rear_foot_drag` |
| 12 | Release Extension Consistency | **tracked-only** | trend / variance | — | `pitching.v2.extension_consistency` |
| 13 | Arm Slot Consistency | **tracked-only** | trend / variance / fatigue+pain correlation | — | `pitching.v2.arm_slot_consistency` |

Tracked-only signals are **never** pass/fail. They feed AI Hammer, longitudinal reports, and the injury-caution advisory channel only.

---

## §2 Severity Tiers

`clean` (≥85) · `minor` (70–84) · `major` (50–69) · `critical` (<50). Tier boundaries deterministic, pinned to engine_version.

---

## §3 Confidence Model

```
{ score: 0–100, basis:
  "manual_single_rep" | "manual_aggregate" |
  "video_frame_range" | "video_aggregate" |
  "sensor_calibrated" | "sensor_uncalibrated" }
```

Confidence is **never** fabricated. Aggregate confidence = weighted mean by sample size, capped by lowest-provenance contributor.

---

## §4 Missingness Model

```
[{ field: string, reason:
   "not_captured" | "not_visible_in_video" |
   "athlete_declined" | "sensor_unavailable" }]
```

Missingness is **never** imputed. Missing inputs produce a `clean`-tier suppression — no score emitted, missingness lineage preserved.

---

## §5 Safeguarding Routing (RR-6)

Arm-slot drift + extension regression + within-session tempo decay + athlete-reported pain (when present) → `mechanics_injury_caution` advisory emitted via existing safeguarding orchestration sub-route:

```
signal → classify → contain → notify_safeguarding_role → arbitrate (Phase 31)
```

The advisory is **always observational**, **always rollback-capable**, **never diagnostic**, **never prescriptive**. RR-6 invariants:

- Athlete-reported pain **outranks** inferred mechanics readiness.
- RTP requires explicit human authorization.
- Missingness is itself a signal.
- Commercial / engagement pressure may never suppress a caution.

---

## §6 AI Hammer Talking-Point Bounds (RR-5)

Talking points are produced by `aiHammerTalkingPoints.ts` as deterministic tier × signal → constitution-approved language. LLM rephrasing is permitted **only** within the envelope:

- No destiny framing ("you will be / you'll never").
- No fabricated feelings ("you must be frustrated").
- No certainty beyond confidence band.
- No comparative ranking against named peers.
- Survivability and safeguarding always supersede coaching urgency.

---

## §7 Longitudinal Interpretation

Trajectories are derived from `asb_events` via `pieV2/longitudinal.ts`. Pure derivation; no separate storage. Regression and improvement are reported with confidence bands and missingness state. Slumps are framed observationally per RR-5.

---

## §8 Recruiting Visibility (RR-9 gate)

`PieV2RecruitingCard` is **opt-in only**, gated through the existing RR-9 visibility envelope. Aggregate tier + trajectory + confidence + missingness shown; no raw rep data, no unfiltered pain correlation, no minor-athlete escalation surfaces.

---

## §9 Stop Gate

Future PIE V3 requires a separate constitutional override. Within PIE V2: additive-only, replay-stable, no structural mutation, no parallel surfaces, no schema authorization escalation.
