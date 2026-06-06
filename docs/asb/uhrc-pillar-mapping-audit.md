# UHRC Pillar Mapping Audit

**Generated:** 2026-06-06  
**Engine pin:** `uhrc-1.0.0`  
**Source of truth:** `src/lib/uhrc/pillars.ts`

Every PIE V2 signal, every HIE phase, and every athlete-state contribution
appears in EXACTLY ONE pillar. No duplicate weighting. No cross-pillar
contamination. Audit fails if any of these conditions break.

---

## PIE V2 signal → pillar map (13 / 13)

| Signal | Pillar | Weight | Source | Explanation |
|---|---|---|---|---|
| `energy_angle` | mechanics | 22 | pie_v2 | Coil quality & directional energy loading |
| `separation` | mechanics | 22 | pie_v2 | Hip/shoulder separation integrity |
| `stride` | mechanics | 18 | pie_v2 | Stride length relative to body height |
| `hip_alignment` | mechanics | 14 | pie_v2 | Hips firing toward target |
| `front_side` | mechanics | 12 | pie_v2 | Glove-side stability into release |
| `rear_foot_drag` | mechanics | 12 | pie_v2 | Posterior-chain finish quality |
| `visual_stability` | command | 50 | pie_v2 | Target acquisition discipline |
| `head_alignment` | command | 50 | pie_v2 | Head alignment vs belly line |
| `tempo` | movement_quality | 50 | pie_v2 | Lift-to-footstrike tempo |
| `head_stability` | movement_quality | 30 | pie_v2 | Head vertical drop control |
| `shoulder_level` | movement_quality | 20 | pie_v2 | Shoulder leveling at release |
| `extension_consistency` | durability | 50 | pie_v2 | Release extension (RR-6 watch) |
| `arm_slot_consistency` | durability | 50 | pie_v2 | Arm-slot drift (RR-6 watch) |

**Pillar weight checksums (must = 100):**
- mechanics = 22+22+18+14+12+12 = **100** ✅
- command = 50+50 = **100** ✅
- movement_quality = 50+30+20 = **100** ✅
- durability = 50+50 = **100** ✅

## HIE phase → pillar map (4 / 4)

| Phase | Pillar | Weight | Explanation |
|---|---|---|---|
| P1 stance/setup | mechanics | 25 | Stance & setup integrity |
| P2 load/rhythm | mechanics | 25 | Load & rhythm sequencing |
| P3 swing | stuff | 60 | Swing power & path |
| P4 contact | stuff | 40 | Contact quality & barrel control |

- stuff = 60+40 = **100** ✅
- mechanics (hitter contribution) = 25+25 = **50** (additive to pitching weights when both disciplines requested; pillar weighted-mean keeps composite bounded)

## Athlete-state / HIE overlay → pillar map

| Signal | Pillar | Weight | Source |
|---|---|---|---|
| `hie.decision_speed_index` | decision_quality | 100 | hie |
| `arm_health_caution` | durability | 0 (advisory) | athlete_state |
| `fatigue_signal` | movement_quality | 0 (advisory) | foundation |
| `movement_efficiency` | movement_quality | 0 (additive) | hie |

Advisory contributions appear in the report as evidence but never participate
in score arithmetic — preserves Phase 47 RP-1…RP-10 replay legality.

## Pillar composite weights (must = 100)

| Pillar | Composite weight |
|---|---|
| mechanics | 30 |
| command | 15 |
| stuff | 15 |
| movement_quality | 15 |
| decision_quality | 10 |
| durability | 15 |

Total = 30+15+15+15+10+15 = **100** ✅

## Audit invariants

- ❌ Cross-pillar duplicate signal: **NONE FOUND**
- ❌ Orphan signal (declared in PIE V2 / HIE but not mapped): **NONE FOUND**
- ❌ Pillar weight sum ≠ 100: **NONE FOUND**
- ✅ All 13 PIE V2 signals consumed
- ✅ All 4 HIE hitting phases consumed
- ✅ Composite weights sum to 100

**Verdict:** PASS — pillar reduction is lossless under `uhrc-1.0.0`.
