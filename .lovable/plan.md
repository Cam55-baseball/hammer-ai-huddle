# Elite Pregame Dossier & Personal Hitting/Pitching Plan Engine

A .01% pregame planning headquarters inside Game Hub. Build dossiers on opposing pitchers (and for pitchers — opposing hitters), generate a fully personalized pregame plan grounded in **your career history vs that pitcher, your history vs that archetype, your current tendencies, and live form**, tag the dossier on the Game and every at-bat, then close the loop post-game with Plan-vs-Reality + per-AB swing analysis. Sport-aware (baseball vs softball) and subscription-aware (hitter, pitcher, two-way).

---

## 1. Dossier intake (works for new or known opponents)

In Game Hub → "Scouting profiles", **New / Edit dossier** accepts:

- **Free-text notes & tendencies** — arm slot, release height, extension, arsenal + usage%, velo bands, IVB/HB, zone map, whiff% per pitch, ahead/behind tendencies, first-pitch behavior, confidence/last-start state, runners-on patterns.
- **File uploads** — TrackMan / Rapsodo / GameChanger CSV + PDF. Gemini parses release_height, extension, IVB/HB, spin, zone%, whiff% per pitch.
- **Image uploads** — TrackMan screenshots, scout cards, spray charts. Gemini Vision extracts the same fields.
- **Video uploads** — bullpen / live AB clips of the pitcher (or hitter, mirrored). Stored on the dossier, watchable from the plan, and feed AI's "what to expect visually" notes.

All extractions write into a structured `tendencies` JSON so the engine has typed fields (release_height_in, extension_ft, arsenal[], zone_usage, whiff_by_pitch, first_pitch_strike%, etc.) instead of just prose.

## 2. Personal plan generator (the elite text you described)

Press **Generate plan** on a dossier → AI ("Hammer") produces a pregame plan that reads like the example in the request. Inputs blended:

1. **Pitcher fingerprint** — release vs league avg, extension → perceived velo, arsenal + usage, zone tendencies, whiff zones, count behavior, confidence state.
2. **My career vs THIS pitcher** — every `gp_at_bat` previously tagged with this `pitcher_dossier_id`, outcomes by pitch type and zone.
3. **My history vs this ARCHETYPE** — pitcher archetype tag (e.g. high-slot RHP ride-FB + back-foot SL); pulls all my ABs vs that archetype.
4. **My current swing tendencies** — first-pitch swing%, chase%, hot/cold zones, performance by pitch type from `gp_at_bats` + `gp_pitches`.
5. **Live form** — last 7–14d `gpSignal`.

Output sections: **Read** (release/extension/perceived velo, what to see), **Attack zones** (where to hunt vs avoid, per pitch), **Count plan** (0-0, ahead, behind, 2-strike), **Matchup edge** (where you out-leverage him, where he out-leverages you), **Pregame cues** (3–5 short cues), **Pregame drills** (1–3 tee/soft-toss/vision drills from the existing drill catalog matched to his arsenal + your weak zones), **Confidence frame** (mental cue based on his last-start state and your form).

Pitcher-mirror generates the same shape against a hitter dossier: hot/cold zones, chase tendencies, count attack plan, pitch-sequence recommendations, "best put-away" suggestion, pregame bullpen focus.

## 3. Game-time linkage

- Game creation: **Probable pitcher** field selects an existing dossier or creates a new one. The plan can be opened from the Game Hub header.
- Every new `gp_at_bat` inherits `pitcher_dossier_id` + archetype tag automatically.
- Per-AB **video upload** field (already partly exists) ties the clip to that AB + dossier.

## 4. Post-game Plan-vs-Reality + per-AB swing analysis

After the game:

- **Plan-vs-Reality report** — AI compares each plan claim ("he'll attack first-pitch in zone", "back-foot SL with two strikes") to what actually happened from `gp_pitches`. Scores plan accuracy 0–100 and flags which recommendations helped vs hurt.
- **Per-AB swing analysis** — for each uploaded AB clip, AI grades mechanics in the context of that pitch (pitch type, location, count) AND in the context of this pitcher archetype. Output: what broke down, why this pitcher type caused it, **drills + cues** to fix it before the next matchup of that archetype.
- **Game roll-up** — how the plan + your swing matched up vs this archetype overall; updates your archetype performance ledger.

## 5. Learning loop (.01% planner improvement)

Each plan + outcome pair writes to a `plan_outcomes` ledger: which recommendations were followed, which worked, which failed, plus any user notes ("the back-foot SL read was wrong, he hung it middle"). The generator pulls the user's last N plans as few-shot context and re-weights archetype priors per user (e.g. "for THIS hitter, 'be patient early' under-performs vs high-slot RHPs — bias toward 'ambush first-pitch FB'"). Sport- and role-specific (baseball-hitter, baseball-pitcher, softball-hitter, softball-pitcher) so learning never crosses contexts.

## 6. Sport & subscription awareness

- Baseball-only users see baseball pitch types, distances, archetypes (e.g. ride FB, sweeper, splitter).
- Softball-only users see riseball, drop, screw, change; underhand release geometry; shorter distance perceived-velo math.
- Two-way + appropriate subscription unlocks the pitcher-side mirror automatically.

---

## Technical details

### Data model (additive — extends existing `gp_*` ledger)

Reuses `gp_pitcher_dossiers` and `gp_opponent_hitters`; adds:

- `tendencies` already JSON — formalize a typed sub-schema (release_height_in, extension_ft, arsenal[], usage_pct, velo_band, ivb, hb, zone_usage, whiff_by_pitch, fps_pct, ahead_pattern, behind_pattern, confidence_state, last_start_summary, archetype_tags[]).
- New columns: `archetype` text, `video_urls` text[], `attachments` jsonb (CSV/PDF/image refs in `gp-documents` bucket).
- New table `gp_pregame_plans` (id, user_id, sport, game_id, dossier_id, dossier_kind 'pitcher'|'hitter', plan_json, plan_markdown, model, engine_version, created_at).
- New table `gp_plan_outcomes` (plan_id, ab_id nullable, recommendation_key, followed bool, worked bool, evidence jsonb, user_note text).
- New table `gp_ab_swing_analyses` (ab_id, video_url, mechanics_json, pitcher_context jsonb, drills text[], cues text[], created_at).
- `gp_at_bats` already has the pitcher link via dossier; ensure `archetype` snapshot stored on the AB at creation time.
- `gp_games`: add `probable_pitcher_dossier_id`.

All new tables: GRANT to authenticated + service_role, RLS scoped to `auth.uid()`.

### Edge functions

- `gp-extract-dossier-fields` — Gemini Vision/PDF/CSV parser → fills `tendencies` from uploads.
- `gp-generate-pregame-plan` — Gemini call assembling pitcher fingerprint + my-vs-this-pitcher + my-vs-archetype + tendencies + form + last-N learned plans → structured plan JSON + markdown. `withHeartbeat` wrapped.
- `gp-plan-vs-reality` — post-game diff of plan claims vs `gp_pitches`/`gp_at_bats`.
- `gp-analyze-ab-swing` — extends current `analyze-video` with pitcher-archetype context + at-bat metadata; returns mechanics + drills + cues.
- `gp-update-learning-priors` — nightly cron: re-weights per-user archetype priors from `gp_plan_outcomes`.

### UI

- `src/components/games/DossierEditor.tsx` — tabbed editor: Notes · Files · Images · Videos · Tendencies (typed form auto-filled by extraction).
- `src/components/games/PregamePlan.tsx` — renders plan sections, drill chips link into the existing drill runner, "Save & tag game" button.
- `src/components/games/PlanVsRealityReport.tsx` — per-claim scorecard.
- Per-AB row in `AtBatLogger.tsx` gets an "Analyze swing" upload + drawer wiring `gp-analyze-ab-swing`.
- `GameSheet.tsx` header: "Probable pitcher" picker → dossier + plan.

### Sport split

`src/lib/games/archetypes.baseball.ts` and `archetypes.softball.ts` define archetype detection rules + plan language packs; selector by user sport.

### Storage

Reuses `gp-documents` bucket for files/images and a new `gp-dossier-videos` bucket for pitcher/hitter clips (private, signed-URL playback).
