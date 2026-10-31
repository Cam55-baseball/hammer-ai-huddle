import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSessionControls } from '@/hooks/useSessionControls';
import type { SessionTarget } from '@/lib/coachRx/sessionControls';

export function SessionControlActions({athleteId,date,sport,targets,name}:{athleteId:string;date:string;sport:string;targets:SessionTarget[];name:string}) {
  const [mode,setMode]=useState<'allow'|'remove'|null>(null);
  const [reason,setReason]=useState('');
  const action=useSessionControls(athleteId,date,date);
  if (!targets.length || date < new Date().toLocaleDateString('en-CA')) return null;
  return <div className="flex flex-wrap gap-2 pt-1">
    <Button size="sm" variant="outline" onClick={()=>{setReason('');setMode('allow');}}>Allow skip</Button>
    <Button size="sm" variant="ghost" onClick={()=>{setReason('');setMode('remove');}}>Remove for this session</Button>
    <Dialog open={mode!==null} onOpenChange={open=>{if(!open)setMode(null);}}><DialogContent><DialogHeader><DialogTitle>{mode==='allow'?'Allow skip':'Remove for this session'} · {name}</DialogTitle></DialogHeader>
      <p className="text-sm">{mode==='allow'?'The player decides whether to skip.':'This work will not be available for this session. Logged work is kept.'} Other dates stay unchanged.</p>
      <Input aria-label="Reason (optional)" placeholder="Reason (optional)" value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)}/>
      <DialogFooter><Button variant="outline" disabled={action.saving} onClick={()=>setMode(null)}>Cancel</Button><Button disabled={action.saving} onClick={async()=>{if(!mode)return;try {await action.save({date,sport,targets,mode,reason});setMode(null);}catch{/* Save error shown by hook. */}}}>Okay</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>;
}