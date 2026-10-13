import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { STAT_FIELDS, cleanStats, guardSinglePlayer, ENTRY_STATUS_LABEL } from "@/lib/coach/coachLogging";
import { showUndoToast } from "@/lib/games/undoToast";

export function useAthleteHeader(athleteId: string) {
  return useQuery({
    queryKey: ["coach-log-header", athleteId],
    queryFn: async () => {
      const { data } = await supabase.rpc("coach_athlete_glance", { _athlete: athleteId });
      const { data: p } = await supabase.from("profiles").select("avatar_url").eq("id", athleteId).maybeSingle();
      return { name: ((data as any)?.profile?.full_name as string) || "Player", avatar: (p as any)?.avatar_url ?? null };
    },
  });
}

export function StatInputs({ values, onChange }: { values: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {STAT_FIELDS.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label htmlFor={`stat-${f.key}`} className="text-xs">{f.label}</Label>
          <Input id={`stat-${f.key}`} inputMode="numeric" value={values[f.key] ?? ""} onChange={(e) => onChange({ ...values, [f.key]: e.target.value.replace(/[^0-9]/g, "") })} />
        </div>
      ))}
    </div>
  );
}

export async function saveCoachEntry(args: { athleteId: string; confirmId: string; kind: string; date: string; opponent: string; stats: Record<string, number>; parentPresent: boolean; lineupId?: string; jersey?: string }) {
  const { data, error } = await (supabase as any).rpc("coach_log_entry", {
    _athlete: args.athleteId, _confirm_athlete: args.confirmId, _kind: args.kind, _date: args.date, _opponent: args.opponent,
    _stats: args.stats, _parent_present: args.parentPresent, _lineup: args.lineupId ?? null, _jersey: args.jersey ?? null,
  });
  if (error) throw new Error(error.message.replace(/^.*?: /, ""));
  return data as { id: string; label: string };
}

export async function undoCoachEntry(id: string) {
  const { error } = await (supabase as any).rpc("coach_undo_entry", { _entry: id });
  if (error) throw new Error(error.message);
}

/** Option 1 (default): log one player at a time. The player's name and photo stay locked at the top. */
export function CoachLogForPlayer({ athleteId }: { athleteId: string }) {
  const qc = useQueryClient();
  const { data: head } = useAthleteHeader(athleteId);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("game");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [opponent, setOpponent] = useState("");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [parent, setParent] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: entries } = useQuery({
    queryKey: ["coach-entries", athleteId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("coach_logged_entries").select("*").eq("athlete_id", athleteId).neq("status", "undone").order("entry_date", { ascending: false }).limit(20);
      return (data ?? []) as any[];
    },
  });

  const save = async () => {
    const g = guardSinglePlayer(athleteId, athleteId);
    if (!g.ok) return toast.error(g.reason);
    const { stats, error } = cleanStats(vals);
    if (error) return toast.error(error);
    setBusy(true);
    try {
      const r = await saveCoachEntry({ athleteId: g.athleteId!, confirmId: athleteId, kind, date, opponent, stats, parentPresent: parent });
      setVals({}); setOpponent("");
      qc.invalidateQueries({ queryKey: ["coach-entries", athleteId] });
      showUndoToast({ label: `Saved for ${head?.name ?? "this player"}`, description: r.label, undo: async () => { await undoCoachEntry(r.id); qc.invalidateQueries({ queryKey: ["coach-entries", athleteId] }); } });
    } catch (e: any) { toast.error(e.message || "Could not save."); }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      {!open ? (
        <Button onClick={() => setOpen(true)}>Log for this player</Button>
      ) : (
        <div className="rounded-lg border">
          <div className="sticky top-0 z-10 flex items-center gap-3 rounded-t-lg border-b bg-card p-3" data-testid="coach-log-lock">
            <Avatar><AvatarImage src={head?.avatar ?? undefined} alt="" /><AvatarFallback>{(head?.name ?? "P").slice(0, 1)}</AvatarFallback></Avatar>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Logging for</p>
              <p className="font-semibold truncate">{head?.name ?? "Loading…"}</p>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setOpen(false)}>Done</Button>
          </div>
          <div className="space-y-3 p-3">
            <div className="grid grid-cols-2 gap-2">
              <Button variant={kind === "game" ? "default" : "outline"} onClick={() => setKind("game")}>Game</Button>
              <Button variant={kind === "practice" ? "default" : "outline"} onClick={() => setKind("practice")}>Practice</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label htmlFor="log-date" className="text-xs">Date</Label><Input id="log-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="log-opp" className="text-xs">Opponent</Label><Input id="log-opp" value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="Optional" /></div>
            </div>
            <StatInputs values={vals} onChange={setVals} />
            <label className="flex items-start gap-2 text-xs"><Checkbox checked={parent} onCheckedChange={(v) => setParent(!!v)} />Under 13: the parent is here and agrees</label>
            <Button className="w-full" disabled={busy} onClick={save}>Save for {head?.name ?? "this player"}</Button>
            <p className="text-xs text-muted-foreground">Saved as coach-entered with your name and the date. The player confirms or flags it. Their own entries are never changed.</p>
          </div>
        </div>
      )}
      <div className="space-y-2">
        <p className="text-sm font-medium">Coach-entered</p>
        {(entries ?? []).length === 0 && <p className="text-sm text-muted-foreground">No coach entries yet.</p>}
        {(entries ?? []).map((e) => (
          <div key={e.id} className="rounded-lg border p-3 text-sm space-y-0.5">
            <div className="flex justify-between"><span className="font-medium">{e.kind === "game" ? "Game" : "Practice"}{e.opponent ? ` vs ${e.opponent}` : ""}</span><span className="text-muted-foreground">{e.entry_date}</span></div>
            <p>{STAT_FIELDS.filter((f) => e.stats?.[f.key] != null).map((f) => `${f.label}: ${e.stats[f.key]}`).join(" · ")}</p>
            <p className="text-xs text-muted-foreground">Source: {e.coach_label} · {ENTRY_STATUS_LABEL[e.status]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
