/**
 * Phase I — Frontend forwarder.
 * The canonical thresholds live in
 * `supabase/functions/_shared/foundationThresholds.ts` so they can be
 * imported by both Vite (this file) and Deno (edge functions) without
 * drift. Do NOT define values here — only re-export.
 */
export {
  CRON_STALE_MIN,
  ALERT,
  TRACE_PAGE_SIZE,
  TRACE_EXPORT_MAX,
  TRACE_EXPORT_CHUNK,
  TRACE_SEARCH_DEBOUNCE_MS,
  SYSTEM_USER_ID,
  ALERT_RETENTION_DAYS,
  type AlertSeverity,
} from '../../supabase/functions/_shared/foundationThresholds';
