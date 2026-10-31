import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePitcherSchedule } from "@/hooks/usePitcherSchedule";
import { useSubscription } from "@/hooks/useSubscription";
import { FOCUS_LABEL, ROLE_LABEL, playerPitches, type PitchingRoleAnswer, type PrimaryFocus } from "@/lib/hammer/pitching/pitcherRoleAnswers";

/** Owner Oct 31: pitcher/position focus, pitching role, Limit my pitching.
 *  Every tap saves and rebuilds the next 7 days through the shared pitching-schedule save. */
export function PitcherRoleQuestions({ compact = false }: { compact?: boolean }) {
  const { modules } = useSubscription();
  const s = usePitcherSchedule();
  const settings = s.data?.settings ?? null;
  const focus = (settings?.primary_focus ?? null) as PrimaryFocus | null;
  const role = (settings?.pitching_role ?? null) as PitchingRoleAnswer | null;
  const pitches = playerPitches(modules ?? [], focus);
  const busy = s.saveSettings.isPending || s.isLoading;
  if (s.isError) return <p role="alert" className="text-sm text-destructive">Couldn't load your pitching answers. Try again.</p>;
  const pick = (key: string, on: boolean, label: string, onClick: () => void) =>
    <Button key={key} type="button" size="sm" variant={on ? "default" : "outline"} aria-pressed={on} disabled={busy} className="h-11 whitespace-normal" onClick={onClick}>{label}</Button>;
  return <div className={compact ? "space-y-3" : "space-y-3 rounded-md border border-border/60 bg-card p-3"} data-testid="pitcher-role-questions">
    <div className="space-y-2">
      <p className="text-sm font-medium">Are you mainly a pitcher or a position player?</p>
      <div className="grid grid-cols-2 gap-2">{(Object.keys(FOCUS_LABEL) as PrimaryFocus[]).map(k => pick(k, focus === k, FOCUS_LABEL[k], () => s.saveSettings.mutate({ primary_focus: k })))}</div>
    </div>
    {pitches && <>
      <div className="space-y-2">
        <p className="text-sm font-medium">What's your pitching role?</p>
        <div className="grid grid-cols-3 gap-2">{(Object.keys(ROLE_LABEL) as PitchingRoleAnswer[]).map(k => pick(k, role === k, ROLE_LABEL[k], () => s.saveSettings.mutate({ pitching_role: k })))}</div>
      </div>
      <label className="flex items-center justify-between gap-3 text-sm">
        <span><span className="font-medium">Limit my pitching</span><span className="block text-xs text-muted-foreground">When your arm budget is tight, pitching throws are cut first.</span></span>
        <Switch checked={settings?.limit_pitching === true} disabled={busy} onCheckedChange={v => s.saveSettings.mutate({ limit_pitching: v })} aria-label="Limit my pitching" />
      </label>
    </>}
    {s.saveSettings.isError && <p role="alert" className="text-sm text-destructive">Couldn't save. Try again.</p>}
  </div>;
}
export default PitcherRoleQuestions;
