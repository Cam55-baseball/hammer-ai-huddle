## Why this path

Lovable Email **requires a verified sender domain** — there's no shared "noreply@lovable.app" pool for outgoing app mail. Since you don't want to deal with DNS right now, we route around email entirely and make the alerts impossible to miss *inside the app* instead. When you're ready to add a domain later, the email piece slots in on top — nothing here gets thrown away.

## What you get

```text
foundation-health-alerts (cron)
        │  detects a CRITICAL issue
        ▼
notificationAdapters.dispatch()
        │
        ├──► in-app: writes to owner_alerts table  ◄── NEW
        │       │
        │       └──► realtime push to any owner browser tab
        │              │
        │              └──► toast + red bell badge in header
        │
        └──► email adapter: stays inert (logs skipped_disabled)
              ↑ wires up later when domain is added
```

## Steps

### 1. New `owner_alerts` table
- Columns: severity, alert_key, title, detail (jsonb), minute_bucket, acknowledged_by, acknowledged_at, created_at.
- RLS: only the 3 owner accounts (HammersModality, rmhaus33, 55cam316) can read/update. Service role inserts.
- Realtime enabled so new rows push instantly to open browser tabs.
- Idempotency: unique index on (alert_key, minute_bucket) so a re-fired alert in the same minute doesn't double-insert.

### 2. New in-app adapter — `inAppOwnerAlert`
- Lives next to the existing email/Slack adapters in `notificationAdapters.ts`.
- On critical alerts, inserts a row into `owner_alerts` (via service role).
- Always on — no secret gate. This is the primary channel until email is wired.

### 3. Owner Alert Center UI
- New page: `/owner/alerts` (route already lives in owner shell).
- Shows unacknowledged criticals at the top in red, then history.
- Each row: severity badge, title, timestamp, JSON detail expander, **Acknowledge** button.
- Acknowledging stamps `acknowledged_by` + `acknowledged_at` (audit trail of who saw what).

### 4. Header bell badge (always visible across owner pages)
- Small `<OwnerAlertBell />` component in the owner layout header.
- Subscribes to `owner_alerts` via realtime.
- Shows red dot + count when there are unacknowledged criticals.
- Click → jumps to `/owner/alerts`.
- Plays a soft chime + shows a toast on new arrivals (only if owner has the tab open).

### 5. Optional browser push notifications (no domain needed)
- "Enable browser notifications" button in the Alert Center.
- Uses the standard `Notification` web API + the existing PWA service worker.
- When granted, you get an OS-level notification on Mac/iPhone/Android even if the app tab isn't focused.
- Per-browser opt-in (each of the 3 owners enables it once on each device).
- Pure frontend — no extra backend, no domain.

### 6. Surface it in the Ops Hub
- In `AlertsNotificationsTab`, add a new "Channels" status block:
  - In-app + bell: ✅ Active
  - Browser push: shows per-device permission state with enable button
  - Email: ⏸ Pending — "Add a sender domain to activate"
- Add a "Send test alert" button that fires a synthetic critical through the dispatch path so you can verify the bell + chime + push work end-to-end.

### 7. Light docs update
- `docs/foundations/notification-enablement.md`: replace the email-first enablement order with the new in-app-first order, with email as a future step.
- One-line note in the runbook: "Email path is wired but inert until a sender domain is configured — see Foundations → Ops → Alerts."

## What stays untouched
- All existing alert thresholds, severity rules, dispatch log, retention.
- The email adapter and `foundation-alert-email` plan stay in the codebase as a no-op stub. When you're ready, adding a domain + flipping `FOUNDATION_NOTIFICATIONS_ENABLED=true` lights it up — no rework.
- Slack adapter unchanged.

## Upgrade path (when you decide to add email later)
Either of these unlocks email with zero refactor of the work above:
1. **Buy a domain in Lovable** (Settings → Domains → Buy new domain, ~$12-20/yr, fully automatic), or
2. **Look up your existing registrar** at who.is and follow the DNS steps then.

Either way, the in-app + browser-push channels keep working alongside email.

## Out of scope
- SMS/Twilio (separate paid integration).
- Email until domain is decided.
- Changes to alert detection logic.
