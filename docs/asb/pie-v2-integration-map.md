# PIE V2 — Integration Map

Companion to `pie-v2-constitution.md`. Catalogs every surface PIE V2 enters, every formula impact, every recommendation pathway, every dashboard, every AI Hammer touchpoint.

---

## §1 Surfaces impacted

| Surface | Module | Change | Replay-safe? |
|---|---|---|---|
| Analysis | `src/lib/analysisToTaxonomy.ts` | PIE V2 deficiencies folded into existing taxonomy via `pitching_mechanics_v2` bucket | yes |
| Scoring | `src/lib/pieV2/aggregate.ts` | new `pie_v2_composite` exposed alongside; existing composites untouched | yes |
| Athlete State | `src/lib/pieV2/athleteState.ts` | additive priors → `freshness_6h`, `volatility`; new `arm_health_caution` advisory channel | yes |
| Readiness | `src/lib/pieV2/recommendDrills.ts` | caution dampens L4 velocity-tier drills | yes |
| AI Hammer | `src/lib/pieV2/aiHammerTalkingPoints.ts` | new Mechanics V2 section, deterministic envelope | yes |
| Drills | `src/data/baseball/pieV2DrillCatalog.ts` + `src/lib/pieV2/recommendDrills.ts` | 13 signals × 4 tiers = 52 drills | yes |
| Videos | `src/data/baseball/pieV2VideoCatalog.ts` + `src/lib/pieV2/recommendVideos.ts` | 13 signals × 5 video types = 65 slots | yes |
| Progress Reports | `src/hooks/useCoachingReport.ts` (consumer) | per-signal trajectory section | yes |
| Recruiting | `src/components/recruiting/PieV2RecruitingCard.tsx` | opt-in, RR-9 gated | yes |
| Coach Dashboard | `src/components/coach/PieV2CoachPanel.tsx` | per-signal heatmap, sparklines, deficiency queue | yes |
| Development Plans | feeds existing `drill_prescriptions` pipeline | no new pipeline | yes |
| Trend Analysis | `src/hooks/usePitchingV2Trends.ts` | session/7d/30d/90d aggregates | yes |
| Injury Detection | `src/lib/pieV2/injuryDetection.ts` | bounded advisory, RR-6 supremacy, safeguarding orchestration | yes |
| Confidence Scores | first-class on every emission via `pieV2/emit.ts` | — | yes |
| Longitudinal | `src/lib/pieV2/longitudinal.ts` | pure derivation from `asb_events` | yes |

---

## §2 Formula impacts

- **Existing pitching composites** (`gradeEngine.ts`, `eliteScore.ts`, `useSessionInsights.ts` weights): **unchanged**.
- **New `pie_v2_composite`**: deterministic weighted mean over 11 scored signals, weights pinned to `PIE_V2_ENGINE_VERSION`. Tracked-only signals (12, 13) contribute zero weight to the composite but feed advisories.
- **Athlete State priors**: PIE V2 contributes additive priors only — `Δfreshness_6h ∈ [-15, 0]`, `Δvolatility ∈ [0, +0.2]`. Never overwrites; the existing engine clamp is the final arbiter.

---

## §3 Recommendation engines

- **Drill recommender** (`recommendDrills.ts`): session aggregate → ranked deficiencies → drills filtered by `severity_floor` and `tier`. RR-6 caution dampens L4 (velocity/game-speed) drills monotonically. Cumulative load (`athlete_load_tracking`) caps recommendation volume.
- **Video recommender** (`recommendVideos.ts`): mirrors drill logic; outputs education/demonstration/corrective/advanced/elite tiers per signal.

---

## §4 AI Hammer pathways

For each deficiency:
1. Identify root cause via `pieV2Signals.ts::rootCauses` (deterministic).
2. Prioritize corrections via severity × confidence × recency.
3. Track progress via `longitudinal.ts` trajectory.
4. Detect regression via 7d → 30d → 90d slope sign change.
5. Celebrate improvement via tier-crossing events (`minor` → `clean`, etc.).
6. Escalate injury concerns via `injuryDetection.ts` → safeguarding orchestration. **Never bypass.**

---

## §5 Storage

- New JSONB column `pie_v2_signals` on `performance_sessions` (projection cache; canonical truth = `asb_events`).
- New JSONB column `pie_v2_caution_state` on `athlete_foundation_state` (advisory projection cache).
- No new tables. No RLS changes — existing row-owner policies cover both.

---

## §6 Demo↔Production firewall

PIE V2 inherits the existing firewall via `prepareRows` in `src/lib/runtime/projections/types.ts`. No new visibility scopes are introduced. Demo `pitching.v2.*` events are bidirectionally isolated from production events per Megaphase 151.
