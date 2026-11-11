# Open services review (report only — nothing changed)

Date: 2026-11-11. Owner-approved read-only security check. No code, settings, scheduled jobs, deployments or data were changed. Every claim below comes from reading the function code in `supabase/functions/` (following local and `_shared/` imports), `supabase/config.toml`, read-only database reads (`cron.job`, `public.cron_call`, database functions), or the five harmless requests described in section 1.

## 1. What the platform does for a function (evidence)

Five requests, each to a function whose own code refuses before doing anything:

| # | Request | Answer | Who answered |
|---|---|---|---|
| P1 | `get-my-analysis-report` (NOT listed in config.toml), GET, no headers at all | 405 `{"error":"POST required"}` | The function's own code — the platform let it in |
| P2 | same, POST, only the public app key | 401 `{"error":"Unauthorized"}` | The function's own code |
| P3 | `delete-account` (listed `verify_jwt = true`), POST, no headers | 401 `{"code":"UNAUTHORIZED_NO_AUTH_HEADER"}` + `sb-error-code` header | The platform |
| P4 | same, POST, only the public app key | 401 `{"error":"Unauthorized"}` | The function's own code — the platform let it in |
| P5 | same, POST, a made-up token | 401 `{"code":"UNAUTHORIZED_INVALID_JWT_FORMAT"}` | The platform |

Also seen earlier (Nov 11): `analyze-video` (listed `verify_jwt = false`) answered a no-key request with its own 403.

**Conclusions**
- A function NOT listed in config.toml lets in requests with no key at all (P1). That is why `tcs-shadow-run` was open.
- `verify_jwt = true` only refuses a missing or malformed key. The public app key (it ships inside the website and the iPhone app, so anyone can copy it) passes (P4). **So `verify_jwt = true` is not sign-in.** Only the function's own check protects it.
- `verify_jwt = false` behaves like not listed (no key needed).
- Answer to (a) for every function: the platform lets in a request without sign-in. For the 64 listed `true` it needs the public key; for the other 131 it needs nothing.
- Limits: I probed one function of each kind; other functions' live settings are taken from config.toml. I checked the functions in the repo (195); I did not list what is deployed live.

## 2. Scheduled jobs that call a function

`public.cron_call(fn, body)` sends only the public app key (its key's role is `anon`, read from the key itself; the key was never printed). Every job below that says "public key" therefore carries no real credential.

| Job | Schedule (UTC) | Calls | Sends |
|---|---|---|---|
| 5 | 05:00 daily | `nightly-mpi-process` | public key |
| 7 | 03:00 daily | `verify-link-integrity` | public key |
| 11 | Sun 03:00 | `discover-tag-patterns` | public key |
| 12 | 06:00 daily | `nightly-hie-process` | public key |
| 13 | every 15 min | `hie-refresh-worker` | public key (cron_call) |
| 14 | every 15 min | `compute-hammer-state` | public key (cron_call) |
| 15 | :37 hourly | `engine-heartbeat` | public key (cron_call) |
| 17 | :07 hourly | `engine-sentinel` | public key |
| 19 | 01:23 daily | `engine-adversarial` | public key (cron_call) |
| 21 | 04:43 daily | `engine-weight-optimizer` | public key (cron_call) |
| 22 | 04:31 daily | `evaluate-advice-effectiveness` | public key (cron_call) |
| 24 | Sun 05:13 | `update-user-engine-profile` | public key |
| 29 | 04:17 daily | `predict-hammer-state` | public key (cron_call) |
| 32 | 01:11 daily | `engine-regression-runner` | public key (cron_call) |
| 33 | 04:37 daily | `evaluate-predictions` | public key (cron_call) |
| 34 | :52 hourly | `compute-system-health` | public key |
| 40 | every 30 min | `engine-auto-recovery` | public key (cron_call) |
| 41 | 06:15 daily | `engine-data-integrity-check` | public key |
| 44 | :05 hourly | `evaluate-behavioral-state` | public key (cron_call) |
| 45 | 04:25 daily | `detect-behavior-patterns` | public key (cron_call) |
| 46 | Mon 12:00 | `generate-follower-reports` | public key |
| 47 | 1st of month 13:00 | `generate-follower-reports` | public key |
| 49 | :07 hourly | `retry-follower-reports` | public key (cron_call) |
| 50 | 02:00 daily | `recompute-foundation-effectiveness` | public key |
| 51 | 03:00 daily | `nightly-foundation-health` | public key |
| 52 | :15 hourly | `hourly-trigger-decay` | public key (cron_call) |
| 53 | 04:00 daily | `daily-trace-prune` | public key |
| 54 | every 4 h | `foundation-health-alerts` | public key (cron_call) |
| 55 | 04:30 daily | `foundation-alert-retention` | public key |
| 56 | 04:00 daily | `iq-decay` | public key |
| 60 | 02:00 daily | `tcs-shadow-run` | job credential |
| 61 | 04:30 daily | `tcs-shadow-run` | job credential |
| 62 | Mon 06:00 | `tcs-shadow-run` | job credential |
| 65 | 03:40 daily | `compute-hammer-state` | public key (cron_call) |
| 81 | 04:45 daily | `tcs-auto-off` | public key (cron_call) |
| 82 | 05:20 daily | `ti-watchdog` | public key (cron_call) |
| 83 | 12:00 daily | `ti-watchdog` | public key (cron_call) |
| 84 | 02:20 daily | `tcs-shadow-run` | job credential |
| 85 | 03:10 daily | `ti-auto-activate` | public key (cron_call) |
| 86 | 06:15 daily | `adaptive-phases-shadow` | public key (cron_call) |
| 87 | 07:20 daily | `stripe-reconcile` | its own x-reconcile-token |
| 88 | every 10 min | `wk-daily-plan-job` | job credential |
| 89 | :30 hourly | `wk-daily-plan-job` | job credential |
| 91 | 14:00 daily | `renewal-reminders` | job credential |
| 92 | 04:30 daily | `intel-recheck-job` | job credential |
| 93 | 00:10 daily | `analysis-canary` | job credential |
| 94 | :25 hourly | `cleanup-temporary-uploads` | job credential |

Database-only jobs (no function called): 1, 2, 16, 18, 20, 25–28, 30, 31, 35–39, 42, 43, 90. Database triggers that call functions with the public key: `push_enqueue` → `send-push`; `trigger_render_on_queue_insert` → `render-promo`.

Totals: 47 function-calling jobs; 10 send the job credential, 1 sends its own token, 36 send only the public key.

## 3. Counts per group

- **JOB CREDENTIAL ONLY**: 37
- **REQUIRE SIGN-IN / ROLE**: 13
- **NOT SURE**: 5
- **OPEN ON PURPOSE**: 10
- **PROTECTED**: 130
- Total: 195

How "PROTECTED" was judged: the function's own code calls a sign-in check (`auth.getUser` / `getClaims` / the shared `guardSignedInNotPaused` or `requireUser`) or a credential/signature check, and refuses (401/403 or a thrown sign-in error) before its first write, paid AI call, email or function call. Six functions where the order looked wrong were read by hand. This was a source review: it did not test whether a signed-in user can read another person's data (a separate check).

## 4. Proposed changes (nothing applied)

Shared pattern for every **JOB CREDENTIAL ONLY** item: reuse the existing `x-job-token` check (same Vault `wk_daily_plan_job_token` digest used by `tcs-shadow-run` and `wk-daily-plan-job`), and also accept the service-role key for function-to-function calls. Order: (1) update the job(s) to send `x-job-token` (the function still accepts everything, nothing breaks); (2) then deploy the refusing function. For `cron_call` jobs that means a new `cron_call` variant that adds the header (or editing the job's command), changing only the named jobs. These functions are not called by the website or iPhone app, so no app version is affected, except where noted (compute-hammer-state, ti-watchdog, adaptive-phases-shadow).

Shared pattern for **REQUIRE SIGN-IN / ROLE**: refuse unless `auth.getUser(token)` returns a user (and the role named), before reading the body. The live website and older iPhone builds already send the signed-in user's token through `supabase.functions.invoke`, so they keep working; only signed-out callers are refused. Exceptions noted per row.

### JOB CREDENTIAL ONLY

| Function | Code check today | Can do | Called by | Proposal / risk if left open |
|---|---|---|---|---|
| `adaptive-phases-shadow` | Public key + {"all":true} runs the full recompute; otherwise owner/admin sign-in | writes data, bypasses row rules | jobs 86; functions: create-test-athlete | Job 86 sends the public key. Proposal: require the job credential instead of the public key; update job 86. RISK: anyone can start the all-player shadow recompute (heavy). |
| `compute-system-health` | None | writes data, bypasses row rules | jobs 34 | Job 34. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `daily-trace-prune` | None | writes data, bypasses row rules | jobs 53 | Job 53. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `detect-behavior-patterns` | None | writes data, bypasses row rules | jobs 45 | Job 45. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load, every-player batch). |
| `discover-tag-patterns` | None | writes data, bypasses row rules | jobs 11 | Job 11. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `engine-adversarial` | None | writes data, account admin, calls functions, bypasses row rules | jobs 19 | Job 19. Creates/uses sandbox auth users (admin API). Proposal: job credential; update job 19. RISK: anyone can run it. |
| `engine-auto-recovery` | None | writes data, calls functions, bypasses row rules | jobs 40 | Job 40. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `engine-data-integrity-check` | None | writes data, bypasses row rules | jobs 41 | Job 41. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `engine-heartbeat` | None | writes data, calls functions, bypasses row rules | jobs 15 | Job 15. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `engine-regression-runner` | None | writes data, bypasses row rules | jobs 32 | Job 32. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `engine-sentinel` | None | writes data, bypasses row rules | jobs 17 | Job 17. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `engine-weight-optimizer` | None | writes data, bypasses row rules | jobs 21 | Job 21. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `evaluate-advice-effectiveness` | None | writes data, bypasses row rules | jobs 22 | Job 22. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `evaluate-predictions` | None | writes data, bypasses row rules | jobs 33 | Job 33. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load, every-player batch). |
| `extract-patterns` | None | writes data, bypasses row rules | none found | No job or caller found. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `foundation-alert-retention` | None | writes data, bypasses row rules | jobs 55 | Job 55. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `foundation-health-alerts` | None | writes data, email, bypasses row rules | jobs 54 | Job 54. Proposal: job credential; update job 54. RISK: anyone can trigger alert emails to staff. |
| `generate-elite-layer` | None | writes data, bypasses row rules | functions: compute-hammer-state | Called by compute-hammer-state (service key). Proposal: service key only. |
| `generate-follower-reports` | None | writes data, paid AI, bypasses row rules | jobs 46, 47; functions: retry-follower-reports | Jobs 46/47 and retry-follower-reports. Proposal: job credential or service key; update jobs 46/47. RISK: anyone can regenerate follower reports for every follower (heavy; report notifications). |
| `generate-interventions` | None | writes data, bypasses row rules | functions: predict-hammer-state | Called by predict-hammer-state. Proposal: service key only. |
| `hie-analyze` | None | writes data, paid AI, calls functions, bypasses row rules | functions: calculate-session, hie-refresh-worker, hie-verify, nightly-hie-process, nightly-mpi-process | Called by calculate-session, nightly-hie-process, hie-refresh-worker, hie-verify, nightly-mpi-process (service key). Proposal: refuse unless service-role key or job credential. RISK: returns any player's full development snapshot for a user_id without sign-in; paid AI calls; heavy reads. |
| `hie-refresh-worker` | None | writes data, calls functions, bypasses row rules | jobs 13; functions: engine-adversarial, engine-heartbeat | Job 13. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load, every-player batch). |
| `hie-verify-continuation` | None | writes data, calls functions, bypasses row rules | none found | Called by nightly-mpi-process. Proposal: service key/job credential. |
| `hourly-trigger-decay` | None | writes data, bypasses row rules | jobs 52 | Job 52. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `iq-decay` | None | writes data, bypasses row rules | jobs 56 | Job 56. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `nightly-foundation-health` | None | writes data, bypasses row rules | jobs 51 | Job 51. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `nightly-hie-process` | None | writes data, calls functions, bypasses row rules | jobs 12 | Job 12. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load, every-player batch). |
| `nightly-mpi-process` | None | writes data, calls functions, bypasses row rules | jobs 5; functions: hie-verify-continuation | Job 5. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load, every-player batch). |
| `predict-hammer-state` | None | writes data, calls functions, bypasses row rules | jobs 29 | Job 29. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load, every-player batch). |
| `recompute-foundation-effectiveness` | None | writes data, bypasses row rules | jobs 50 | Job 50. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `render-promo` | None | writes data, bypasses row rules | database trigger trigger_render_on_queue_insert (public key) | Database trigger on promo_render_queue insert. Proposal: trigger sends the job credential; function refuses others. RISK: anyone can re-run paid cloud video renders of queued promos. |
| `retry-follower-reports` | None | reads data, calls functions, bypasses row rules | jobs 49 | Job 49. Proposal: job credential; update job 49. |
| `tcs-auto-off` | None | writes data, bypasses row rules | jobs 81 | Job 81. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `ti-auto-activate` | Owner check only if a real user token is sent; no token or the public key runs | writes data, bypasses row rules | jobs 85 | Job 85 (public key). Proposal: job credential or service key, plus owner sign-in; update job 85. RISK: anyone can start plan-intelligence activation batches. |
| `ti-watchdog` | None | writes data, bypasses row rules | jobs 82, 83; app (1 file) | Jobs 82/83 and the owner page AdminTrainingIntelligence. Proposal: job credential, or owner sign-in for the page; update jobs 82/83. RISK: anyone can trigger scans/digests (writes notes, heavy reads). |
| `update-user-engine-profile` | None | writes data, bypasses row rules | jobs 24 | Job 24. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load, every-player batch). |
| `verify-link-integrity` | None | writes data, bypasses row rules | jobs 7 | Job 7. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |

### REQUIRE SIGN-IN / ROLE

| Function | Code check today | Can do | Called by | Proposal / risk if left open |
|---|---|---|---|---|
| `check-render-status` | None | writes data, bypasses row rules | none found | App promo engine (usePromoEngine). Proposal: owner/admin sign-in. RISK: anyone can change render status rows. |
| `compute-hammer-state` | None | writes data, calls functions, bypasses row rules | jobs 14, 65; app (5 files); functions: engine-adversarial, engine-auto-recovery, engine-heartbeat, hie-refresh-worker, save-streak | App (GamePlanCard and 4 others) sends the player's own user_id; jobs 14 and 65 run all players. Proposal: sign-in for own id only, or job credential/service key for batch; update jobs 14/65 to send the job credential. RISK: anyone can start a 500-player batch every call (heavy DB load) or recompute any player. |
| `generate-drills` | None | writes data, paid AI, bypasses row rules | app (2 files) | Owner pages PendingDrillsQueue/DrillCmsManager. Proposal: owner/admin sign-in. RISK: paid AI + anyone can add pending drills. |
| `gp-update-priors` | None | writes data, bypasses row rules | app (1 file) | App usePregamePlan. Proposal: sign-in (coach/player of that game). RISK: anyone can write planner priors. |
| `hie-team-plan` | None | paid AI | app (1 file) | App TeamWeaknessEngine (coach). Proposal: coach/staff sign-in. RISK: paid AI for anyone. |
| `iq-alignment-audit` | None (sign-in only used to label the run) | writes data, bypasses row rules | app (1 file) | Owner page IqAlignmentAudit. Proposal: owner/admin sign-in. RISK: anyone can start full audit runs (heavy, writes run rows). |
| `notify-guardian-minor-signup` | None (needs a real 13–17 user id) | writes data, email, account admin, bypasses row rules | none found | App AuthContext at sign-up. Proposal: sign-in as that new user (session exists right after sign-up — verify with email-confirm setting). RISK: repeated emails to any address for a known minor id. |
| `parse-food-text` | Only checks a "Bearer" header exists (public key passes) | paid AI | app (1 file) | App nutrition. Proposal: real sign-in. RISK: free paid-AI calls for anyone. |
| `parse-recipe-url` | None (platform needs any valid key) | paid AI | app (1 file) | App nutrition. Proposal: sign-in. RISK: paid AI + server fetches any web address for anyone. |
| `parse-season-schedule` | None (platform needs any valid key) | writes data, paid AI, bypasses row rules | app (1 file) | App season importer. Proposal: sign-in. RISK: paid AI for anyone. |
| `save-streak` | None (trusts user_id in the body) | writes data, calls functions, bypasses row rules | app (1 file) | App useQuickActionExecutor. Proposal: take the id from sign-in only; ignore body user_id unless service key. RISK: anyone can add fake completed activity logs to any player and trigger their recompute. |
| `submit-idea` | None | email | app (1 file) | App IdeaDropBox. Proposal: sign-in (or rate limit). RISK: unwanted emails to the owner inbox. |
| `translate-video-content` | None | paid AI | app (1 file) | App VideoLibraryPlayer. Proposal: sign-in. RISK: paid AI for anyone. |

### NOT SURE

| Function | Code check today | Can do | Called by | Proposal / risk if left open |
|---|---|---|---|---|
| `classify-league` | None (platform needs any valid key) | paid AI, bypasses row rules | none found | No caller found in the app or functions. Need: is it still used? If not, retire; else sign-in. Paid AI. |
| `hie-verify` | None | reads data, calls functions, bypasses row rules | none found | No caller found; calls hie-analyze. Need: still used? |
| `recompute-video-metrics` | None | writes data, bypasses row rules | none found | No caller or job found. Changes video tag rules. Need: still used? |
| `training-block-notifications` | None | writes data, bypasses row rules | none found | No caller or job found. Writes notifications. Need: still used? |
| `translate-content` | None | paid AI | none found | No caller found. Paid AI. Need: still used? |

### OPEN ON PURPOSE

| Function | Code check today | Can do | Called by | Proposal / risk if left open |
|---|---|---|---|---|
| `analytics-ingest` | None (allow-listed event names) | writes data, bypasses row rules | app (1 file) | Launch events before sign-in; service-role insert; no rate limit (table spam possible). |
| `create-bundle-checkout` | Optional sign-in; guest checkout allowed | reads data, Stripe, bypasses row rules | app (1 file) | Creates a Stripe checkout page only; price checked server-side. |
| `get-owner-profile` | None | reads data, paid AI, bypasses row rules | app (1 file) | Public coach bio. RISK: any non-English request triggers a paid AI translation (no cache, no rate limit). |
| `get-weather` | None | no data | app (1 file) | Free public weather/air APIs; no stored data. Can be used as a free proxy; no rate limit. |
| `gp-shared-report` | Share-link token (16–128 hex) | writes data, bypasses row rules | app (1 file) | Returns a shared game report to whoever holds the link — on purpose. |
| `initialize-owner` | Secret key in body (OWNER_INIT_KEY) | writes data, account admin, bypasses row rules | app (1 file) | One-time owner setup; secret-key protected; no rate limit on guesses. |
| `parent-consent` | Sign-in for most actions; "signup" path open before sign-in behind its switch | writes data, email, Stripe, account admin, files, bypasses row rules | app (1 file) | Under-13 parent sign-up creates an account and sends a receipt email; no rate limit. |
| `send-push` | "test" mode: owner sign-in. Outbox mode: none | writes data, push, bypasses row rules | database trigger push_enqueue (public key) | Outbox mode only sends a queued push created in the last 15 min, once (claimed). Low abuse value. Could later carry the job credential from the trigger. |
| `signup-age-check` | None | no data | app (2 files) | Before sign-in; computes an age answer, stores nothing. |
| `stripe-webhook` | Stripe webhook signature | writes data, Stripe, account admin, bypasses row rules | functions: stripe-health | Webhook from Stripe; signature-checked. |

## 5. Returns a person's data without sign-in

- **`hie-analyze` — yes.** POST `{"user_id": …}` with no key returns that player's whole development snapshot (weakness clusters, readiness, risk alerts, MPI score, week plan) and saves it. Needs only a user id. Highest priority.
- **`compute-hammer-state` — a little.** Returns that player's readiness label (prime/ready/caution/recover) and a confidence number for any user id; it also writes a new snapshot.
- **`notify-guardian-minor-signup` — a little.** Its error answers reveal whether a user id exists and whether it belongs to a 13–17 player.
- **`gp-shared-report` — on purpose.** Returns a shared game report only to someone holding its share-link token.
- **`get-owner-profile` — on purpose.** The owner's public coach bio.
- **`hie-verify` — not sure.** No caller found; it runs `hie-analyze` checks and returns their details. Not read in full.
- Open functions that only return counts or status (nightly/engine jobs) were not listed here.

## 6. Other findings (no change made)

- `evaluate-behavioral-state` accepts only the service-role key or a signed-in user, but job 44 sends the public key, so that job is refused every hour (from code; logs not checked).
- `hie-analyze` calls `prescription-engine` with the service-role key, but `prescription-engine` requires a signed-in user, so that call is refused and the fallback is always used (from code; not checked live).
- `tcs-test-runner` has its own token; no caller found.
- Earlier report said 38 `verify_jwt = false` functions; config.toml lists 38 `false` and 64 `true`; 93 functions are not listed.

## 7. Full table (all functions)

(a) Platform = what the platform does without sign-in. (b) Code check = what the function checks before work. (c) Can do. (d) Called by (app = files in `src/` that call it).

| Function | (a) Platform | (b) Code check | (c) Can do | (d) Called by | Group | Note |
|---|---|---|---|---|---|---|
| `accept-parent-invite` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `adapt-training-block` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `adaptive-phases-shadow` | Lets in with no key (not listed) | Public key + {"all":true} runs the full recompute; otherwise owner/admin sign-in | writes data, bypasses row rules | jobs 86; functions: create-test-athlete | JOB CREDENTIAL ONLY | Job 86 sends the public key. Proposal: require the job credential instead of the public key; update job 86. RISK: anyone can start the all-player shadow recompute (heavy). |
| `admin-cancel-user-subscriptions` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, Stripe, bypasses row rules | app (1 file) | PROTECTED |  |
| `admin-delete-user` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, Stripe, account admin, bypasses row rules | app (1 file) | PROTECTED |  |
| `admin-search-users` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | reads data, account admin, bypasses row rules | app (1 file) | PROTECTED |  |
| `ai-chat` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | reads data, paid AI, bypasses row rules | app (4 files) | PROTECTED |  |
| `ai-helpdesk` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, paid AI, bypasses row rules | app (1 file) | PROTECTED |  |
| `analysis-canary` | Lets in with no key (not listed) | Job credential, or signed-in owner | writes data, email, paid AI, calls functions, bypasses row rules | jobs 93 | PROTECTED |  |
| `analysis-canary-configure` | Lets in with no key (not listed) | Sign-in, refused before work + role/access check | writes data, bypasses row rules | none found | PROTECTED |  |
| `analytics-ingest` | Lets in with no key (not listed) | None (allow-listed event names) | writes data, bypasses row rules | app (1 file) | OPEN ON PURPOSE | Launch events before sign-in; service-role insert; no rate limit (table spam possible). |
| `analyze-base-stealing-rep` | Lets in with no key | Sign-in, refused before work | writes data, SMS, paid AI, bypasses row rules | app (1 file) | PROTECTED |  |
| `analyze-food-photo` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | reads data, paid AI, bypasses row rules | app (1 file) | PROTECTED |  |
| `analyze-guest` | Lets in with no key (not listed) | Sign-in, refused before work + role/access check | writes data, paid AI, bypasses row rules | app (1 file) | PROTECTED |  |
| `analyze-hydration-beverage` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | reads data, paid AI, bypasses row rules | app (1 file) | PROTECTED |  |
| `analyze-hydration-text` | Lets in with no key (not listed) | Sign-in, refused before work | reads data, paid AI, bypasses row rules | app (2 files) | PROTECTED |  |
| `analyze-realtime-playback` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | reads data, paid AI, bypasses row rules | none found | PROTECTED |  |
| `analyze-video` | Lets in with no key | Sign-in matching the clip owner, or owner/job-credential canary | writes data, paid AI, files, bypasses row rules | app (2 files); functions: analysis-canary | PROTECTED |  |
| `analyze-video-description` | Lets in with no key (not listed) | Sign-in, refused before work + role/access check | writes data, paid AI, bypasses row rules | app (2 files) | PROTECTED |  |
| `app-attest` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, SMS, push, bypasses row rules | app (1 file) | PROTECTED |  |
| `app-purchase-handoff` | Lets in with no key (not listed) | Sign-in, refused before work | account admin, bypasses row rules | app (1 file) | PROTECTED |  |
| `approve-scout-application` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `calculate-load` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data | none found | PROTECTED |  |
| `calculate-regulation` | Lets in with no key | Sign-in, refused before work | writes data, paid AI | app (1 file) | PROTECTED |  |
| `calculate-session` | Lets in with no key | Sign-in, refused before work | writes data, calls functions, bypasses row rules | app (1 file) | PROTECTED |  |
| `cancel-all-subscriptions` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data, Stripe, bypasses row rules | app (2 files) | PROTECTED |  |
| `cancel-module-subscription` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data, Stripe, bypasses row rules | app (1 file) | PROTECTED |  |
| `check-render-status` | Lets in with no key | None | writes data, bypasses row rules | none found | REQUIRE SIGN-IN / ROLE | App promo engine (usePromoEngine). Proposal: owner/admin sign-in. RISK: anyone can change render status rows. |
| `check-report-ready` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data, bypasses row rules | none found | PROTECTED |  |
| `check-subscription` | Lets in with no key | Sign-in, refused before work + role/access check | writes data, bypasses row rules | none found | PROTECTED |  |
| `classify-league` | Refuses no-key/invalid; public key passes | None (platform needs any valid key) | paid AI, bypasses row rules | none found | NOT SURE | No caller found in the app or functions. Need: is it still used? If not, retire; else sign-in. Paid AI. |
| `cleanup-temporary-uploads` | Lets in with no key (not listed) | Job credential (x-job-token) before work | writes data, paid AI, files, bypasses row rules | jobs 94 | PROTECTED |  |
| `coach-hammer-next-step` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, paid AI, bypasses row rules | app (1 file) | PROTECTED |  |
| `coach-practice-check` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `coach-rx-safety` | Lets in with no key (not listed) | Sign-in, refused before work + role/access check | writes data, email, account admin, bypasses row rules | app (4 files) | PROTECTED |  |
| `compute-hammer-state` | Lets in with no key (not listed) | None | writes data, calls functions, bypasses row rules | jobs 14, 65; app (5 files); functions: engine-adversarial, engine-auto-recovery, engine-heartbeat, hie-refresh-worker, save-streak | REQUIRE SIGN-IN / ROLE | App (GamePlanCard and 4 others) sends the player's own user_id; jobs 14 and 65 run all players. Proposal: sign-in for own id only, or job credential/service key for batch; update jobs 14/65 to send the job credential. RISK: anyone can start a 500-player batch every call (heavy DB load) or recompute any player. |
| `compute-system-health` | Lets in with no key | None | writes data, bypasses row rules | jobs 34 | JOB CREDENTIAL ONLY | Job 34. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `create-addon-checkout` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, Stripe, account admin, calls functions, bypasses row rules | none found | PROTECTED |  |
| `create-build-checkout` | Lets in with no key (not listed) | Sign-in, refused before work + role/access check | reads data, Stripe | app (1 file) | PROTECTED |  |
| `create-bundle-checkout` | Lets in with no key | Optional sign-in; guest checkout allowed | reads data, Stripe, bypasses row rules | app (1 file) | OPEN ON PURPOSE | Creates a Stripe checkout page only; price checked server-side. |
| `create-checkout` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | reads data, Stripe, bypasses row rules | app (1 file) | PROTECTED |  |
| `create-lesson-payment-sheet` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, Stripe, account admin, calls functions, bypasses row rules | none found | PROTECTED |  |
| `create-review-accounts` | Lets in with no key (not listed) | Sign-in, refused before work + role/access check | writes data, email, account admin, bypasses row rules | none found | PROTECTED |  |
| `create-staff-checkout` | Lets in with no key (not listed) | Sign-in, refused before work + role/access check | writes data, Stripe, bypasses row rules | app (1 file) | PROTECTED |  |
| `create-test-athlete` | Lets in with no key (not listed) | Sign-in, refused before work + role/access check | writes data, account admin, calls functions, bypasses row rules | none found | PROTECTED |  |
| `customer-portal` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | Stripe, bypasses row rules | app (2 files) | PROTECTED |  |
| `daily-trace-prune` | Lets in with no key (not listed) | None | writes data, bypasses row rules | jobs 53 | JOB CREDENTIAL ONLY | Job 53. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `delete-account` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, Stripe, account admin, files, bypasses row rules | app (1 file) | PROTECTED |  |
| `delete-library-session` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `detect-behavior-patterns` | Lets in with no key (not listed) | None | writes data, bypasses row rules | jobs 45 | JOB CREDENTIAL ONLY | Job 45. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load, every-player batch). |
| `detect-overlaps` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | reads data | app (1 file) | PROTECTED |  |
| `discover-tag-patterns` | Lets in with no key (not listed) | None | writes data, bypasses row rules | jobs 11 | JOB CREDENTIAL ONLY | Job 11. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `download-scout-file` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | reads data, bypasses row rules | none found | PROTECTED |  |
| `download-session-video` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | reads data, bypasses row rules | app (1 file) | PROTECTED |  |
| `engine-adversarial` | Lets in with no key | None | writes data, account admin, calls functions, bypasses row rules | jobs 19 | JOB CREDENTIAL ONLY | Job 19. Creates/uses sandbox auth users (admin API). Proposal: job credential; update job 19. RISK: anyone can run it. |
| `engine-auto-recovery` | Lets in with no key | None | writes data, calls functions, bypasses row rules | jobs 40 | JOB CREDENTIAL ONLY | Job 40. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `engine-chaos-test` | Refuses no-key/invalid; public key passes | Sign-in (+ role) before work | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `engine-data-integrity-check` | Lets in with no key | None | writes data, bypasses row rules | jobs 41 | JOB CREDENTIAL ONLY | Job 41. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `engine-heartbeat` | Lets in with no key | None | writes data, calls functions, bypasses row rules | jobs 15 | JOB CREDENTIAL ONLY | Job 15. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `engine-regression-runner` | Lets in with no key | None | writes data, bypasses row rules | jobs 32 | JOB CREDENTIAL ONLY | Job 32. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `engine-reset-safe-mode` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `engine-sentinel` | Lets in with no key | None | writes data, bypasses row rules | jobs 17 | JOB CREDENTIAL ONLY | Job 17. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `engine-weight-optimizer` | Lets in with no key | None | writes data, bypasses row rules | jobs 21 | JOB CREDENTIAL ONLY | Job 21. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `evaluate-advice-effectiveness` | Lets in with no key | None | writes data, bypasses row rules | jobs 22 | JOB CREDENTIAL ONLY | Job 22. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `evaluate-behavioral-state` | Lets in with no key (not listed) | Service-role key, or sign-in for own account only | writes data, bypasses row rules | jobs 44; app (6 files); functions: save-streak | PROTECTED | Job 44 sends the public key: refused as "Sign in first" — that job likely fails every hour (not checked in logs). |
| `evaluate-predictions` | Lets in with no key | None | writes data, bypasses row rules | jobs 33 | JOB CREDENTIAL ONLY | Job 33. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load, every-player batch). |
| `exercise-log-coach` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | reads data, paid AI, bypasses row rules | app (1 file) | PROTECTED |  |
| `exercise-vault` | Lets in with no key (not listed) | Sign-in, refused before work + role/access check | writes data, bypasses row rules | app (2 files) | PROTECTED |  |
| `extract-patterns` | Lets in with no key | None | writes data, bypasses row rules | none found | JOB CREDENTIAL ONLY | No job or caller found. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `fault-clip-evidence` | Lets in with no key (not listed) | Sign-in, refused before work | reads data, bypasses row rules | app (1 file) | PROTECTED |  |
| `foundation-alert-retention` | Lets in with no key (not listed) | None | writes data, bypasses row rules | jobs 55 | JOB CREDENTIAL ONLY | Job 55. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `foundation-health-alerts` | Lets in with no key (not listed) | None | writes data, email, bypasses row rules | jobs 54 | JOB CREDENTIAL ONLY | Job 54. Proposal: job credential; update job 54. RISK: anyone can trigger alert emails to staff. |
| `foundations-recompute-user` | Lets in with no key (not listed) | Sign-in, refused before work + role/access check | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `foundations-replay` | Lets in with no key (not listed) | Sign-in, refused before work + role/access check | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `generate-block-workout` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | reads data, paid AI, bypasses row rules | app (1 file) | PROTECTED |  |
| `generate-drills` | Lets in with no key (not listed) | None | writes data, paid AI, bypasses row rules | app (2 files) | REQUIRE SIGN-IN / ROLE | Owner pages PendingDrillsQueue/DrillCmsManager. Proposal: owner/admin sign-in. RISK: paid AI + anyone can add pending drills. |
| `generate-elite-layer` | Lets in with no key | None | writes data, bypasses row rules | functions: compute-hammer-state | JOB CREDENTIAL ONLY | Called by compute-hammer-state (service key). Proposal: service key only. |
| `generate-follower-reports` | Lets in with no key (not listed) | None | writes data, paid AI, bypasses row rules | jobs 46, 47; functions: retry-follower-reports | JOB CREDENTIAL ONLY | Jobs 46/47 and retry-follower-reports. Proposal: job credential or service key; update jobs 46/47. RISK: anyone can regenerate follower reports for every follower (heavy; report notifications). |
| `generate-interventions` | Lets in with no key | None | writes data, bypasses row rules | functions: predict-hammer-state | JOB CREDENTIAL ONLY | Called by predict-hammer-state. Proposal: service key only. |
| `generate-monthly-report` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, bypasses row rules | none found | PROTECTED |  |
| `generate-training-block` | Lets in with no key (not listed) | Sign-in, refused before work + role/access check | writes data, paid AI, bypasses row rules | app (1 file) | PROTECTED |  |
| `generate-vault-recap` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data, paid AI | app (1 file) | PROTECTED |  |
| `generate-warmup` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | reads data, paid AI, bypasses row rules | none found | PROTECTED |  |
| `get-build-purchase` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | reads data | app (1 file) | PROTECTED |  |
| `get-coach-connections` | Lets in with no key (not listed) | Sign-in, refused before work | reads data, bypasses row rules | app (1 file) | PROTECTED |  |
| `get-daily-lesson` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data, paid AI, bypasses row rules | app (1 file) | PROTECTED |  |
| `get-daily-tip` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data, paid AI, bypasses row rules | app (1 file) | PROTECTED |  |
| `get-follower-reports` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `get-following-players` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, bypasses row rules | app (2 files) | PROTECTED |  |
| `get-monthly-report` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data, bypasses row rules | none found | PROTECTED |  |
| `get-my-analysis-report` | Lets in with no key (not listed) | Sign-in, refused before work + role/access check | reads data, bypasses row rules | app (1 file) | PROTECTED |  |
| `get-owner-profile` | Lets in with no key | None | reads data, paid AI, bypasses row rules | app (1 file) | OPEN ON PURPOSE | Public coach bio. RISK: any non-English request triggers a paid AI translation (no cache, no rate limit). |
| `get-player-library` | Lets in with no key | Sign-in, refused before work + role/access check | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `get-scout-pending-reviews` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `get-today-tips` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | reads data | app (1 file) | PROTECTED |  |
| `get-video-annotations` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `get-weather` | Lets in with no key | None | no data | app (1 file) | OPEN ON PURPOSE | Free public weather/air APIs; no stored data. Can be used as a free proxy; no rate limit. |
| `get-weekly-challenge` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `gp-analyze-ab-swing` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data, paid AI, files, bypasses row rules | app (1 file) | PROTECTED |  |
| `gp-ingest-document` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data, paid AI, files, bypasses row rules | app (1 file) | PROTECTED |  |
| `gp-ingest-dossier-asset` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data, paid AI, files, bypasses row rules | app (1 file) | PROTECTED |  |
| `gp-pregame-plan` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data, paid AI, bypasses row rules | app (1 file) | PROTECTED |  |
| `gp-shared-report` | Lets in with no key (not listed) | Share-link token (16–128 hex) | writes data, bypasses row rules | app (1 file) | OPEN ON PURPOSE | Returns a shared game report to whoever holds the link — on purpose. |
| `gp-update-priors` | Lets in with no key | None | writes data, bypasses row rules | app (1 file) | REQUIRE SIGN-IN / ROLE | App usePregamePlan. Proposal: sign-in (coach/player of that game). RISK: anyone can write planner priors. |
| `hammer-chat` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, paid AI, bypasses row rules | app (2 files) | PROTECTED |  |
| `hammer-recall` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, paid AI, bypasses row rules | app (2 files) | PROTECTED |  |
| `hie-analyze` | Lets in with no key (not listed) | None | writes data, paid AI, calls functions, bypasses row rules | functions: calculate-session, hie-refresh-worker, hie-verify, nightly-hie-process, nightly-mpi-process | JOB CREDENTIAL ONLY | Called by calculate-session, nightly-hie-process, hie-refresh-worker, hie-verify, nightly-mpi-process (service key). Proposal: refuse unless service-role key or job credential. RISK: returns any player's full development snapshot for a user_id without sign-in; paid AI calls; heavy reads. |
| `hie-refresh-worker` | Lets in with no key (not listed) | None | writes data, calls functions, bypasses row rules | jobs 13; functions: engine-adversarial, engine-heartbeat | JOB CREDENTIAL ONLY | Job 13. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load, every-player batch). |
| `hie-team-plan` | Lets in with no key (not listed) | None | paid AI | app (1 file) | REQUIRE SIGN-IN / ROLE | App TeamWeaknessEngine (coach). Proposal: coach/staff sign-in. RISK: paid AI for anyone. |
| `hie-verify` | Lets in with no key | None | reads data, calls functions, bypasses row rules | none found | NOT SURE | No caller found; calls hie-analyze. Need: still used? |
| `hie-verify-continuation` | Lets in with no key (not listed) | None | writes data, calls functions, bypasses row rules | none found | JOB CREDENTIAL ONLY | Called by nightly-mpi-process. Proposal: service key/job credential. |
| `hourly-trigger-decay` | Lets in with no key (not listed) | None | writes data, bypasses row rules | jobs 52 | JOB CREDENTIAL ONLY | Job 52. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `initialize-owner` | Lets in with no key | Secret key in body (OWNER_INIT_KEY) | writes data, account admin, bypasses row rules | app (1 file) | OPEN ON PURPOSE | One-time owner setup; secret-key protected; no rate limit on guesses. |
| `injury-full-go` | Lets in with no key (not listed) | Sign-in; parent email-link path uses a hashed one-time token | writes data, email, bypasses row rules | app (2 files) | PROTECTED |  |
| `intel-recheck` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `intel-recheck-job` | Lets in with no key (not listed) | Job credential (x-job-token) | writes data, bypasses row rules | jobs 92 | PROTECTED |  |
| `iq-alignment-audit` | Lets in with no key (not listed) | None (sign-in only used to label the run) | writes data, bypasses row rules | app (1 file) | REQUIRE SIGN-IN / ROLE | Owner page IqAlignmentAudit. Proposal: owner/admin sign-in. RISK: anyone can start full audit runs (heavy, writes run rows). |
| `iq-decay` | Lets in with no key (not listed) | None | writes data, bypasses row rules | jobs 56 | JOB CREDENTIAL ONLY | Job 56. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `ledger-save` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, push, bypasses row rules | app (1 file) | PROTECTED |  |
| `legal-consent` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, bypasses row rules | app (2 files) | PROTECTED |  |
| `lesson-availability` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, paid AI, account admin, calls functions, bypasses row rules | none found | PROTECTED |  |
| `lesson-booking` | Lets in with no key (not listed) | Sign-in, refused before work + role/access check | writes data, paid AI, account admin, calls functions, bypasses row rules | none found | PROTECTED |  |
| `list-monthly-reports` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | reads data, bypasses row rules | none found | PROTECTED |  |
| `mark-follower-report-viewed` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `mark-video-reviewed` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `mcp` | Lets in with no key (not listed) | Each tool refuses without a signed-in token ("Not authenticated"); reads under row rules | reads data | none found | PROTECTED | Auto-generated; not reviewed beyond its tool check. |
| `migrate-to-tiers` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, bypasses row rules | none found | PROTECTED |  |
| `nightly-foundation-health` | Lets in with no key (not listed) | None | writes data, bypasses row rules | jobs 51 | JOB CREDENTIAL ONLY | Job 51. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `nightly-hie-process` | Lets in with no key (not listed) | None | writes data, calls functions, bypasses row rules | jobs 12 | JOB CREDENTIAL ONLY | Job 12. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load, every-player batch). |
| `nightly-mpi-process` | Lets in with no key | None | writes data, calls functions, bypasses row rules | jobs 5; functions: hie-verify-continuation | JOB CREDENTIAL ONLY | Job 5. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load, every-player batch). |
| `notify-guardian-minor-signup` | Lets in with no key | None (needs a real 13–17 user id) | writes data, email, account admin, bypasses row rules | none found | REQUIRE SIGN-IN / ROLE | App AuthContext at sign-up. Proposal: sign-in as that new user (session exists right after sign-up — verify with email-confirm setting). RISK: repeated emails to any address for a known minor id. |
| `org-email-code` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, email, bypasses row rules | none found | PROTECTED |  |
| `org-sponsorship` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, Stripe, bypasses row rules | app (1 file) | PROTECTED |  |
| `owner-bundle-access` | Lets in with no key | Sign-in, refused before work + role/access check | writes data, account admin, bypasses row rules | app (1 file) | PROTECTED |  |
| `parent-consent` | Lets in with no key (not listed) | Sign-in for most actions; "signup" path open before sign-in behind its switch | writes data, email, Stripe, account admin, files, bypasses row rules | app (1 file) | OPEN ON PURPOSE | Under-13 parent sign-up creates an account and sends a receipt email; no rate limit. |
| `parse-food-text` | Refuses no-key/invalid; public key passes | Only checks a "Bearer" header exists (public key passes) | paid AI | app (1 file) | REQUIRE SIGN-IN / ROLE | App nutrition. Proposal: real sign-in. RISK: free paid-AI calls for anyone. |
| `parse-recipe-url` | Refuses no-key/invalid; public key passes | None (platform needs any valid key) | paid AI | app (1 file) | REQUIRE SIGN-IN / ROLE | App nutrition. Proposal: sign-in. RISK: paid AI + server fetches any web address for anyone. |
| `parse-season-schedule` | Refuses no-key/invalid; public key passes | None (platform needs any valid key) | writes data, paid AI, bypasses row rules | app (1 file) | REQUIRE SIGN-IN / ROLE | App season importer. Proposal: sign-in. RISK: paid AI for anyone. |
| `phase-state` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `pitch-velocity-measure` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, paid AI, bypasses row rules | app (2 files) | PROTECTED |  |
| `pitch-velocity-prep` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, paid AI, files, bypasses row rules | app (2 files) | PROTECTED |  |
| `plan-swap` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, calls functions, bypasses row rules | app (5 files) | PROTECTED |  |
| `populate-drill-instructions` | Lets in with no key | Service-role key or owner/admin sign-in | writes data, paid AI, bypasses row rules | none found | PROTECTED |  |
| `predict-hammer-state` | Lets in with no key | None | writes data, calls functions, bypasses row rules | jobs 29 | JOB CREDENTIAL ONLY | Job 29. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load, every-player batch). |
| `prescription-engine` | Lets in with no key | Sign-in, refused before work + role/access check | reads data, paid AI, bypasses row rules | functions: hie-analyze | PROTECTED |  |
| `prescription-integrity` | Lets in with no key (not listed) | Sign-in, refused before work + role/access check | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `reanalyze-videos-for-new-tag` | Lets in with no key (not listed) | Sign-in, refused before work + role/access check | writes data, paid AI, bypasses row rules | app (1 file) | PROTECTED |  |
| `recommend-workout` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | reads data, paid AI, bypasses row rules | app (1 file) | PROTECTED |  |
| `recompute-foundation-effectiveness` | Lets in with no key (not listed) | None | writes data, bypasses row rules | jobs 50 | JOB CREDENTIAL ONLY | Job 50. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `recompute-report-card` | Lets in with no key (not listed) | Owner/admin only (scored-grading gate) before work | writes data, paid AI, bypasses row rules | app (2 files) | PROTECTED |  |
| `recompute-video-metrics` | Lets in with no key (not listed) | None | writes data, bypasses row rules | none found | NOT SURE | No caller or job found. Changes video tag rules. Need: still used? |
| `render-promo` | Lets in with no key (not listed) | None | writes data, bypasses row rules | database trigger trigger_render_on_queue_insert (public key) | JOB CREDENTIAL ONLY | Database trigger on promo_render_queue insert. Proposal: trigger sends the job credential; function refuses others. RISK: anyone can re-run paid cloud video renders of queued promos. |
| `renewal-reminders` | Lets in with no key (not listed) | Service-role key, job credential, or staff sign-in | writes data, email, Stripe, bypasses row rules | jobs 91 | PROTECTED |  |
| `report-problem-mailer` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, email, bypasses row rules | app (2 files) | PROTECTED |  |
| `respond-to-follow` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `resume-module-subscription` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data, Stripe, bypasses row rules | app (1 file) | PROTECTED |  |
| `retry-follower-reports` | Lets in with no key (not listed) | None | reads data, calls functions, bypasses row rules | jobs 49 | JOB CREDENTIAL ONLY | Job 49. Proposal: job credential; update job 49. |
| `save-streak` | Lets in with no key (not listed) | None (trusts user_id in the body) | writes data, calls functions, bypasses row rules | app (1 file) | REQUIRE SIGN-IN / ROLE | App useQuickActionExecutor. Proposal: take the id from sign-in only; ignore body user_id unless service key. RISK: anyone can add fake completed activity logs to any player and trigger their recompute. |
| `save-video-annotation` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
| `search-players` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, bypasses row rules | app (3 files) | PROTECTED |  |
| `send-follow-request` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, bypasses row rules | app (3 files) | PROTECTED |  |
| `send-parent-invite` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, email, calls functions, bypasses row rules | app (1 file) | PROTECTED |  |
| `send-push` | Lets in with no key (not listed) | "test" mode: owner sign-in. Outbox mode: none | writes data, push, bypasses row rules | database trigger push_enqueue (public key) | OPEN ON PURPOSE | Outbox mode only sends a queued push created in the last 15 min, once (claimed). Low abuse value. Could later carry the job credential from the trigger. |
| `send-recap-email` | Refuses no-key/invalid; public key passes | Sign-in, refused before work | email | none found | PROTECTED |  |
| `send-recruiting-match-emails` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, email | app (1 file) | PROTECTED |  |
| `send-subscription-feedback` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | reads data, email, account admin, bypasses row rules | none found | PROTECTED |  |
| `session-insights` | Lets in with no key (not listed) | Sign-in, refused before work | reads data | none found | PROTECTED |  |
| `signup-age-check` | Lets in with no key | None | no data | app (2 files) | OPEN ON PURPOSE | Before sign-in; computes an age answer, stores nothing. |
| `stripe-health` | Refuses no-key/invalid; public key passes | Own token (x-reconcile-token, hash check) | writes data, email, paid AI, Stripe, account admin, calls functions, bypasses row rules | none found | PROTECTED |  |
| `stripe-reconcile` | Refuses no-key/invalid; public key passes | Own token (x-reconcile-token, hash check) | writes data, Stripe, account admin, bypasses row rules | jobs 87 | PROTECTED |  |
| `stripe-snapshot` | Lets in with no key (not listed) | Sign-in, refused before work + role/access check | reads data, Stripe, bypasses row rules | none found | PROTECTED |  |
| `stripe-webhook` | Lets in with no key | Stripe webhook signature | writes data, Stripe, account admin, bypasses row rules | functions: stripe-health | OPEN ON PURPOSE | Webhook from Stripe; signature-checked. |
| `submit-idea` | Lets in with no key (not listed) | None | email | app (1 file) | REQUIRE SIGN-IN / ROLE | App IdeaDropBox. Proposal: sign-in (or rate limit). RISK: unwanted emails to the owner inbox. |
| `suggest-adaptation` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | reads data, bypasses row rules | none found | PROTECTED |  |
| `suggest-meals` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | reads data, paid AI, bypasses row rules | app (1 file) | PROTECTED |  |
| `sync-staff-plan` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, Stripe, bypasses row rules | app (1 file) | PROTECTED |  |
| `tcs-auto-off` | Lets in with no key (not listed) | None | writes data, bypasses row rules | jobs 81 | JOB CREDENTIAL ONLY | Job 81. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `tcs-shadow-run` | Lets in with no key (not listed) | Job credential or service-role key, 401 before work | writes data, bypasses row rules | jobs 60, 61, 62, 84 | PROTECTED |  |
| `tcs-test-runner` | Lets in with no key (not listed) | Own runner token (env or tcs_runner_auth row) | writes data, calls functions, bypasses row rules | none found | PROTECTED | No caller found. |
| `teen-parent-waiver` | Lets in with no key (not listed) | Sign-in; parent email-link path uses a hashed token | writes data, email, bypasses row rules | app (1 file) | PROTECTED |  |
| `ti-auto-activate` | Lets in with no key (not listed) | Owner check only if a real user token is sent; no token or the public key runs | writes data, bypasses row rules | jobs 85 | JOB CREDENTIAL ONLY | Job 85 (public key). Proposal: job credential or service key, plus owner sign-in; update job 85. RISK: anyone can start plan-intelligence activation batches. |
| `ti-watchdog` | Lets in with no key (not listed) | None | writes data, bypasses row rules | jobs 82, 83; app (1 file) | JOB CREDENTIAL ONLY | Jobs 82/83 and the owner page AdminTrainingIntelligence. Proposal: job credential, or owner sign-in for the page; update jobs 82/83. RISK: anyone can trigger scans/digests (writes notes, heavy reads). |
| `training-block-notifications` | Lets in with no key (not listed) | None | writes data, bypasses row rules | none found | NOT SURE | No caller or job found. Writes notifications. Need: still used? |
| `translate-content` | Lets in with no key | None | paid AI | none found | NOT SURE | No caller found. Paid AI. Need: still used? |
| `translate-video-content` | Lets in with no key | None | paid AI | app (1 file) | REQUIRE SIGN-IN / ROLE | App VideoLibraryPlayer. Proposal: sign-in. RISK: paid AI for anyone. |
| `unfollow-player` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, bypasses row rules | app (2 files) | PROTECTED |  |
| `update-library-session` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, paid AI, bypasses row rules | app (3 files) | PROTECTED |  |
| `update-user-engine-profile` | Lets in with no key | None | writes data, bypasses row rules | jobs 24 | JOB CREDENTIAL ONLY | Job 24. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load, every-player batch). |
| `verify-addon-payment` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, Stripe, account admin, calls functions, bypasses row rules | none found | PROTECTED |  |
| `verify-apple-purchase` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, account admin, calls functions, bypasses row rules | none found | PROTECTED |  |
| `verify-checkout-session` | Lets in with no key (not listed) | Sign-in, refused before work | writes data, Stripe, bypasses row rules | app (1 file) | PROTECTED |  |
| `verify-link-integrity` | Lets in with no key | None | writes data, bypasses row rules | jobs 7 | JOB CREDENTIAL ONLY | Job 7. Proposal: job credential (or service key); update its job(s) to send x-job-token. RISK: anyone can start it (database load). |
| `wk-daily-plan-job` | Lets in with no key (not listed) | Job credential (x-job-token), 401 before work | writes data, calls functions, bypasses row rules | jobs 88, 89 | PROTECTED |  |
| `wk-generate-daily` | Lets in with no key (not listed) | Service-role key or sign-in, 401 before work | writes data, SMS, calls functions, bypasses row rules | app (2 files); functions: create-test-athlete, wk-daily-plan-job | PROTECTED |  |
| `wk-training-intel` | Refuses no-key/invalid; public key passes | Sign-in, refused before work + role/access check | writes data, bypasses row rules | app (1 file) | PROTECTED |  |
