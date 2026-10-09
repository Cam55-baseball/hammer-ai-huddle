import { useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkPrescription, type IntegrityCatch } from "../../../../supabase/functions/_shared/wic/integrity/doseIntegrity";

const reported = new Set<string>();

/** Repairs a prescription for display and reports any catch once per card per session. */
export function useCheckedRx<T extends { id?: string; plan_date?: string; movement_slug?: string | null; slot?: string | null }>(rx: T): T {
  const res = useMemo(() => checkPrescription(rx as any), [rx]);
  useEffect(() => {
    if (!res.catches.length) return;
    const key = `${rx.id ?? rx.movement_slug}:${res.catches.map((c) => c.rule).join(",")}`;
    if (reported.has(key)) return;
    reported.add(key);
    console.debug("[prescription double-check]", rx.movement_slug, res.catches);
    void supabase.functions.invoke("prescription-integrity", {
      body: { action: "report", catches: res.catches.map((c: IntegrityCatch) => ({ ...c, movement_slug: rx.movement_slug, slot: rx.slot, plan_date: rx.plan_date })) },
    }).catch(() => undefined);
  }, [res, rx]);
  return res.row as T;
}
