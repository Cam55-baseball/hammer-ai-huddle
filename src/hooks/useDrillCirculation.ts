import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useOptionalAuth } from "@/hooks/useAuth";
import { ELITE_DRILL_CATALOG, type EliteDrill } from "@/data/drills/eliteDrillCatalog";
import { mergeCatalog, type CirculationInput } from "@/lib/prescription/ownerDrills";
import { DRILL_HISTORY_LIMIT, readDrillCirculation } from '@/lib/prescription/drillCirculationRead';
import {testSettingsFor} from '@/lib/intelligence/testSettings';

/** Self-keyed, complete owner/rotation reads. A failure cannot revive switched-off built-ins. */
export function useDrillCirculation() {
  const { user } = useOptionalAuth();
  const qc = useQueryClient();
  const queryKey = ['drill-circulation', user?.id ?? null];
  const query = useQuery({
    queryKey,
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) throw new Error('Sign in first');
      return readDrillCirculation({
        owner: supabase.from('owner_drills').select('*').limit(DRILL_HISTORY_LIMIT),
        usage: supabase.rpc('drill_usage_totals'),
        events: supabase.from('drill_engagement').select('drill_id,event,created_at').eq('user_id', user.id)
          .in('event', ['served', 'completed']).limit(DRILL_HISTORY_LIMIT),
      });
    },
  });
  const ready = !user || query.isSuccess;
  const rows = useMemo(()=>(query.data?.rows??[]).map(row=>testSettingsFor(row,user?.id)),[query.data?.rows,user?.id]);
  const completedOn = query.data?.completedOn ?? {};

  const catalog: EliteDrill[] = useMemo(() => ready ? mergeCatalog(ELITE_DRILL_CATALOG, rows) : [], [ready, rows]);
  /** Every drill ever defined, switched off or not — for showing past prescriptions intact. */
  const historyCatalog: EliteDrill[] = useMemo(
    () => ready ? mergeCatalog(ELITE_DRILL_CATALOG, rows.map((r) => ({ ...r, active: true }))) : [],
    [ready, rows],
  );
  const circulation: CirculationInput = useMemo(() => ({ servedToUser: ready ? query.data?.served ?? {} : {}, usage: ready ? query.data?.usage ?? {} : {} }), [ready, query.data]);

  const log = useCallback(
    (drillIds: string[], event: "served" | "opened" | "completed" | "returned") => {
      if (!user || !ready || drillIds.length === 0) return;
      void (supabase as any)
        .from("drill_engagement")
        .insert(drillIds.map((drill_id) => ({ user_id: user.id, drill_id, event })))
        .then(() => undefined, () => undefined);
    },
    [user, ready],
  );

  /** Done → "completed"; done again on a later day → also "returned". */
  const markDone = useCallback(
    (drillId: string) => {
      if (!user || !ready) return;
      const today = new Date().toISOString().slice(0, 10);
      const prev = completedOn[drillId];
      log([drillId], "completed");
      if (prev && prev !== today) log([drillId], "returned");
      qc.setQueryData<Awaited<ReturnType<typeof readDrillCirculation>>>(queryKey, data => data ? { ...data, completedOn: { ...data.completedOn, [drillId]: today } } : data);
    },
    [completedOn, log, user, ready, qc, queryKey],
  );

  return { catalog, historyCatalog, circulation, log, markDone, ready, error: query.error, userId: user?.id ?? null };
}
