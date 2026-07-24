## Problem

When a user taps a position on a Game IQ situation (e.g. `/iq/squeeze-r3-defense`), the card shows a one‑liner like *"Charge — typically owns this ball"*. The DB already has slots for richer coaching content but most rows only hold 2–5 words, and two useful columns (`footwork_cue`, `eyes_target`) are almost entirely `NULL`.

Verified against the live DB for `squeeze-r3-defense`: `coaching_note` values are things like `"Crash hard"`, `"Trail"`, `"Cover 1B"`, `"Backup 1B"`; every `footwork_cue` and `eyes_target` is `NULL`; `secondary_read` uses the same generic sentence on almost every defender.

## Goal

Every position, in every situation, produces a coach‑grade explanation that reads like a real infield/outfield instruction — specific to the play, the role, and the assignment — and the click card renders all of it cleanly.

## Scope

- All ~114 published `iq_situations` rows and their `iq_situation_actors`.
- Two touch points: (1) content in the DB, (2) the click card UI in `src/pages/GameIqSituation.tsx`.
- No changes to routing, quiz flow, animations, or authoring UI.

## Approach

### 1. Content model per actor (what "better" means)

Each defender/runner card will consistently answer six questions, each mapped to an existing column so we don't add schema:

| Field | What it must say |
|---|---|
| `coaching_note` | 1–2 sentences: what this role is doing on this exact play and why (route, priority, decision trigger). |
| `footwork_cue` | The first move: stance → first step → path shape (e.g. "Crossover step toward the line, then arc to the ball"). |
| `eyes_target` | Where the eyes go, in order (e.g. "Bat first, then ball off the bat, then R3"). |
| `communication_call` | The actual word(s) yelled (kept short). |
| `secondary_read` | The "If X happens…" branch specific to this role, not the same generic line reused everywhere. |
| `elite_cue` | The pro‑level detail (timing, angle, tempo). |
| `common_mistake` | The specific failure mode for this role on this play. |

### 2. Content generation

Build a one‑shot backfill script `scripts/iq/enrich-actor-explanations.ts` (Deno, run locally against the service role) that:

1. Loads every `iq_situation` with its `iq_situation_actors`, `iq_scenarios`, `sources`, `lens_tags`, and `alignment_preset`.
2. For each actor, calls Gemini 1.5 Pro through the existing gateway with a strict JSON schema returning the six fields above.
3. The prompt gives the model the situation title/summary, the actor's role + assignment + primary_path endpoints, the other actors' roles/assignments (so it knows who else is doing what), and the canonical sources listed on the situation.
4. Guardrails in the prompt: role‑specific verbs only, no invented rules, must cite behavior consistent with `assignment` (`ball` = field/attack, `bag` = cover, `backup` = trail line, `read` = decision, `execute` = action, `idle` = hold), max 220 chars per field.
5. Writes results to a generated SQL migration `supabase/migrations/<ts>_iq_actor_explanations_backfill.sql` as `UPDATE` statements keyed by `(situation_id, role)`. Nothing is written directly — the migration is the artifact, so the owner can diff/approve.
6. Preserves existing non‑empty fields when the new value is shorter or lower quality (length + keyword check).

Run order:
```text
1. Author runs the script locally  →  produces the migration file
2. Migration is applied through the normal migration flow
3. Owner spot-checks in /owner/iq authoring UI
```

### 3. UI: surface the new fields

Edit `src/pages/GameIqSituation.tsx` (the `hoveredActor` card, lines ~331–361) to render, in this order, only when present:

1. Title + assignment badge (existing)
2. `coaching_note` (existing)
3. **Footwork** — `footwork_cue` (new section, small icon)
4. **Eyes** — `eyes_target` (new section, small icon)
5. **Call** — `communication_call` (existing)
6. **If…** — `secondary_read` (existing)
7. **Elite cue** — `elite_cue` (existing)
8. **Common mistake** — `common_mistake` (existing)

Same treatment in the quiz debrief where actor notes render (`IqScenarioRunner.tsx` around line 207) so the position button in quiz mode shows the same richer card.

No schema change: `footwork_cue` and `eyes_target` columns already exist in `iq_situation_actors`.

### 4. Verification

- After migration: query 5 sampled situations across defense/offense/pitching lenses; confirm every actor has non‑empty `coaching_note`, `footwork_cue`, `eyes_target`, `secondary_read` and that `secondary_read` differs across roles within the same situation.
- Load `/iq/squeeze-r3-defense`, click each of P, C, 1B, 2B, 3B, SS, LF, CF, RF, R3, and confirm the card renders all sections with role‑specific content.
- Repeat on one baserunning and one pitching situation.

## Technical Details

- Files touched:
  - New: `scripts/iq/enrich-actor-explanations.ts`
  - New: `supabase/migrations/<ts>_iq_actor_explanations_backfill.sql` (generated)
  - Edit: `src/pages/GameIqSituation.tsx` (hoveredActor card only)
  - Edit: `src/components/iq/IqScenarioRunner.tsx` (position debrief block only)
- No changes to `iq_situation_actors` schema, RLS, or grants.
- No changes to `IqDiamond`, timeline, animation, alignment resolver, or scoring.
- The Gemini call runs offline in the script, not at request time, so there is zero runtime cost or latency impact.

## Out of Scope

- Rewriting the authoring UI.
- Changing quiz scoring or scenario branching.
- Localizing the new copy (English only, matching current content).
