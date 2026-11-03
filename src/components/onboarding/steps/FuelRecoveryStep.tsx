import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PhysioHealthIntakeDialog } from '@/components/physio/PhysioHealthIntakeDialog';
import { usePhysioProfile } from '@/hooks/usePhysioProfile';
import type { RegisterDraftFlush } from '@/lib/assessment/draftFlush';
/** Health entry points open the same saved setup, never a second questionnaire. */
export function FuelRecoveryStep({onContinue,onBack,registerFlush}:{onContinue:()=>void;onBack:()=>void;registerFlush?:RegisterDraftFlush}) {
 const [open,setOpen]=useState(false); const {setupCompleted}=usePhysioProfile();
 useEffect(()=>{registerFlush?.(async()=>!open);return()=>registerFlush?.(null);},[registerFlush,open]);
 return <section className="space-y-4"><h2 className="text-lg font-semibold">Health & nutrition</h2><p className="text-sm text-muted-foreground">{setupCompleted?'Your health answers are saved.':'Your food goal and health answers can be added here.'}</p><Button variant="outline" onClick={()=>setOpen(true)}>{setupCompleted?'Review saved health answers':'Open health setup'}</Button><PhysioHealthIntakeDialog open={open} onOpenChange={setOpen} isEditMode={setupCompleted}/><div className="flex justify-between"><Button variant="ghost" onClick={onBack} disabled={open}>Back</Button><Button onClick={onContinue} disabled={open}>Continue</Button></div></section>;
}
