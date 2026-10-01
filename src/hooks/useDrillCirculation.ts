import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { ELITE_DRILL_CATALOG, type EliteDrill } from "@/data/drills/eliteDrillCatalog";
import { mergeCatalog, type CirculationInput, type OwnerDrillRow } from "@/lib/prescription/ownerDrills";

/** Loads owner drills + usage totals + this athlete's serve history. Failures degrade to the built-in catalog. */
export function useDrillCirculation() {
  const { user } = useOptionalAuth();
  const [rows, setRows] = useState<OwnerDrillRow[]>([]);
  const [usage, setUsage] = useState<CirculationInput["usage"]>({});
  const [served, setServed] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const db = supabase as any;
        const [{ data: r }, { data: u }, { data: e }] = await Promise.all([
          db.from("owner_drills").select("*").eq("active", true),
          db.rpc("drill_usage_totals"),
          db.from("drill_engagement").select("drill_id").eq("user_id", user.id).eq("event", "served"),
        ]);
        if (cancelled) return;
        setRows((r ?? []) as OwnerDrillRow[]);
        const us: CirculationInput["usage"] = {};
        for (const x of (u ?? []) as Array<{ drill_id: string; completed: number; returned: number }>) {
          us[x.drill_id] = { completed: Number(x.completed), returned: Number(x.returned) };
        }
        setUsage(us);
        const sv: Record<string, number> = {};
        for (const x of (e ?? []) as Array<{ drill_id: string }>) sv[x.drill_id] = (sv[x.drill_id] ?? 0) + 1;
        setServed(sv);
      } catch {
        /* built-in catalog stays */
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const catalog: EliteDrill[] = useMemo(() => mergeCatalog(ELITE_DRILL_CATALOG, rows), [rows]);
  const circulation: CirculationInput = useMemo(() => ({ servedToUser: served, usage }), [served, usage]);

  const log = useCallback(
    (drillIds: string[], event: "served" | "opened" | "completed" | "returned") => {
      if (!user || drillIds.length === 0) return;
      void (supabase as any)
        .from("drill_engagement")
        .insert(drillIds.map((drill_id) => ({ user_id: user.id, drill_id, event })))
        .then(() => undefined, () => undefined);
    },
    [user],
  );

  return { catalog, circulation, log };
}
