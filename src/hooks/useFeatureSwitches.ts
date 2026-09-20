import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  FEATURE_KEYS,
  type FeatureSwitchRow,
  resolveFeatures,
} from "../../supabase/functions/_shared/wic/flags/featureSwitches";

export type SwitchRow = FeatureSwitchRow & {
  label: string;
  buildable: boolean;
  sort_order: number;
  updated_at: string | null;
};

/**
 * Reads the feature switches and resolves them for the signed-in person.
 * Every switch resolves to off unless its setting includes that person.
 */
export function useFeatureSwitches() {
  const [rows, setRows] = useState<SwitchRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    setUserId(auth.user?.id ?? null);
    const { data } = await supabase
      .from("wk_feature_switches")
      .select("feature_key, label, mode, allowlist, buildable, sort_order, updated_by, updated_at")
      .order("sort_order");
    setRows((data ?? []) as unknown as SwitchRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const features = resolveFeatures(rows, userId);
  const isEnabled = (key: string) => features[key] === true;

  return { rows, features, isEnabled, loading, userId, reload: load, keys: FEATURE_KEYS };
}
