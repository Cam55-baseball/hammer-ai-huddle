/**
 * Owner Nov 9 (rounds 3 and 4): one recovery cutoff, shared with the edge functions.
 * 4 or below on the 1–10 scale is poor recovery / high soreness; missing = unknown.
 */
export { RECOVERY_SCALE_MAX, POOR_RECOVERY_MAX, isPoorRecovery } from "../../../supabase/functions/_shared/recoveryScale";
