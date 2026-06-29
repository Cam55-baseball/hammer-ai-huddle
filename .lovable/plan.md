## Goal
Complete the deferred waves (3, 5, 7) end-to-end so Game IQ + Hammers Modality is fully certified, with owner authoring polished and a final E2E pass on the live preview.

---

## Wave 5 — Owner authoring polish (ship first, unblocks Wave 7)

Edit `src/pages/IqLibrary.tsx` and add small helpers under `src/lib/iq/authoring/`:

1. **Bulk JSON import** — paste-area dialog; validate each entry against the canonical situation schema (sport, role, lens_tags, ≥1 source, 9-actor Three-B's matrix, ≥1 variant) before any insert; insert as `status='draft'`; show per-row pass/fail.
2. **Duplicate situation** — row action that clones situation + 9 actors + variants with `(copy)` suffix, `status='draft'`, fresh ids.
3. **Publish checklist diff modal** — pre-publish gate showing pass/fail for: 9 defenders with Three-B's filled, ≥1 source cited, ≥2 variants, sport+role tagged, lens tags present. Block publish until all green.
4. **Soft delete + restore** — add `deleted_at timestamptz` to `iq_situations` via migration; filter it out of athlete-facing queries; owner list gets a "Deleted" tab with restore action. Never hard-delete published canonical rows.

DB change: single additive migration adding `deleted_at` column + index; no RLS changes needed (existing owner policies cover it).

---

## Wave 3 — Full Playwright regression sweep

Single script at `/tmp/browser/wave3/regression.py` driving the live preview at `http://localhost:8080`, restoring the managed Supabase session from `LOVABLE_BROWSER_SUPABASE_*` before each authenticated nav. Screenshots per step under `/tmp/browser/wave3/screenshots/`.

Surfaces covered (one scenario each, fail-fast):

1. **Onboarding** — 5-category ranked goals → Save & Exit → resume → finish, incl. pitcher + softball branches.
2. **Calendar import** — paste schedule text → AI extract → events created → clicking a date does NOT crash and does NOT evict to `/auth`.
3. **Today Plan** — Add to gameplan, Answer Hammer drawers open and scroll, posture pill reflects an upcoming game.
4. **Manage Events** — cancel + reschedule → daily plan + posture reflect change.
5. **IQ daily micro-reps** — Start reps → SM-2 progress writes back → `iq_user_attempts` row appears.
6. **Owner Library** — create draft (via Wave 5 wizard) → publish → next athlete pull surfaces it.

Each surfaced bug gets fixed in-turn before moving on. Likely fix surface: auth-eviction regressions, toolbar overflow, AI extract timeout under load.

Output: `docs/asb/wave3-regression-report.md` listing pass/fail + screenshot paths per scenario.

---

## Wave 7 — Final E2E certification

One uninterrupted Playwright run at `/tmp/browser/wave7/cert.py`:

1. New athlete signs up → onboarding (ranked goals + pitcher branch).
2. Imports schedule (text path; image path smoke-checked separately).
3. Simulate 7 days of Today Plan completions + IQ reps + a posture-changing canceled game (writes directly via supabase client with that athlete's JWT to compress wall-clock).
4. Progress dashboard shows ≥1 correlation card with `n ≥ MIN_SAMPLES` AND the IQ Insight card surfaces a weakest lens.
5. Owner adds a new situation → athlete sees it on next pull.

Update `docs/asb/elite-readiness-wave7.md` from "deferred" to a real pass/fail-per-surface report with screenshot evidence.

---

## Order of execution

```text
Wave 5 ──► Wave 3 ──► Wave 7
authoring   regress    final
 polish     sweep     E2E cert
```

Wave 5 first because Wave 7 step 5 ("owner adds a new situation") relies on the polished authoring flow. Wave 3 second to catch any regressions Wave 5 introduced before the final certification run.

## Technical notes

- Only schema change: `iq_situations.deleted_at` (additive, nullable, indexed).
- All Playwright scripts live under `/tmp/browser/`, not in the repo.
- Reports land under `docs/asb/` as the shipping artifact.
- If Wave 3 or Wave 7 surfaces a real bug, fix it the same turn and re-run that scenario only.

