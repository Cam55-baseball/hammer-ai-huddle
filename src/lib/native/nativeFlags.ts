/**
 * Release A switches (owner Nov 8). iPhone-app only: on the web every one of these is
 * off without asking the server, so the website behaves exactly as before.
 */
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { isSwitchOnFor, type FeatureSwitchRow } from "../../../supabase/functions/_shared/wic/flags/featureSwitches";

export const NATIVE_FLAGS = ["native_push_v1", "native_rest_alerts_v1", "healthkit_read_v1"] as const;
export type NativeFlag = (typeof NATIVE_FLAGS)[number];

export function isNativeApp(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

export function isNativeIos(): boolean {
  try { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios"; } catch { return false; }
}

let cache: { userId: string; at: number; values: Record<NativeFlag, boolean> } | null = null;
let pending: Promise<Record<NativeFlag, boolean>> | null = null;
const OFF: Record<NativeFlag, boolean> = { native_push_v1: false, native_rest_alerts_v1: false, healthkit_read_v1: false };

/** Pure: resolve the three switches for one person. */
export function resolveNativeFlags(rows: FeatureSwitchRow[] | null | undefined, userId: string | null): Record<NativeFlag, boolean> {
  const byKey = new Map((rows ?? []).map((r) => [r.feature_key, r]));
  const out = { ...OFF };
  for (const k of NATIVE_FLAGS) out[k] = isSwitchOnFor(byKey.get(k), userId);
  return out;
}

/** Loads (and caches for 10 minutes) the switches for the signed-in person. Off on the web. */
export async function loadNativeFlags(userId: string | null): Promise<Record<NativeFlag, boolean>> {
  if (!isNativeApp() || !userId) return { ...OFF };
  if (cache && cache.userId === userId && Date.now() - cache.at < 10 * 60_000) return cache.values;
  if (pending) return pending;
  pending = (async () => {
    try {
      const { data } = await supabase.from("wk_feature_switches")
        .select("feature_key, mode, allowlist, updated_by").in("feature_key", [...NATIVE_FLAGS]);
      const values = resolveNativeFlags((data ?? []) as FeatureSwitchRow[], userId);
      cache = { userId, at: Date.now(), values };
      return values;
    } catch {
      return { ...OFF };
    } finally {
      pending = null;
    }
  })();
  return pending;
}

/** Last loaded answer (sync). False until loadNativeFlags has run for this person. */
export function nativeFlagOn(flag: NativeFlag): boolean {
  return !!cache?.values[flag];
}

/** Forget the answer (sign out). */
export function clearNativeFlags() { cache = null; pending = null; }
export const _resetNativeFlagsForTests = clearNativeFlags;
