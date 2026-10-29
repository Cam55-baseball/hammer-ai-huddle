import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FacilityBoardRow } from '@/lib/org/facilityBoard';
import { EvidenceTrendChart } from '@/components/progress/EvidenceTrendChart';

export function OrganizationProgress({ orgId }: { orgId: string }) {
  const query = useQuery({ queryKey: ['org-facility-board',orgId], queryFn: async () => {
    const {data,error} = await supabase.rpc('org_facility_board',{_org:orgId});
    if(error) throw error;
    return (data ?? []) as unknown as FacilityBoardRow[];
  }});
  const rows = query.data ?? [];
  if(query.isError) return <p role="alert" className="text-destructive">Could not read roster progress.</p>;
  return <div className="min-w-0 space-y-3">
    <dl className="grid grid-cols-3 gap-3 border-y border-border py-4">
      <div><dt className="text-sm text-muted-foreground">Players</dt><dd className="text-2xl font-semibold">{rows.length}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Cards Done</dt><dd className="text-2xl font-semibold">{rows.reduce((s,r)=>s+r.week_done,0)}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Cards Planned</dt><dd className="text-2xl font-semibold">{rows.reduce((s,r)=>s+r.week_planned,0)}</dd></div>
    </dl>
    <EvidenceTrendChart bars label="Last 7 Days · Completion" unit="%" points={rows.map(r=>({label:r.name ?? 'Player',value:r.week_planned>0?r.week_done/r.week_planned*100:null,date:'Last 7 days',sample:r.week_planned,source:`Organization plan logs · ${r.week_done} of ${r.week_planned} cards`}))}/>
  </div>;
}