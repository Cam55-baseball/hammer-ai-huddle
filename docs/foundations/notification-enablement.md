# Foundations — Notification Enablement

Order matters. Skipping steps risks blasting Slack with backlog noise.

1. **Migrate + deploy** — `foundation_notification_dispatches` table and
   the new adapters land first with `FOUNDATION_NOTIFICATIONS_ENABLED`
   unset. Every dispatch logs `skipped_disabled`. Verify via
   `select status, count(*) from foundation_notification_dispatches group by 1;`.
2. **Add Slack webhook** in staging — `add_secret SLACK_WEBHOOK_URL`.
3. **Flip flag in staging** — `add_secret FOUNDATION_NOTIFICATIONS_ENABLED=true`.
4. **Force a synthetic critical** — invoke the alerter and confirm a
   `status='ok'` row appears for `slack` adapter. Verify Slack message
   landed.
5. **Add email recipient** — `add_secret FOUNDATION_ALERT_EMAIL_TO=…`.
   Confirm `send-transactional-email` template `foundation-alert` exists.
6. **Production rollout** — repeat steps 2–5 in production.
7. **Bake-in window** — monitor `foundation_notification_dispatches` for
   48h before considering enablement final. Watch for:
   - `status='dlq'` (delivery exhausted)
   - `status='config_invalid'` (secret missing)
   - sustained `skipped_flap` (window misconfigured)

To disable: `update_secret FOUNDATION_NOTIFICATIONS_ENABLED=false`.
Adapters become inert immediately on next alerter tick.
