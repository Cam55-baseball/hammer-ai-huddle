import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { movementHasPain, movementScreenComplete, type MovementScreen } from "@/lib/assessment/movementScreen";
import { movementSummary } from "@/lib/assessment/movementSummary";
import { movementRescreenDue } from "@/lib/assessment/movementRescreen";
import { getLocalDateString } from "@/utils/dateUtils";
import { MovementScreenForm } from "./MovementScreenForm";
import { Button } from "@/components/ui/button";
import { ReportInjuryDialog } from "@/components/hammer/ReportInjuryDialog";
import type { Json } from "@/integrations/supabase/types";

/** Self-owned observations only; never authors a plan, finding, or clinical interpretation. */
export function SavedMovementSummary({ athleteId }: { athleteId?: string } = {}) {
  const { user } = useAuth();
  return <OwnedMovementSummary key={`${user?.id ?? 'signed-out'}:${athleteId ?? 'self'}`} athleteId={athleteId} />;
}

function OwnedMovementSummary({ athleteId }: { athleteId?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draftState, setDraftState] = useState<{ screen: MovementScreen; source: unknown } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [painOpen, setPainOpen] = useState(false);
  const query = useQuery({ queryKey: ["saved-movement-summary", user?.id, athleteId], enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("Sign in first");
      if (athleteId) {
        const { data, error } = await supabase.rpc('coach_athlete_movement_observations', { _athlete: athleteId });
        if (error) throw error;
        return data as {shared?:boolean; movement_screen?:unknown;updated_at?:string;recorded_by_label?:string};
      }
      const { data, error } = await supabase.from("initial_assessments").select("movement_screen,movement_done_at,updated_at").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    } });
  if (query.error) return <p role="alert" className="text-xs text-destructive">Couldn't load your saved movement checks.</p>;
  if (query.data && 'shared' in query.data && query.data.shared === false) return <p className="text-xs text-muted-foreground">Movement observations are not shared with you.</p>;
  const screen = (query.data?.movement_screen ?? {}) as MovementScreen;
  const source = query.data && 'movement_done_at' in query.data ? query.data.movement_done_at : null;
  const draft = !athleteId && draftState?.source === source ? draftState?.screen ?? null : null;
  const setDraft = (next: MovementScreen | null) => setDraftState(next ? { screen: next, source } : null);
  const rows = movementSummary(screen);
  const due = !athleteId && query.data && 'movement_done_at' in query.data && movementRescreenDue(query.data.movement_done_at as string | null, getLocalDateString());
  const saveRescreen = async () => {
    if (!user || athleteId || !draft || !due || !movementScreenComplete(draft) || saving) return;
    setSaving(true); setSaveError(false);
    try {
      const at = new Date().toISOString();
      const result = await supabase.from('initial_assessments').update({ movement_screen: draft as Json, movement_done_at: at, updated_at: at, ...(movementHasPain(draft) ? { pain_flag: true } : {}) }).eq('user_id', user.id).select('movement_done_at').single();
      if (result.error || !result.data?.movement_done_at || Date.parse(result.data.movement_done_at) !== Date.parse(at)) throw new Error('Unconfirmed screen');
      await qc.invalidateQueries({ queryKey: ['saved-movement-summary', user.id] });
      await qc.invalidateQueries({ queryKey: ['initial-assessment', user.id] });
      setDraft(null);
    } catch { setSaveError(true); }
    finally { setSaving(false); }
  };
  if (!rows.length) return null;
  const statusText = (status: string | null) => status === "controlled" ? "Controlled" : status === "limited" ? "Limited" : status === "pain" ? "Pain reported" : "Not recorded";
  return <><section>{due && <div className="border-l-2 border-primary py-3 pl-3">
    <p className="text-sm font-semibold">Your 12-week movement & safety check is due</p>
    <Button variant="outline" className="mt-2 min-h-11" onClick={() => setDraft({ ...screen, observations: {} })}>Re-check movement & safety</Button>
  </div>}
  {draft && <div className="space-y-3 py-4"><MovementScreenForm value={draft} onChange={setDraft} onPain={() => setPainOpen(true)} />
    {saveError && <p role="alert" className="text-sm text-destructive">Couldn't confirm your saved movement check. Try again.</p>}
    <div className="flex flex-wrap gap-2"><Button disabled={saving || !movementScreenComplete(draft)} onClick={() => void saveRescreen()}>Save movement check</Button><Button variant="ghost" disabled={saving} onClick={() => setDraft(null)}>Cancel</Button></div>
  </div>}</section><details className="border-y border-border py-3" data-saved-movement-summary>
    <summary className="cursor-pointer text-sm font-semibold">Saved movement observations</summary>
    {query.data?.updated_at && <p className="mt-2 text-xs text-muted-foreground">Assessment saved: {new Date(query.data.updated_at).toLocaleDateString()}</p>}
    <p className="mt-2 text-xs text-muted-foreground">These are recorded checks, not a diagnosis or proof of why you move this way. Your prescribed work is unchanged.</p>
    {rows.flatMap(row => (['left','right'] as const).filter(side => row[`${side}Status`] === 'limited').map(side => <p key={`${row.key}-${side}`} className="mt-2 text-sm">{athleteId ? "The player's" : 'Your'} saved check showed limited {row.name.toLowerCase()} on the {side}.</p>))}
    {movementHasPain(screen) && <p className="mt-2 text-sm text-destructive">Pain was reported. Stop painful checks and talk to a qualified professional.</p>}
    <dl className="mt-3 space-y-3">{rows.map(row => <div key={row.key}>
      <dt className="text-sm font-medium">{row.name}</dt>
      <dd className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <span>Left: {row.left == null ? "Not measured" : `${row.left} ${row.unit}`} · {statusText(row.leftStatus)}{row.leftScore == null ? "" : ` · Observation score: ${row.leftScore}/2`}</span>
        <span>Right: {row.right == null ? "Not measured" : `${row.right} ${row.unit}`} · {statusText(row.rightStatus)}{row.rightScore == null ? "" : ` · Observation score: ${row.rightScore}/2`}</span>
      </dd>
    </div>)}</dl>
  </details><ReportInjuryDialog open={painOpen} onOpenChange={setPainOpen} /></>;
}