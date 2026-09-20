/**
 * v1.2 — `training_intel_v1` feature flag.
 *
 * Default OFF. Nothing in the app changes until an owner turns the flag on in
 * `app_settings` (setting_key = 'training_intel_v1', setting_value = true).
 * The flag is read-only from the client.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const TRAINING_INTEL_V1_KEY = "training_intel_v1";

/** Pure: how a stored setting value maps onto the flag. Unknown → OFF. */
export function isTrainingIntelV1Enabled(settingValue: unknown): boolean {
  if (settingValue === true) return true;
  if (typeof settingValue === "object" && settingValue !== null) {
    const v = (settingValue as { enabled?: unknown }).enabled;
    return v === true;
  }
  return false;
}

export function useTrainingIntelV1(): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", TRAINING_INTEL_V1_KEY)
        .maybeSingle();
      if (cancelled) return;
      setEnabled(isTrainingIntelV1Enabled(data?.setting_value));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { enabled, loading };
}
