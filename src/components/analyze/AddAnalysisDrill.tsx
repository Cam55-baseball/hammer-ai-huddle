import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import type { EliteDrill } from '@/data/drills/eliteDrillCatalog';

export function AddAnalysisDrill({ drill, videoId, sport,planDate,rotation=false }: {drill: EliteDrill; videoId?: string | null; sport: string;planDate?:string;rotation?:boolean}) {
  const qc = useQueryClient();
  const pending = useRef(false);
  const [open,setOpen] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState<string | null>(null);
  const [warnings,setWarnings] = useState<Array<{rule:string}>>([]);
  const [keys,setKeys] = useState<string[]>([]);
  const [done,setDone] = useState(false);
  const add = async (acknowledged: string[] = []) => {
    if (!videoId || pending.current) return;
    pending.current=true;setBusy(true);setError(null);
    try {
      const {data,error:failure} = await supabase.functions.invoke('plan-swap',{body:{action:rotation?'analysis_rotation_ack':'analysis_drill',videoId,drillId:drill.id,sport,planDate:planDate??new Date().toISOString().slice(0,10),acknowledged}});
      if (failure || data?.error) {
        const response = failure && 'context' in failure && failure.context instanceof Response ? await failure.context.clone().json().catch(()=>null) : null;
        throw new Error(response?.error ?? data?.error ?? 'Nothing was saved. Try again.');
      }
      if (data?.saved !== true) {
        if (!data?.warnings?.length) throw new Error('The save was not confirmed.');
        setWarnings(data.warnings);setKeys(data.warningKeys ?? []);return;
      }
      setDone(true);setWarnings([]);setKeys([]);
      await qc.invalidateQueries({predicate:q=>/^(saved-block-day|wk-rx|analysis-drill-rotation|plan-fault-context)/.test(String(q.queryKey[0]))});
    } catch(e) {setError(e instanceof Error ? e.message : 'Nothing was saved. Try again.');}
    finally {pending.current=false;setBusy(false);}
  };
  return <>
    <Button variant="outline" size="sm" disabled={!videoId || busy} onClick={()=>{setOpen(true);setDone(false);setWarnings([]);setKeys([]);void add();}}><Plus className="h-4 w-4 mr-1"/>{rotation?'Review fix-it choice':'Add to Today'}</Button>
    <Sheet open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}><SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
      <SheetHeader><SheetTitle>{drill.name}</SheetTitle></SheetHeader>
      <div className="space-y-4 py-4">
        {busy && <p role="status" className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Checking today’s work…</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {done && <p role="status">Added to Today and your fix-it rotation. Your planned amount stays the same.</p>}
        {warnings.map((warning,i)=><p key={i} className="text-sm">{warning.rule}</p>)}
        {warnings.length>0 && !done && <div className="flex gap-2"><Button disabled={busy} onClick={()=>void add(keys)}>Okay</Button><Button variant="outline" disabled={busy} onClick={()=>setOpen(false)}>Cancel</Button></div>}
        {!busy && !warnings.length && <Button variant="outline" onClick={()=>setOpen(false)}>Close</Button>}
      </div>
    </SheetContent></Sheet>
  </>;
}