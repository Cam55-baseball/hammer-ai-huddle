import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, User, Users, Trophy } from "lucide-react";
import { useSentActivities } from "@/hooks/useSentActivities";
import { CoachLogForPlayer, StatInputs, saveCoachEntry } from "@/components/coach/CoachLogForPlayer";
import { generalGameInput, teamLinesToSave, type CoachGameMode, type TeamLineRow } from "@/lib/coach/coachLogging";
import { scoreLine } from "@/lib/coach/games";

const today = () => new Date().toLocaleDateString("en-CA");

interface Lineup { id: string; name: string; players: { athlete_id: string; jersey: string; name: string }[] }

function useLineups() {
  return useQuery({
    queryKey: ["coach-lineups-log"],
    queryFn: async (): Promise<Lineup[]> => {
      const { data: ls, error } = await (supabase as any).from("coach_lineups").select("id, name, coach_lineup_players(athlete_id, jersey)").order("created_at", { ascending: false });
      if (error) throw error;
      const ids = [...new Set((ls ?? []).flatMap((l: any) => (l.coach_lineup_players ?? []).map((p: any) => p.athlete_id)))];
      const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids as string[]) : { data: [] as any[] };
      const name = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name || "Player"]));
      return (ls ?? []).map((l: any) => ({ id: l.id, name: l.name, players: (l.coach_lineup_players ?? []).map((p: any) => ({ athlete_id: p.athlete_id, jersey: p.jersey, name: name.get(p.athlete_id) ?? "Player" })) }));
    },
  });
}

function GameBasics({ date, setDate, opponent, setOpponent, parent, setParent }: { date: string; setDate: (v: string) => void; opponent: string; setOpponent: (v: string) => void; parent: boolean; setParent: (v: boolean) => void }) {
  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1"><Label htmlFor="game-date">Game date</Label><Input id="game-date" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="game-opp">Opponent (optional)</Label><Input id="game-opp" value={opponent} onChange={(e) => setOpponent(e.target.value)} /></div>
    </div>
    <label className="flex items-start gap-2 text-sm"><Checkbox checked={parent} onCheckedChange={(v) => setParent(v === true)} /><span>A parent of every under-13 player here was present and agreed.</span></label>
  </div>;
}

/** (b) Team: every player's line on one screen; "Didn't play" skips them. Server re-checks jersey → player. */
function TeamGame() {
  const lineups = useLineups();
  const qc = useQueryClient();
  const [lineupId, setLineupId] = useState<string | null>(null);
  const [rows, setRows] = useState<TeamLineRow[]>([]);
  const [date, setDate] = useState(today());
  const [opponent, setOpponent] = useState("");
  const [parent, setParent] = useState(false);
  const [busy, setBusy] = useState(false);
  const lineup = lineups.data?.find((l) => l.id === lineupId) ?? null;
  useEffect(() => { setRows((lineup?.players ?? []).map((p) => ({ ...p, played: true, values: {} }))); }, [lineup]);
  const save = async () => {
    const { save, errors } = teamLinesToSave(rows);
    if (errors.length) return toast.error(errors[0]);
    setBusy(true);
    let ok = 0; const failed: string[] = [];
    for (const { row, stats } of save) {
      try { await saveCoachEntry({ athleteId: row.athlete_id, confirmId: row.athlete_id, kind: "game", date, opponent, stats, parentPresent: parent, lineupId: lineupId!, jersey: row.jersey }); ok++; }
      catch (e: any) { failed.push(`#${row.jersey} ${row.name}: ${e.message || "not saved"}`); }
    }
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["coach-entries"] });
    if (failed.length) toast.error(`Saved ${ok}. Not saved — ${failed.join("; ")}`);
    else { toast.success(`Saved ${ok} player line${ok === 1 ? "" : "s"}. Each player can confirm it in My games.`); setRows((r) => r.map((x) => ({ ...x, values: {} }))); }
  };
  if (lineups.isLoading) return <p role="status">Loading your teams…</p>;
  if (lineups.isError) return <p role="alert" className="text-sm text-destructive">Couldn't load your teams. Try again.</p>;
  if (!lineups.data?.length) return <p className="text-sm">No team lineups yet. <Link className="underline" to="/coach/lineup">Make a lineup</Link> (jersey numbers for your players), then come back.</p>;
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">{lineups.data.map((l) => <Button key={l.id} size="sm" variant={l.id === lineupId ? "default" : "outline"} onClick={() => setLineupId(l.id)}>{l.name}</Button>)}</div>
    {lineup && <>
      <GameBasics {...{ date, setDate, opponent, setOpponent, parent, setParent }} />
      <div className="space-y-3" data-testid="team-lines">
        {rows.map((r, i) => <div key={r.athlete_id} className="rounded-md border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">#{r.jersey} {r.name}</p>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!r.played} onCheckedChange={(v) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, played: v !== true } : x))} />Didn't play</label>
          </div>
          {r.played && <StatInputs values={r.values} onChange={(values) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, values } : x))} idPrefix={`${r.athlete_id}-`} />}
        </div>)}
      </div>
      <Button className="w-full" disabled={busy} onClick={save}>Save team game</Button>
    </>}
  </div>;
}

/** (c) General game: date, opponent, score, notes for a team or the whole roster — no player stats. */
function GeneralGame() {
  const lineups = useLineups();
  const { followedPlayers, loadingPlayers, fetchFollowedPlayers } = useSentActivities();
  useEffect(() => { void fetchFollowedPlayers?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [target, setTarget] = useState<string>("roster");
  const [date, setDate] = useState(today());
  const [opponent, setOpponent] = useState("");
  const [my, setMy] = useState("");
  const [opp, setOpp] = useState("");
  const [notes, setNotes] = useState("");
  const [parent, setParent] = useState(false);
  const [busy, setBusy] = useState(false);
  const athletes = useMemo(() => target === "roster" ? followedPlayers.map((p) => p.id) : (lineups.data?.find((l) => l.id === target)?.players ?? []).map((p) => p.athlete_id), [target, followedPlayers, lineups.data]);
  const parsed = generalGameInput(my, opp, athletes);
  const save = async () => {
    if (parsed.error) return toast.error(parsed.error);
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("coach_log_general_game", { _athletes: athletes, _date: date, _opponent: opponent, _my_score: parsed.my, _opp_score: parsed.opp, _notes: notes, _parent_present: parent, _lineup: target === "roster" ? null : target });
    setBusy(false);
    if (error) return toast.error(error.message.replace(/^.*?: /, ""));
    toast.success(`Game saved for ${data?.saved ?? athletes.length} player${(data?.saved ?? athletes.length) === 1 ? "" : "s"}.`);
    setMy(""); setOpp(""); setNotes(""); setOpponent("");
  };
  return <div className="space-y-4">
    <div className="space-y-1">
      <Label>Who played</Label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={target === "roster" ? "default" : "outline"} onClick={() => setTarget("roster")}>My whole roster{loadingPlayers ? "" : ` (${followedPlayers.length})`}</Button>
        {(lineups.data ?? []).map((l) => <Button key={l.id} size="sm" variant={target === l.id ? "default" : "outline"} onClick={() => setTarget(l.id)}>{l.name} ({l.players.length})</Button>)}
      </div>
    </div>
    <GameBasics {...{ date, setDate, opponent, setOpponent, parent, setParent }} />
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1"><Label htmlFor="g-my">Our score</Label><Input id="g-my" inputMode="numeric" value={my} onChange={(e) => setMy(e.target.value.replace(/[^0-9]/g, ""))} /></div>
      <div className="space-y-1"><Label htmlFor="g-opp">Their score</Label><Input id="g-opp" inputMode="numeric" value={opp} onChange={(e) => setOpp(e.target.value.replace(/[^0-9]/g, ""))} /></div>
    </div>
    <p className="text-sm text-muted-foreground">Result: {parsed.my != null && parsed.opp != null ? scoreLine({ my_score: parsed.my, opp_score: parsed.opp }) : "Score not entered"}</p>
    <div className="space-y-1"><Label htmlFor="g-notes">Notes (optional)</Label><Textarea id="g-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
    <Button className="w-full" disabled={busy || !!parsed.error} onClick={save}>Save game</Button>
    {parsed.error && <p className="text-xs text-muted-foreground">{parsed.error}</p>}
  </div>;
}

/** (a) One player: pick a connected player, then the existing locked single-player log. */
function OnePlayer() {
  const { followedPlayers, loadingPlayers, fetchFollowedPlayers } = useSentActivities();
  useEffect(() => { void fetchFollowedPlayers?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [id, setId] = useState<string | null>(null);
  if (id) return <div className="space-y-3"><Button variant="ghost" size="sm" onClick={() => setId(null)}><ArrowLeft className="mr-1 h-4 w-4" />Pick another player</Button><CoachLogForPlayer athleteId={id} startOpen /></div>;
  if (loadingPlayers) return <p role="status">Loading players…</p>;
  if (!followedPlayers.length) return <p className="text-sm">No connected players yet.</p>;
  return <div className="space-y-2">{followedPlayers.map((p) => <Button key={p.id} variant="outline" className="w-full justify-start" onClick={() => setId(p.id)}>{p.full_name ?? "Player"}</Button>)}</div>;
}

export default function CoachLogGame() {
  const [mode, setMode] = useState<CoachGameMode | null>(null);
  const choices: { m: CoachGameMode; icon: typeof User; title: string; body: string }[] = [
    { m: "player", icon: User, title: "One player", body: "That player's line: at-bats, hits, RBI, pitches and more." },
    { m: "team", icon: Users, title: "A team", body: "Every player's line on one screen. Skip anyone who didn't play." },
    { m: "general", icon: Trophy, title: "A general game", body: "Date, opponent, score and notes for the team — no player stats." },
  ];
  return <div className="mx-auto max-w-2xl space-y-4 p-4">
    <Link to="/coach-dashboard" className="inline-flex items-center text-sm underline underline-offset-2"><ArrowLeft className="mr-1 h-4 w-4" />Coach Dashboard</Link>
    <Card>
      <CardHeader><CardTitle>Log a game</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {!mode ? <div className="grid gap-2" data-testid="log-game-choices">
          {choices.map(({ m, icon: Icon, title, body }) => <button key={m} type="button" onClick={() => setMode(m)} className="flex items-start gap-3 rounded-lg border border-border p-4 text-left hover:bg-muted">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span><span className="block font-semibold">{title}</span><span className="block text-sm text-muted-foreground">{body}</span></span>
          </button>)}
        </div> : <>
          <Button variant="ghost" size="sm" onClick={() => setMode(null)}><ArrowLeft className="mr-1 h-4 w-4" />Change how you log</Button>
          {mode === "player" ? <OnePlayer /> : mode === "team" ? <TeamGame /> : <GeneralGame />}
        </>}
        <p className="text-xs text-muted-foreground">Everything saves to each player's own record and shows in their History, The General and the week calendar. Players can confirm or flag what you logged.</p>
      </CardContent>
    </Card>
  </div>;
}
