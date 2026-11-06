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
import { CoachGameDetailsFields, saveGameDetails } from "@/components/coach/CoachGameDetailsFields";
import { cleanDetails, emptyDetails, type DetailsInput } from "@/lib/coach/coachGameDetails";
import { generalGameInput, teamLinesToSave, type CoachGameMode, type TeamLineRow } from "@/lib/coach/coachLogging";
import { scoreLine } from "@/lib/coach/games";
import { useAuth } from "@/hooks/useAuth";
import { gameSpots, withLineupSpot, positionsFor, positionLabel, draftFrom, sameAsSaved, validateLineup, saveLineup, updateLineup, renameLineup, deleteLineup, type DraftRow } from "@/lib/coach/savedLineups";

const today = () => new Date().toLocaleDateString("en-CA");

interface Lineup { id: string; name: string; players: { athlete_id: string; jersey: string; name: string; position?: string | null; batting_order?: number | null }[] }

function useLineups() {
  return useQuery({
    queryKey: ["coach-lineups-log"],
    queryFn: async (): Promise<Lineup[]> => {
      const { data: ls, error } = await (supabase as any).from("coach_lineups").select("id, name, coach_lineup_players(athlete_id, jersey, position, batting_order)").order("created_at", { ascending: false });
      if (error) throw error;
      const ids = [...new Set((ls ?? []).flatMap((l: any) => (l.coach_lineup_players ?? []).map((p: any) => p.athlete_id)))];
      const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids as string[]) : { data: [] as any[] };
      const name = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name || "Player"]));
      return (ls ?? []).map((l: any) => ({ id: l.id, name: l.name, players: (l.coach_lineup_players ?? []).map((p: any) => ({ athlete_id: p.athlete_id, jersey: p.jersey, position: p.position ?? null, batting_order: p.batting_order ?? null, name: name.get(p.athlete_id) ?? "Player" })) }));
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

/** Owner Nov 5 (late): build a lineup, "Save this lineup", "Use a saved lineup", and rename/delete in "My lineups". */
function LineupBuilder({ lineups, onReady, onSpots }: { lineups: Lineup[]; onReady: (id: string | null) => void; onSpots: (s: ReturnType<typeof gameSpots>) => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { followedPlayers, loadingPlayers, fetchFollowedPlayers } = useSentActivities();
  useEffect(() => { void fetchFollowedPlayers?.(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const connected = useMemo(() => followedPlayers.map((p) => ({ id: p.id, name: p.full_name ?? "Player" })), [followedPlayers]);
  const connectedIds = useMemo(() => new Set(connected.map((c) => c.id)), [connected]);
  const [savedId, setSavedId] = useState<string | null>(null);
  const saved = lineups.find((l) => l.id === savedId) ?? null;
  const [draft, setDraft] = useState<DraftRow[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sport, setSport] = useState<"baseball" | "softball">("baseball");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameTo, setRenameTo] = useState("");
  useEffect(() => { setDraft(draftFrom(connected, saved?.players)); setName(saved?.name ?? ""); if (saved?.players.some((p) => p.position === "DP" || p.position === "FLEX")) setSport("softball"); }, [connected, saved]);
  useEffect(() => { onSpots(gameSpots(draft)); }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps
  const matches = sameAsSaved(draft, saved?.players);
  useEffect(() => { onReady(matches ? savedId : null); }, [matches, savedId]); // eslint-disable-line react-hooks/exhaustive-deps
  const refresh = () => qc.invalidateQueries({ queryKey: ["coach-lineups-log"] });
  const save = async (asNew: boolean) => {
    const v = validateLineup(name, draft, connectedIds, sport);
    if (v.error) return toast.error(v.error);
    setBusy(true);
    try {
      if (saved && !asNew) { await updateLineup(supabase as any, saved.id, name, v.players); toast.success("Lineup updated."); }
      else { const id = await saveLineup(supabase as any, user!.id, name, v.players); setSavedId(id); toast.success(`Saved "${name.trim()}".`); }
      await refresh();
    } catch (e: any) { toast.error(e.message); }
    setBusy(false);
  };
  const rename = async (id: string) => { try { await renameLineup(supabase as any, id, renameTo); setRenaming(null); await refresh(); } catch (e: any) { toast.error(e.message); } };
  const remove = async (id: string, n: string) => {
    if (!window.confirm(`Delete the lineup "${n}"? Games you already logged stay saved.`)) return;
    try { await deleteLineup(supabase as any, id); if (id === savedId) setSavedId(null); await refresh(); toast.success("Lineup deleted."); } catch (e: any) { toast.error(e.message); }
  };
  if (loadingPlayers) return <p role="status">Loading players…</p>;
  if (!connected.length) return <p className="text-sm">No connected players yet. Connect with players first, then build a lineup.</p>;
  return <div className="space-y-3" data-testid="lineup-builder">
    <div className="space-y-1">
      <Label>Use a saved lineup</Label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={savedId === null ? "default" : "outline"} onClick={() => setSavedId(null)}>New lineup</Button>
        {lineups.map((l) => <Button key={l.id} size="sm" variant={l.id === savedId ? "default" : "outline"} onClick={() => setSavedId(l.id)}>{l.name}</Button>)}
      </div>
    </div>
    <div className="flex items-center gap-2 text-sm"><span>Sport</span>{(["baseball", "softball"] as const).map((sp) => <Button key={sp} size="sm" variant={sport === sp ? "default" : "outline"} onClick={() => setSport(sp)}>{sp === "baseball" ? "Baseball" : "Softball"}</Button>)}</div>
    <p className="text-xs text-muted-foreground">Position and batting order are for this game. Change them any time; save the lineup to keep them as the defaults.</p>
    <div className="rounded-lg border divide-y">
      {draft.map((r, i) => <div key={r.athlete_id} className="flex items-center gap-2 p-2">
        <Checkbox id={`lp-${r.athlete_id}`} checked={r.included} onCheckedChange={(v) => setDraft((d) => d.map((x, k) => k === i ? { ...x, included: v === true } : x))} />
        <Label htmlFor={`lp-${r.athlete_id}`} className="flex-1 text-sm">{r.name}</Label>
        <Input aria-label={`Jersey for ${r.name}`} className="h-9 w-16" inputMode="numeric" placeholder="#" value={r.jersey} onChange={(e) => { const j = e.target.value.replace(/[^0-9]/g, "").slice(0, 3); setDraft((d) => d.map((x, k) => k === i ? { ...x, jersey: j, included: x.included || j !== "" } : x)); }} />
        <select aria-label={`Position for ${r.name}`} className="h-9 rounded-md border border-input bg-background px-1 text-sm" value={r.position ?? ""} onChange={(e) => setDraft((d) => d.map((x, k) => k === i ? { ...x, position: e.target.value } : x))}>
          <option value="">Pos</option>{positionsFor(sport).map((p) => <option key={p} value={p}>{positionLabel(p)}</option>)}
        </select>
        <Input aria-label={`Batting order for ${r.name}`} className="h-9 w-14" inputMode="numeric" placeholder="Bat" value={r.order ?? ""} onChange={(e) => { const o = e.target.value.replace(/[^0-9]/g, "").slice(0, 2); setDraft((d) => d.map((x, k) => k === i ? { ...x, order: o } : x)); }} />
      </div>)}
    </div>
    <div className="space-y-1"><Label htmlFor="lineup-name">Lineup name</Label><Input id="lineup-name" placeholder="Varsity vs lefties" value={name} onChange={(e) => setName(e.target.value)} /></div>
    <div className="flex flex-wrap gap-2">
      {saved ? <>
        <Button size="sm" disabled={busy || (matches && name.trim() === saved.name)} onClick={() => save(false)}>Save changes</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => save(true)}>Save as a new lineup</Button>
      </> : <Button size="sm" disabled={busy} onClick={() => save(true)}>Save this lineup</Button>}
    </div>
    {!matches && <p className="text-xs text-muted-foreground">Save the lineup to log this game, so every jersey checks out against your players.</p>}
    {lineups.length > 0 && <details className="rounded-lg border p-2" data-testid="my-lineups">
      <summary className="cursor-pointer text-sm font-medium">My lineups ({lineups.length})</summary>
      <div className="mt-2 space-y-2">{lineups.map((l) => <div key={l.id} className="flex flex-wrap items-center gap-2 text-sm">
        {renaming === l.id ? <>
          <Input aria-label="New lineup name" className="h-9 flex-1" value={renameTo} onChange={(e) => setRenameTo(e.target.value)} />
          <Button size="sm" onClick={() => rename(l.id)}>Save</Button><Button size="sm" variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button>
        </> : <>
          <span className="flex-1">{l.name} ({l.players.length})</span>
          <Button size="sm" variant="ghost" onClick={() => { setRenaming(l.id); setRenameTo(l.name); }}>Rename</Button>
          <Button size="sm" variant="ghost" onClick={() => remove(l.id, l.name)}>Delete</Button>
        </>}
      </div>)}</div>
    </details>}
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
  const [gameDetails, setGameDetails] = useState<DetailsInput>(emptyDetails());
  const [rowDetails, setRowDetails] = useState<Record<string, DetailsInput>>({});
  const [spots, setSpots] = useState<ReturnType<typeof gameSpots>>({});
  const detailsFor = (id: string) => withLineupSpot(rowDetails[id] ?? emptyDetails(), spots[id]);
  const lineup = lineups.data?.find((l) => l.id === lineupId) ?? null;
  useEffect(() => { setRows((lineup?.players ?? []).map((p) => ({ ...p, played: true, values: {} }))); }, [lineup]);
  const save = async () => {
    const { save, errors } = teamLinesToSave(rows);
    if (errors.length) return toast.error(errors[0]);
    const g = cleanDetails(gameDetails); if (g.error) return toast.error(g.error);
    for (const { row } of save) { const d = cleanDetails(detailsFor(row.athlete_id)); if (d.error) return toast.error(`#${row.jersey} ${row.name}: ${d.error}`); }
    setBusy(true);
    let ok = 0; const failed: string[] = []; const saved: string[] = [];
    for (const { row, stats } of save) {
      try {
        const r = await saveCoachEntry({ athleteId: row.athlete_id, confirmId: row.athlete_id, kind: "game", date, opponent, stats, parentPresent: parent, lineupId: lineupId!, jersey: row.jersey }); ok++; saved.push(r.id);
        const dErr = await saveGameDetails([r.id], detailsFor(row.athlete_id));
        if (dErr) failed.push(`#${row.jersey} ${row.name}: line saved, details not saved (${dErr})`);
      }
      catch (e: any) { failed.push(`#${row.jersey} ${row.name}: ${e.message || "not saved"}`); }
    }
    const gErr = await saveGameDetails(saved, gameDetails);
    if (gErr) failed.push(`Game details not saved (${gErr})`);
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["coach-entries"] });
    if (failed.length) toast.error(`Saved ${ok}. Not saved — ${failed.join("; ")}`);
    else { toast.success(`Saved ${ok} player line${ok === 1 ? "" : "s"}. Each player can confirm it in My games.`); setRows((r) => r.map((x) => ({ ...x, values: {} }))); setRowDetails({}); setGameDetails(emptyDetails()); }
  };
  if (lineups.isLoading) return <p role="status">Loading your teams…</p>;
  if (lineups.isError) return <p role="alert" className="text-sm text-destructive">Couldn't load your teams. Try again.</p>;
  return <div className="space-y-4">
    <LineupBuilder lineups={lineups.data ?? []} onReady={setLineupId} onSpots={setSpots} />
    {lineup && <>
      <GameBasics {...{ date, setDate, opponent, setOpponent, parent, setParent }} />
      <CoachGameDetailsFields value={gameDetails} onChange={setGameDetails} scope="game" idPrefix="team-" showNotes={false} />
      <div className="space-y-3" data-testid="team-lines">
        {rows.map((r, i) => <div key={r.athlete_id} className="rounded-md border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">#{r.jersey} {r.name}</p>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={!r.played} onCheckedChange={(v) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, played: v !== true } : x))} />Didn't play</label>
          </div>
          {r.played && <StatInputs values={r.values} onChange={(values) => setRows((rs) => rs.map((x, j) => j === i ? { ...x, values } : x))} idPrefix={`${r.athlete_id}-`} />}
          {r.played && <CoachGameDetailsFields value={rowDetails[r.athlete_id] ?? emptyDetails()} onChange={(v) => setRowDetails((m) => ({ ...m, [r.athlete_id]: v }))} scope="player" idPrefix={`${r.athlete_id}-`} />}
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
  const [details, setDetails] = useState<DetailsInput>(emptyDetails());
  const athletes = useMemo(() => target === "roster" ? followedPlayers.map((p) => p.id) : (lineups.data?.find((l) => l.id === target)?.players ?? []).map((p) => p.athlete_id), [target, followedPlayers, lineups.data]);
  const parsed = generalGameInput(my, opp, athletes);
  const save = async () => {
    if (parsed.error) return toast.error(parsed.error);
    const d = cleanDetails(details); if (d.error) return toast.error(d.error);
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("coach_log_general_game", { _athletes: athletes, _date: date, _opponent: opponent, _my_score: parsed.my, _opp_score: parsed.opp, _notes: notes, _parent_present: parent, _lineup: target === "roster" ? null : target });
    if (error) { setBusy(false); return toast.error(error.message.replace(/^.*?: /, "")); }
    const dErr = await saveGameDetails((data?.entries ?? []) as string[], details);
    setBusy(false);
    if (dErr) toast.error(`The game saved, but the extra details didn't: ${dErr}`);
    toast.success(`Game saved for ${data?.saved ?? athletes.length} player${(data?.saved ?? athletes.length) === 1 ? "" : "s"}.`);
    setMy(""); setOpp(""); setNotes(""); setOpponent(""); setDetails(emptyDetails());
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
    <CoachGameDetailsFields value={details} onChange={setDetails} scope="game" idPrefix="gen-" showNotes={false} />
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

export function CoachGameLog() {
  const [mode, setMode] = useState<CoachGameMode | null>(null);
  const choices: { m: CoachGameMode; icon: typeof User; title: string; body: string }[] = [
    { m: "player", icon: User, title: "One player", body: "That player's line: at-bats, hits, RBI, pitches and more." },
    { m: "team", icon: Users, title: "A team", body: "Every player's line on one screen. Skip anyone who didn't play." },
    { m: "general", icon: Trophy, title: "A general game", body: "Date, opponent, score and notes for the team — no player stats." },
  ];
  return <div className="space-y-4" data-testid="coach-game-log">
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
