# Bat Path vs On-Plane % — Definitions, Evidence, and Verdict Candidate

Status: **evidence-only investigation. No redesign. No code changes.**

## Source code references

### `bat_path` tile
- File: `src/lib/reportCard/disciplines/bh.ts`
- Tile key: `bat_path`
- Display name: **"Bat Path In/Out of Zone"**
- Mode: `score_meter`
- Standard text: *"Enters behind ball, exits in front, long on-plane window"*
- Thresholds: Acceptable 65 · Elite 88
- Phase: P4 Hitter's Move
- Input field: `bat_path_score_100` (legacy fallback `bat_path_score_10`)
- Compute: `readScore100(a, "bat_path_score_100", "bat_path_score_10")` → `scoreMeterState(value, confidence, 65, 88)`

### `on_plane` tile
- File: `src/lib/reportCard/disciplines/bh.ts`
- Tile key: `on_plane`
- Display name: **"On-Plane %"**
- Mode: `score_meter`
- Standard text: *"Percentage of the swing that stays on the pitch plane"*
- Thresholds: Acceptable 60 · Elite 85
- Phase: P4 Hitter's Move
- Input field: `on_plane_pct` (no legacy fallback)
- Compute: `readNumber(a, "on_plane_pct")` → `scoreMeterState(value, confidence, 60, 85)`

## Field-source diff

| Aspect | `bat_path` | `on_plane` |
|---|---|---|
| Source field | `bat_path_score_100` | `on_plane_pct` |
| Authored by | model (multimodal AI) | model (multimodal AI) |
| Acceptable / elite | 65 / 88 | 60 / 85 |
| Encouragement text mentions "on-plane window" | **yes** | yes |
| Standard text mentions "on-plane window" | **yes** | yes |
| Conceptual scope per current copy | Path *shape* through the zone (enter, exit, window length) | Percentage of swing *on* the plane |

## Prompt treatment
- File: `supabase/functions/analyze-video/index.ts` and `supabase/functions/_shared/reportCardContracts.ts`.
- Both fields are requested independently in the model's JSON output schema. The prompt does not state that one is a transformation of the other.
- The prompt does not give the model a formula tying `bat_path_score_100` to `on_plane_pct`, so the model is free to emit two correlated-but-independent numbers per swing. Empirically, in production rows these two fields move together but are not byte-identical.

## Side-by-side comparison

| Question | Bat Path | On-Plane % |
|---|---|---|
| What does a HIGH score reward? | Long on-plane window, clean enter/exit | High percentage of frames on the plane |
| What does a LOW score punish? | Short window, cutting across the zone | Off-plane frames dominate the swing |
| Is there a window-length component? | Yes (described in standard) | Implicit — high % typically implies long window |
| Is there an enter/exit-direction component? | Yes ("enters behind, exits in front") | No |
| Is there a percentage-of-swing component? | Implicit | Yes (this IS the metric) |

## Verdict candidate (for user decision — NOT a redesign)

**Candidate B: distinct measurements, but with overlapping evidence basis.**

Reasoning supported by the code above:
- They consume different input fields and apply different thresholds, so they ARE two separate scores at the engine boundary.
- They are conceptually overlapping but not redundant: `bat_path` adds an **enter/exit-direction** signal (behind→in-front) that `on_plane_pct` does not contain; `on_plane_pct` is a **pure duration ratio** that `bat_path` only describes verbally.
- However, because the prompt does not enforce a relationship and the model is left to emit both, there is a real risk that the model is **scoring the same observed swing twice** with two correlated numbers, which would functionally make this Candidate A in production despite being Candidate B in the contract.

### What evidence would settle A vs B vs C

This is logged for the determinism evidence package, not acted on:
1. Query 12+ production rows: compute Pearson correlation between `bat_path_score_100` and `on_plane_pct` across runs. r > 0.95 → behaviorally Candidate A (one number duplicated).
2. Find any run where the two scores disagree by ≥20 points and inspect: does the disagreement track a real enter/exit-direction feature, or is it noise?
3. Inspect prompt rendering — confirm whether the model is being given any guidance to keep these independent or to derive one from the other.

## Recommendation

Do not redesign yet. The contract treats them as distinct; the prompt does not enforce that distinction; production data will settle whether they behave as distinct in practice. Settle this from determinism-investigation evidence, not from suspicion.

No formulas changed. No thresholds changed. No prompt edits. No engine-version bump.
