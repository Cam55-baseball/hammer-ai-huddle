# API key / secret inventory (read-only)

Nothing was changed. Names only — no values.

## 1. Secrets configured in the backend (11)

| Secret | Service | What it does | Used by |
|---|---|---|---|
| STRIPE_SECRET_KEY | Stripe | Charges, subscriptions, refunds, account deletion cleanup | create-checkout, create-bundle-checkout, create-build-checkout, customer-portal, cancel-module-subscription, cancel-all-subscriptions, admin-cancel-user-subscriptions, admin-delete-user, delete-account |
| STRIPE_WEBHOOK_SECRET | Stripe | Verifies that webhook calls really come from Stripe | stripe-webhook |
| OPENAI_API_KEY | OpenAI (your own key, not the built-in gateway) | Powers most AI features: video analysis, report cards, chat, meal/training generation, league classification, hydration, game-plan analysis | analyze-video, ai-helpdesk, analyze-base-stealing-rep, analyze-hydration-beverage, analyze-hydration-text, calculate-regulation, classify-league, coach-hammer-next-step, generate-block-workout, generate-drills, generate-training-block, generate-vault-recap, generate-warmup, get-owner-profile, gp-analyze-ab-swing, gp-ingest-document, and more via _shared/googleAi.ts |
| GOOGLE_AI_API_KEY | Google Gemini (your own key) | Backup/alternate AI model for the same features | Same set as above via _shared/googleAi.ts |
| RESEND_API_KEY | Resend | Sends transactional email (recaps, recruiting matches, idea box, guardian notice, subscription feedback) | send-recap-email, send-recruiting-match-emails, submit-idea, notify-guardian-minor-signup, send-subscription-feedback |
| ROBOFLOW_API_KEY | Roboflow | Hosted ball-tracking model for pitch velocity measurement | pitch-velocity-measure |
| OWNER_INIT_KEY | Internal | One-time password for the owner-initialization screen | initialize-owner, populate-drill-instructions |
| Owner_Key | Internal | Header password for the drill-instructions backfill | populate-drill-instructions |
| TCS_RUNNER_TOKEN | Internal | Token for the test-runner function | tcs-test-runner |
| OPENWEATHER_API_KEY | OpenWeather | **Not used anywhere in code** (see §3) | — |
| LOVABLE_API_KEY | Lovable AI gateway (managed) | **Not referenced by any code** (see §5) | — |

Also present automatically (platform-provided, not secrets you set): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY — used by nearly every function to talk to the database.

## 2. Configured but unused / read but not configured

**Configured but never read by code:**
- OPENWEATHER_API_KEY — the weather feature (get-weather) uses free no-key services (weather.gov, Open-Meteo, Zippopotam). Safe to remove later.
- LOVABLE_API_KEY — no function calls the Lovable AI gateway; all AI goes through your own OpenAI/Gemini keys. Keep it (it's managed by the platform), just note nothing uses it.

**Read by code but NOT configured (feature would fail or fall back):**
- AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN, REMOTION_LAMBDA_FUNCTION_NAME, REMOTION_LAMBDA_REGION, REMOTION_S3_BUCKET, REMOTION_SITE_URL — read by render-promo and check-render-status. None are configured, so the Remotion video-render feature is currently dead (see §6).
- ROBOFLOW_MODEL_ID — read by pitch-velocity-measure but has a built-in default, so it works without the secret.
- APP_PUBLIC_URL — read by send-recruiting-match-emails; not configured (likely falls back or produces a wrong link — worth a check if that email is used).
- SLACK_WEBHOOK_URL — read by _shared/notificationAdapters.ts (foundation alerts); not configured, so Slack alerts stay disabled by design per docs/foundations/notification-enablement.md.

## 3. Hard-coded keys in code

None found. A scan for common key patterns (OpenAI, Google, AWS, Stripe, Slack, webhook secrets) across supabase/, src/, scripts/, docs/ found no real keys — only documentation text and the publishable (safe, public-by-design) anon key in .env.

## 4. AI features: gateway or direct keys?

**Direct provider keys, not the Lovable gateway.** Every AI function reads OPENAI_API_KEY and/or GOOGLE_AI_API_KEY via _shared/googleAi.ts or directly. No code references LOVABLE_API_KEY. This matches the known state from the upload incident: the OpenAI account hit its usage limit and the Gemini account ran out of prepaid credit — those are your own provider accounts being billed.

## 5. AWS / Remotion leftovers

**Yes, still referenced.** render-promo and check-render-status still read the AWS and Remotion secrets listed above. The secrets themselves are no longer configured (already removed), so these two functions cannot work — they are dead code awaiting a decision: remove the functions, or restore the keys. The remotion/ folder at the project root also still exists.

## Notes

- "Owner_Key" duplicates OWNER_INIT_KEY's purpose in one function; harmless but could be consolidated later.
- No action taken; removal of OPENWEATHER_API_KEY, the dead Remotion functions, and the remotion/ folder each await your explicit instruction.
