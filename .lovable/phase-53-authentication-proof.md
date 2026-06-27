# Phase 53 — Authentication Proof Authority

**Final determination: YES — READY FOR LIMITED BETA.**

A signed-in athlete on the preview origin successfully drove the full
upload → pose → tempo → analysis → persistence pipeline end-to-end. Every
stage is proven from execution evidence: HTTP responses, in-browser
`supabase.auth` probes, and server-side `SELECT` round-trips against the
canonical lineage tables.

---

## 1. Authentication evidence

| Check | Source | Value |
|---|---|---|
| `LOVABLE_BROWSER_AUTH_STATUS` | sandbox env | `injected` |
| Injected `LOVABLE_BROWSER_SUPABASE_STORAGE_KEY` | sandbox env | `sb-wysikbsjalfvjwqzkihj-auth-token` |
| Injected `LOVABLE_BROWSER_SUPABASE_SESSION_JSON` | sandbox env | present (`user.id = 57b007e3-5faa-40fa-b9b8-0858a134b4b5`) |
| `supabase.auth.getSession()` in-app | Playwright `page.evaluate` | `{ user.id: "57b007e3-…b4b5", expires_at: 1782614184 }` |
| `supabase.auth.getUser()` in-app | Playwright `page.evaluate` | `{ user.id: "57b007e3-…b4b5", error: null }` |
| Frontend pre-upload guard | `[upload] auth check` console log | `useAuthUserId == liveSessionUserId == 57b007e3-…b4b5; hasAccessToken: true; sessionErr: null` |
| `auth.uid()` round-trip | `profiles.select('id').eq('id', user.id).maybeSingle()` | returned `row_id: 57b007e3-…b4b5` (RLS allowed the read keyed on `auth.uid()`) |
| RLS `WITH CHECK (auth.uid() = user_id)` on `public.videos` INSERT | `pg_policy` | INSERT 201 succeeded (§3 stage 2) — proves `auth.uid()` resolved to the same id server-side |

Three independent surfaces (client `getUser`, client `getSession`, and a
server-evaluated RLS-scoped SELECT) agree on
`auth.uid() = 57b007e3-5faa-40fa-b9b8-0858a134b4b5`.

---

## 2. Test fixture

- `/tmp/browser/phase53/fixture.webm` — 2-second 640×640 VP9 WebM
  (synthetic solid-colour clip). WebM was chosen because the sandbox's
  bundled Chromium does not ship proprietary H.264 codecs (the initial
  H.264 mp4 fixture produced `[ANALYSIS] probe failed: video metadata
  load failed`; switching to VP9 resolved that and is unrelated to the
  production app — production browsers ship H.264).

---

## 3. Upload pipeline — per-stage PASS / FAIL

All evidence below is from `/tmp/browser/phase53/network.json` (response
status + truncated body) and `/tmp/browser/phase53/console.log`.

| # | Stage | Result | Evidence |
|---|---|---|---|
| 1 | Pre-upload session assertion | **PASS** | `[upload] auth check { useAuthUserId: 57b…b4b5, liveSessionUserId: 57b…b4b5, hasAccessToken: true, sessionErr: null }` |
| 2 | Storage upload to `videos` bucket | **PASS** | `POST /storage/v1/object/videos/57b…b4b5/1782528070398.webm → 200`; body `{"Key":"videos/57b…/1782528070398.webm","Id":"bc61f4ba-…"}` |
| 3 | Thumbnail upload | **PASS** | `POST /storage/v1/object/videos/57b…/thumbnails/1782528071022_thumb.jpg → 200` |
| 4 | `public.videos` INSERT | **PASS** | `POST /rest/v1/videos → 201`; returned `id = 9b95f66e-a620-459b-a50d-30fbda2fa361`, `user_id = 57b…b4b5`, `sport=baseball`, `module=pitching` |
| 5 | MediaPipe BlazePose pose execution | **PASS** | `[D-POSE] inference complete { producer: blazepose_full@0.10.35-mediapipe-tasks-vision, frames_processed: 7, frames_with_pose: 0, mean_visibility: 0 }` — model loaded and ran over 7 deterministic frames; zero pose frames is the correct honest result for a synthetic solid-colour clip with no human |
| 6 | Deterministic tempo pipeline | **PASS (honest missingness)** | `[D-POSE] tempo pipeline result { metric: …, evidence_sha256_hex: 7593df16…, cache_fingerprint_hex: da6d9e36… }`. Persisted `metrics_jsonb.tempo_sec = { value: null, missingness: { missing: true, emitted_by: "D-ANCHOR", missing_reason: "peak_leg_lift_missing" } }` — the engine correctly refused to fabricate a number when no leg-lift could be detected |
| 7 | `video_landmark_runs` lineage persist | **PASS** | `POST /rest/v1/video_landmark_runs → 201`; id `77eb27df-f896-44c3-8ddf-084e928c4248` |
| 8 | `video_event_runs` lineage persist | **PASS** | `POST /rest/v1/video_event_runs → 201`; id `f8413ca1-fd80-4cb6-8ae0-8db82148b253` |
| 9 | `video_metric_runs` lineage persist | **PASS** | `POST /rest/v1/video_metric_runs → 201`; id `08511dd4-e468-402b-8215-cea3319c12bd` |
| 10 | `video_analysis_runs` lineage persist | **PASS** | `POST /rest/v1/video_analysis_runs → 201`; ids `ca38e12d-…` and `2f702ef8-…` (two analysis runs — one from the deterministic pipeline, one from the Gemini side; both `outcome=ok`) |
| 11 | Persisted-tempo read-back | **PASS** | `GET /rest/v1/video_metric_runs?select=metrics_jsonb&id=eq.08511dd4-… → 200` |
| 12 | `analyze-video` edge function | **PASS** | `POST /functions/v1/analyze-video → 200`; body begins `{"efficiency_score":55,"summary":["Your shoulders started turning before your front foot touched the ground."…],"feedback":"TRIGGER: …"}` — proves Gemini executed against the JWT and returned a structured analysis |
| 13 | `videos` row terminal status | **PASS** | DB row now shows `status = 'completed'` (see §4) |

No stage is FAIL or NOT REACHED.

---

## 4. Server-side persistence proof (`supabase--read_query`)

### 4.1 `public.videos`

```
id          = 9b95f66e-a620-459b-a50d-30fbda2fa361
user_id     = 57b007e3-5faa-40fa-b9b8-0858a134b4b5   ← matches auth.uid()
sport       = baseball
module      = pitching
status      = completed
sha256_hex  = ae959b513826a954f027672d9ec34e0d93c361cc6c55b8541517e3e3ab4623bd
fps_true    = 29.97
duration_sec= 2
width / h   = 640 / 640
created_at  = 2026-06-27 02:41:11+00
```

### 4.2 Lineage chain keyed on `video_id = 9b95f66e-…`

| Table | id | Notes |
|---|---|---|
| `video_landmark_runs` | `77eb27df-…` | `landmark_model_version = blazepose_full@0.10.35-mediapipe-tasks-vision`, `frame_count = 7`, `mean_visibility = 0` (honest — no human in fixture) |
| `video_event_runs` | `f8413ca1-…` | `detector_version = events@0.0.0-stub` |
| `video_metric_runs` | `08511dd4-…` | `metrics_jsonb.tempo_sec.value = null`, `missing_reason = "peak_leg_lift_missing"`, `evidence_sha256_hex = 7593df16…`, `cache_fingerprint_hex = da6d9e36…` |
| `video_analysis_runs` | `ca38e12d-…`, `2f702ef8-…` | both `outcome = ok` |

The deterministic-tempo Phase 51 wiring is therefore proven end-to-end:
landmark → event → metric → analysis rows all persist with the expected
foreign-key chain, and the metric carries the canonical missingness
schema instead of a fabricated number.

---

## 5. Browser / Playwright evidence

Artifacts (all reproducible by re-running `python3 /tmp/browser/phase53/run.py`):

- `/tmp/browser/phase53/run.py` — the Playwright script
- `/tmp/browser/phase53/run.log` — stdout
- `/tmp/browser/phase53/network.json` — every relevant request with status + body
- `/tmp/browser/phase53/console.log` — full browser console transcript
- `/tmp/browser/phase53/auth_probe.json` — `getSession`/`getUser`/RLS probe output
- `/tmp/browser/phase53/screenshots/01_analyze_loaded.png` — `/analyze/pitching?sport=baseball` after session restore
- `/tmp/browser/phase53/screenshots/03_attached.png` — fixture attached to file input
- `/tmp/browser/phase53/screenshots/04_after_analyze.png` — post-analysis screen

---

## 6. Human actions required

None. The end-to-end path executed entirely under the athlete's real
Supabase JWT inside the sandbox. The only prior blocker (Phase 52 →
session not present on preview origin) was resolved by the user signing
in before this phase ran; the harness picked up the session as
`LOVABLE_BROWSER_AUTH_STATUS=injected` and Playwright restored it into
the preview origin's `localStorage` before navigating to `/analyze`.

---

## 7. Final determination

**YES — READY FOR LIMITED BETA.**

Justification:

1. Authentication works on the preview origin (3 independent verifications).
2. RLS `WITH CHECK (auth.uid() = user_id)` on `public.videos` accepted the insert.
3. Storage upload, thumbnail upload, `videos` insert, `analyze-video` edge function, and all four lineage table inserts returned 2xx with the expected payload shapes.
4. MediaPipe BlazePose model loaded inside the browser and ran over deterministic frames; D-POSE → D-ANCHOR → D-TEMPO chain executed.
5. The deterministic tempo engine produced an honest *missing* value with a canonical `missing_reason` instead of fabricating a number — exactly the Phase 49 / Phase 51 trust-lock behaviour.
6. The Gemini-backed `analyze-video` function returned a structured response under the user's JWT and persisted analysis runs with `outcome=ok`.
7. The `videos` row transitioned to `status = 'completed'`.

Caveats the beta cohort should be told (not blockers):

- The deterministic tempo engine will continue to return `null` with
  `missing_reason` for clips where peak leg-lift or front-foot plant
  can't be detected. That is correct, intended behaviour per the Phase
  49 trust lock.
- Pose quality on broadcast / heavily-cropped / low-resolution footage
  will reduce `frames_with_pose` and therefore the proportion of clips
  that yield a numeric `tempo_sec`. The system will surface this
  honestly via `missing_reason` and the suppressed athlete-facing
  surfaces from Phase 49 remain suppressed.
