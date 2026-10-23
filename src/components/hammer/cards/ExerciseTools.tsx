import { lazy, Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOptionalAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useSportTheme } from "@/contexts/SportThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { priorityAccess } from "@/lib/hammer/priorityAccess";
import { useQueryClient } from "@tanstack/react-query";
import { Video, Check } from "lucide-react";

const DelayCam = lazy(() => import("@/components/analyze/DelayCam").then(m => ({ default: m.DelayCam })));

/** Physical tools overlay the existing exercise, preserving its mounted entries and rest. */
export function ExerciseTools({ module, exerciseId, planDate }: { module: string; exerciseId: string; planDate: string }) {
  const { user } = useOptionalAuth();
  if (!user) return null;
  return <SignedInExerciseTools module={module} exerciseId={exerciseId} planDate={planDate} userId={user.id} />;
}
function SignedInExerciseTools({ module, exerciseId, planDate, userId }: { module: string; exerciseId: string; planDate: string; userId: string }) {
  const { sport } = useSportTheme();
  const { modules, loading } = useSubscription();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);
  const [started, setStarted] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clipModule = module === "hitting" || module === "bat_speed" ? "hitting" : module === "pitching" ? "pitching" : module === "throwing" ? "throwing" : null;
  const access = priorityAccess(modules, sport);
  const eligible = clipModule === "hitting" ? access.hasHitting : clipModule === "pitching" ? access.hasPitching : clipModule === "throwing" ? access.hasThrowing : false;
  const key = `hm-tool:${userId}:${sport}:${planDate}:${exerciseId}`;
  useEffect(() => { setUsed(localStorage.getItem(key) === "1"); setStarted(null); setError(null); }, [key]);
  if (!clipModule || !eligible || loading) return null;
  const checkOff = async () => {
    if (!started || saving) return;
    setSaving(true); setError(null);
    const idKey = `${key}:session`;
    const id = localStorage.getItem(idKey) ?? crypto.randomUUID();
    localStorage.setItem(idKey, id);
    const ended = new Date().toISOString();
    // Self-report of mirror use, not a clip, measurement, analysis result or new training dose.
    const result = await supabase.from("delaycam_sessions").upsert({ id, user_id: userId, sport, module: clipModule,
      started_at: started, ended_at: ended, duration_sec: null, processing_state: "recorded",
      summary: { usage: "athlete_checked", exercise_id: exerciseId, plan_date: planDate },
    });
    setSaving(false);
    if (result.error) { setError("Couldn't save Delaycam usage. Try checking it off again."); return; }
    localStorage.setItem(key, "1"); setUsed(true);
    await qc.invalidateQueries({ queryKey: ["delaycam-reminder", userId, sport, clipModule] });
  };
  return <div className="space-y-2" data-exercise-tools>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => { setStarted(new Date().toISOString()); setOpen(true); }}><Video className="mr-1 h-4 w-4" />Use Delaycam</Button>
      {started && !used && !open && <Button size="sm" variant="outline" disabled={saving} onClick={() => void checkOff()}>I used Delaycam</Button>}
      {used && <span className="flex items-center gap-1 text-xs text-primary"><Check className="h-4 w-4" />Delaycam used</span>}
    </div>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="z-[70] max-h-[95dvh] w-[calc(100%-1rem)] overflow-y-auto p-3">
        <DialogHeader><DialogTitle>Delaycam</DialogTitle></DialogHeader>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Opening camera…</p>}><DelayCam module={clipModule} sport={sport} /></Suspense>
        <Button variant="outline" onClick={() => setOpen(false)}>Return to exercise</Button>
      </DialogContent>
    </Dialog>
  </div>;
}