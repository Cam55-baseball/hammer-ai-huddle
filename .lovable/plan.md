## Goal

Make critical foundation alerts actually land in the owners' inboxes:
- HammersModality@gmail.com
- rmhaus33@gmail.com
- 55cam316@gmail.com

Today the alerter detects problems and tries to POST them to a "webhook URL" — but that URL doesn't exist yet, so the email adapter logs `email_disabled` and nothing is sent.

## How the pieces fit together

```text
foundation-health-alerts (cron, hourly)
        │  detects a CRITICAL issue
        ▼
notificationAdapters.dispatch()
        │  POSTs JSON to FOUNDATION_ALERT_EMAIL_HOOK_URL
        ▼
NEW: foundation-alert-email edge function   ← this is the "webhook"
        │  formats the JSON into a real email
        ▼
send-transactional-email (Lovable Email)
        │  enqueues + sends
        ▼
3 owner inboxes
```

The "webhook" is just a small edge function we own. It's the bridge between the alert engine and the email system.

## Steps

### 1. Set up Lovable Email infrastructure
- Set up an email sender domain through the in-app Email Setup dialog (one-time, ~5 min of clicking; DNS can verify in the background).
- Run `setup_email_infra` so the email queue, send log, and cron processor exist.
- Run `scaffold_transactional_email` so `send-transactional-email` is deployed.

### 2. Create a `foundation-alert` email template
- New React Email template at `supabase/functions/_shared/transactional-email-templates/foundation-alert.tsx`
- Shows: severity badge (CRITICAL), alert title, alert key, timestamp, and a JSON detail block — styled in Hammer brand colors.
- Register in `registry.ts` as `foundation-alert`.

### 3. Create the `foundation-alert-email` edge function (the "webhook")
- New file: `supabase/functions/foundation-alert-email/index.ts`
- Public POST endpoint (no JWT required) that accepts the alerter's payload `{ severity, title, alertKey, detail, minute_bucket }`.
- Validates input, then for each of the 3 owner emails calls `send-transactional-email` with:
  - `templateName: 'foundation-alert'`
  - `recipientEmail: <owner>`
  - `idempotencyKey: foundation-${alertKey}-${minute_bucket}-${owner}` (prevents duplicate sends if the alerter retries within the same minute)
  - `templateData: { severity, title, alertKey, detail, when }`
- Owner list lives in a single constant inside the function so it's easy to edit.

### 4. Wire the secret
- Add runtime secret `FOUNDATION_ALERT_EMAIL_HOOK_URL` pointing at the new function:
  `https://wysikbsjalfvjwqzkihj.supabase.co/functions/v1/foundation-alert-email`
- Add `FOUNDATION_NOTIFICATIONS_ENABLED=true` (master gate — currently off, which is why nothing fires).
- Both managed via the secrets tool; nothing hardcoded.

### 5. Surface it in the Ops Hub UI
- In `AlertsNotificationsTab`, replace the generic "Controlled by FOUNDATION_NOTIFICATIONS_ENABLED secret" pill with a real status row that shows:
  - Master gate: ON / OFF
  - Email webhook: Configured / Not configured
  - Recipients: list of the 3 owner emails (read from a small read-only edge function so we don't expose secrets to the browser)
- Add a "Send test alert" button that POSTs a synthetic critical alert through the dispatch path so you can verify end-to-end without waiting for a real failure.

### 6. Update runbook + memory
- Update `docs/foundations/runbook.md` and `notification-enablement.md` to reflect the new owner-email path.
- Bump memory file `architecture/edge-functions/implementation-standards` (or add a new note) capturing the alert-email webhook pattern.

## Out of scope
- No changes to alert thresholds, severity rules, or what counts as critical.
- No marketing emails, no per-user opt-outs (these are owner-only system alerts).
- No Slack — we're doing email only per your selection. Easy to add later by setting `SLACK_WEBHOOK_URL`; the adapter is already built.

## Technical notes
- Uses Lovable's built-in email system (no third-party account needed).
- `send-transactional-email` already has retry, queue, suppression-list, and DLQ — owner alerts inherit all of that.
- Idempotency key includes minute_bucket so the alerter's anti-flap behavior naturally collapses duplicate criticals into one email per minute per recipient.
- Multiple recipients are sent as 3 separate transactional sends (per Lovable rules — never loop a single send over a list). Each has its own idempotency key and unsubscribe-token row.
- Owner emails are system-critical, so the unsubscribe link will still appear in the footer (Lovable appends it automatically and we cannot remove it). If an owner ever clicks it, future alerts to that address are blocked — we'll note this in the email body so nobody clicks it accidentally.