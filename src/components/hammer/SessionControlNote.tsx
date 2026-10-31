import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSessionControls } from '@/hooks/useSessionControls';
import { activityControl, controlNote, sessionExempt } from '@/lib/coachRx/sessionControls';
import type { ReactNode } from 'react';

export function ControlledActivity({date,taskId,side=null,name,children}:{date:string;taskId:string;side?:string|null;name:string;children:ReactNode}) {
  const {user}=useAuth();
  const query=useSessionControls(user?.id,date,date);
  const control=activityControl(query.controls,taskId,side);
  const note=control ? <div className="space-y-2 border-l-2 border-primary pl-3 text-sm" data-session-control={control.mode}><p className="font-medium">{name}</p><p>{controlNote(control)}</p>{control.mode==='allow' && !control.skipped_at && <Button size="sm" variant="outline" disabled={query.saving} onClick={()=>void query.save({ids:[control.id]}).catch(()=>undefined)}>Skip (allowed)</Button>}{control.skipped_at && <p className="text-muted-foreground">Skipped (allowed)</p>}</div>:null;
  if(query.isLoading) return <p role="status">Checking coach notes…</p>;
  if(query.error) return <p role="alert">Coach notes could not be checked. Refresh before starting this activity.</p>;
  return <>{note}{!sessionExempt(control) && children}</>;
}