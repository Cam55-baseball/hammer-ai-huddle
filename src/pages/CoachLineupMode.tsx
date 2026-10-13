import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { guardLineupPlay, cleanStats, type LineupSpot } from "@/lib/coach/coachLogging";
import { StatInputs, saveCoachEntry, undoCoachEntry } from "@/components/coach/CoachLogForPlayer";
import { showUndoToast } from "@/lib/games/undoToast";

/** Option 2: lineup mode. Every play needs a jersey tap plus a name check. */
export default function CoachLineupMode() {
  const qc = useQueryClient();
  const [lineupId, setLineupId] = useState<string | null>(null);
  const [jersey, setJersey] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [kind, setKind] = useState("game");
  const [opponent, setOpponent] = useState("");
  const [parent, setParent] = useState(false);
  const [newName, setNewName] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});

  const { data: roster } = useQuery({
    queryKey: ["coach-lineup-roster"],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("coach_team_discipline", {});
      const ids: string[] = ((data as any)?.players ?? []).map((p: any) => p.athlete_id ?? p.id).filter(Boolean);
      const names = new Map<string, string>(((data as any)?.players ?? []).map((p: any) => [p.athlete_id ?? p.id, p.name ?? p.full_name ?? "Player"]));
      return ids.map((id) => ({ id, name: names.get(id) ?? "Player" }));
    },
  });
  const { data: lineups } = useQuery({
    queryKey: ["coach-lineups"],
    queryFn: async () => {
      const { data: ls } = await (supabase as any).from("coach_lineups").select("id, name, coach_lineup_players(athlete_id, jersey)").order("created_at", { ascending: false });
      return (ls ?? []) as any[];
    },
  });
  const nameOf = (id: string) => roster?.find((r) => r.id === id)?.name ?? "Player";
  const current = lineups?.find((l) => l.id === lineupId);
  const spots: LineupSpot[] = (current?.coach_lineup_players ?? []).map((p: any) => ({ ...p, name: nameOf(p.athlete_id) }))
    .sort((a: LineupSpot, b: LineupSpot) => Number(a.jersey) - Number(b.jersey));
  const tapped = spots.find((s) => s.jersey === jersey);

  const createLineup = async () => {
    const players = Object.entries(draft).filter(([, j]) => j).map(([athlete_id, j]) => ({ athlete_id, jersey: j }));
    if (!newName.trim() || players.length === 0) return toast.error("Name the lineup and give at least one player a jersey number.");
    const { data, error } = await (supabase as any).rpc("coach_save_lineup", { _name: newName.trim(), _players: players });
    if (error) return toast.error(error.message.includes("unique") ? "Two players can't share a jersey number." : error.message);
    setLineupId(data); setNewName(""); setDraft({});
    qc.invalidateQueries({ queryKey: ["coach-lineups"] });
  };

  const save = async () => {
    const g = guardLineupPlay(spots, jersey, confirmed);
    if (!g.ok) return toast.error(g.reason);
    const { stats, error } = cleanStats(vals);
    if (error) return toast.error(error);
    try {
      const r = await saveCoachEntry({ athleteId: g.athleteId, confirmId: confirmed!, kind, date: new Date().toISOString().slice(0, 10), opponent, stats, parentPresent: parent, lineupId: lineupId!, jersey: jersey! });
      const who = `#${jersey} ${tapped?.name}`;
      setJersey(null); setConfirmed(null); setVals({}); setParent(false);
      showUndoToast({ label: `Saved for ${who}`, description: r.label, undo: () => undoCoachEntry(r.id) });
    } catch (e: any) { toast.error(e.message || "Could not save."); }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <h1 className="text-xl font-semibold">Lineup mode</h1>
        <p className="text-sm text-muted-foreground">Tap the jersey, check the name, then save. One-player logging on each player's page is the default.</p>
        <div className="flex flex-wrap gap-2">
          {(lineups ?? []).map((l) => <Button key={l.id} size="sm" variant={l.id === lineupId ? "default" : "outline"} onClick={() => { setLineupId(l.id); setJersey(null); setConfirmed(null); }}>{l.name}</Button>)}
        </div>
        {!current && (
          <div className="rounded-lg border p-3 space-y-2">
            <p className="font-medium text-sm">New lineup</p>
            <Input placeholder="Lineup name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            {(roster ?? []).length === 0 && <p className="text-sm text-muted-foreground">No connected players yet.</p>}
            {(roster ?? []).map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm">{p.name}</span>
                <Input aria-label={`Jersey for ${p.name}`} className="w-20" inputMode="numeric" placeholder="#" value={draft[p.id] ?? ""} onChange={(e) => setDraft({ ...draft, [p.id]: e.target.value.replace(/[^0-9]/g, "").slice(0, 3) })} />
              </div>
            ))}
            <Button onClick={createLineup}>Save lineup</Button>
          </div>
        )}
        {current && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {spots.map((s) => <Button key={s.jersey} variant={jersey === s.jersey ? "default" : "outline"} className="h-14 text-lg" onClick={() => { setJersey(s.jersey); setConfirmed(null); }}>#{s.jersey}</Button>)}
            </div>
            {tapped && (
              <div className="rounded-lg border p-3 space-y-3">
                <label className="flex items-center gap-2 text-base font-semibold">
                  <Checkbox checked={confirmed === tapped.athlete_id} onCheckedChange={(v) => setConfirmed(v ? tapped.athlete_id : null)} />
                  This is {tapped.name} (#{tapped.jersey})
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={kind === "game" ? "default" : "outline"} onClick={() => setKind("game")}>Game</Button>
                  <Button variant={kind === "practice" ? "default" : "outline"} onClick={() => setKind("practice")}>Practice</Button>
                </div>
                <div className="space-y-1"><Label htmlFor="lu-opp" className="text-xs">Opponent</Label><Input id="lu-opp" value={opponent} onChange={(e) => setOpponent(e.target.value)} placeholder="Optional" /></div>
                <StatInputs values={vals} onChange={setVals} />
                <label className="flex items-start gap-2 text-xs"><Checkbox checked={parent} onCheckedChange={(v) => setParent(!!v)} />Under 13: the parent is here and agrees</label>
                <Button className="w-full" disabled={confirmed !== tapped.athlete_id} onClick={save}>Save for #{tapped.jersey} {tapped.name}</Button>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => setLineupId(null)}>Make another lineup</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
