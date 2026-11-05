/**
 * Owner Nov 5 round 4 — GAME-DAY LOGGING CARD. Shows today's scheduled game in the day's order,
 * the plan around it before the game, a guided one-section-at-a-time log after it, and a clean
 * summary once logged. Program content comes from the shared program judge (useProgramModules →
 * programOf). Saves through the existing game-log rows; rows the card wrote are marked in notes so
 * Edit replaces only its own entries (detailed entries from Games stay).
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, MapPin, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProgramModules } from "@/hooks/useProgramModules";
import { localIso } from "@/hooks/usePitcherSchedule";
import { programOf, type TrainingProgram } from "../../../supabase/functions/_shared/programAccess";
import { AB_RESULTS } from "@/lib/games/glossary";
import { asksRunners, asksScored, type Base } from "@/lib/games/rbi";
import { atBatEntryPayload } from "@/lib/games/atBatEntry";
import {
  gameSections, asksDidYouPitch, gamePhase, summaryLine, ledgerRows, lineFromRows, emptyLine, atBatRbi, timeLabel, sportWords,
  type GameLine, type GameSectionId, type AtBatEntry,
} from "@/lib/games/gameDayCard";

export const GAME_CARD_NOTE = "Logged from the Game card";
const POSITIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
const SECTION_TITLE: Record<GameSectionId, string> = { hitting: "Hitting", fielding: "Fielding", baserunning: "Baserunning", pitching: "Pitching", review: "Review" };

export interface GameInfo { id: string | null; opponent: string | null; time: string | null; homeAway: string | null; venue: string | null; status: string | null }
export interface GameCardDemo { program: TrainingProgram; sport: "baseball" | "softball"; game: GameInfo; nowMinutes: number; line?: GameLine; startOpen?: boolean; step?: number; pitched?: boolean | null }

const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

export function GameDayCard({ demo, sport: sportProp }: { demo?: GameCardDemo; sport?: "baseball" | "softball" }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { modules } = useProgramModules();
  const sport = demo?.sport ?? sportProp ?? "baseball";
  const program = demo?.program ?? programOf(sport, modules);
  const today = localIso();

  const q = useQuery({
    queryKey: ["game-day-card", user?.id, sport, today],
    enabled: !!user && !demo,
    queryFn: async () => {
      const db = supabase as any;
      const [gp, cal] = await Promise.all([
        db.from("gp_games").select("*").eq("user_id", user!.id).eq("sport", sport).eq("game_date", today).is("deleted_at", null)
          .eq("ignored_for_training", false).not("status", "in", "(canceled,cancelled,rescheduled)").order("created_at").limit(1),
        db.from("calendar_events").select("id, title, event_date, start_time").eq("user_id", user!.id).eq("sport", sport).is("deleted_at", null)
          .eq("event_date", today).eq("event_type", "game").eq("ignored_for_training", false).limit(1),
      ]);
      if (gp.error) throw gp.error;
      const g = (gp.data ?? [])[0] ?? null;
      const c = cal.error ? null : (cal.data ?? [])[0] ?? null;
      if (!g && !c) return null;
      let rows = { atBats: [] as any[], defense: [] as any[], baserun: [] as any[] };
      if (g) {
        const [ab, df, br] = await Promise.all([
          db.from("gp_at_bats").select("*").eq("user_id", user!.id).eq("game_id", g.id),
          db.from("gp_defense_plays").select("*").eq("user_id", user!.id).eq("game_id", g.id),
          db.from("gp_baserun_events").select("*").eq("user_id", user!.id).eq("game_id", g.id),
        ]);
        for (const r of [ab, df, br]) if (r.error) throw r.error;
        rows = { atBats: ab.data ?? [], defense: df.data ?? [], baserun: br.data ?? [] };
      }
      const info: GameInfo = g
        ? { id: g.id, opponent: g.opponent_team, time: g.scheduled_time ?? c?.start_time ?? null, homeAway: g.home_away, venue: g.venue, status: g.status }
        : { id: null, opponent: c?.title ?? null, time: c?.start_time ?? null, homeAway: null, venue: null, status: null };
      return { info, game: g, rows };
    },
  });

  const data = demo ? { info: demo.game, game: null, rows: null } : q.data;
  const [open, setOpen] = useState(!!demo?.startOpen);
  const [saved, setSaved] = useState<GameLine | null>(null);
  if (!demo && (q.isLoading || !data)) return null;
  if (!demo && q.error) return <p role="alert" className="text-sm text-destructive">Couldn't load today's game.</p>;
  if (!data) return null;

  const all = demo ? (demo.line ?? null) : data.rows ? lineFromRows({ ...data.rows, game: data.game }) : null;
  const status = saved ? "final" : data.info.status;
  const phase = gamePhase({ status, time: data.info.time, nowMinutes: demo?.nowMinutes ?? nowMin() });
  const pitchedSaved = !!all?.pitching;
  const viewSections = gameSections(program, pitchedSaved || !!saved?.pitching);
  const shown = saved ?? all;

  return (
    <Card data-testid="game-day-card" className="overflow-hidden border-primary/30">
      <GameHeader info={data.info} sport={sport} />
      <div className="p-4 pt-3">
        {phase === "before" && !open && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground" data-testid="game-plan-around">Pre-game warm-up above · Recovery after</p>
            <Button variant="outline" className="h-11 w-full" onClick={() => setOpen(true)}>Log early</Button>
          </div>
        )}
        {phase === "log" && !open && (
          <Button className="h-12 w-full text-base" onClick={() => setOpen(true)} data-testid="log-your-game">
            <Trophy className="mr-2 h-4 w-4" aria-hidden /> Log your game
          </Button>
        )}
        {phase === "logged" && !open && shown && (
          <div className="flex items-center justify-between gap-3" data-testid="game-summary">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Final line</p>
              <p className="truncate text-base font-semibold">{summaryLine(shown, viewSections)}</p>
            </div>
            <Button variant="outline" size="sm" className="h-10 shrink-0" onClick={() => setOpen(true)}><Pencil className="mr-1.5 h-4 w-4" aria-hidden />Edit</Button>
          </div>
        )}
        {open && (
          <GameLogFlow
            program={program} sport={sport} demo={demo}
            initial={demo?.line ?? (data.rows ? lineFromRows({
              atBats: data.rows.atBats.filter((r: any) => r.notes === GAME_CARD_NOTE),
              defense: data.rows.defense.filter((r: any) => r.notes === GAME_CARD_NOTE),
              baserun: data.rows.baserun.filter((r: any) => r.notes === GAME_CARD_NOTE),
              game: data.game,
            }) : emptyLine())}
            onCancel={() => setOpen(false)}
            onSave={async (line, sections) => {
              if (!demo) await saveGame({ userId: user!.id, sport, today, info: data.info, game: data.game, line, sections });
              setSaved(line);
              if (!demo) for (const k of ["game-day-card", "wk-rx", "wk-rx-game-day", "gp-games-list", "game-log-prompt", "morning-game-questions", "game-pitch-load", "arm-ledger", "planning-arm-history", "pitcher-schedule", "schedule-window-games", "gp-signal-games"]) qc.invalidateQueries({ queryKey: [k] });
            }}
            onDone={() => setOpen(false)}
          />
        )}
      </div>
    </Card>
  );
}

function GameHeader({ info, sport }: { info: GameInfo; sport: "baseball" | "softball" }) {
  const t = timeLabel(info.time);
  const where = info.homeAway === "home" ? "Home" : info.homeAway === "away" ? "Away" : info.homeAway === "neutral" ? "Neutral site" : null;
  const opp = info.opponent ? `${info.homeAway === "away" ? "@" : "vs."} ${info.opponent}` : `Today's ${sportWords(sport).game}`;
  return (
    <div className="border-b border-border bg-primary/5 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">Game</span>
        {t && <span className="text-xs font-medium text-muted-foreground">{t}</span>}
      </div>
      <h3 className="mt-1 text-lg font-semibold leading-tight" data-testid="game-opponent">{opp}</h3>
      {(where || info.venue) && (
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          {info.venue && <MapPin className="h-3 w-3" aria-hidden />}
          {[where, info.venue].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}

function Stepper({ label, value, onChange, min = 0, max = 200, help }: { label: string; value: number; onChange: (n: number) => void; min?: number; max?: number; help?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0"><p className="text-sm font-medium">{label}</p>{help && <p className="text-xs text-muted-foreground">{help}</p>}</div>
      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" variant="outline" size="icon" className="h-11 w-11 text-lg" aria-label={`Less ${label}`} onClick={() => onChange(Math.max(min, value - 1))}>−</Button>
        <span className="w-8 text-center text-lg font-semibold tabular-nums" aria-live="polite">{value}</span>
        <Button type="button" variant="outline" size="icon" className="h-11 w-11 text-lg" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, value + 1))}>+</Button>
      </div>
    </div>
  );
}

function Chips<T extends string | number>({ options, value, onPick, label, cols = 3 }: { options: { v: T; l: string }[]; value: T | null; onPick: (v: T) => void; label: string; cols?: number }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={String(o.v)} type="button" role="radio" aria-checked={value === o.v} onClick={() => onPick(o.v)}
          className={`min-h-11 rounded-lg border px-2 text-sm font-medium transition-colors ${value === o.v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent"}`}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function GameLogFlow({ program, sport, initial, onCancel, onSave, onDone, demo }: {
  program: TrainingProgram | null; sport: "baseball" | "softball"; initial: GameLine; demo?: GameCardDemo;
  onCancel: () => void; onSave: (line: GameLine, sections: GameSectionId[]) => Promise<void>; onDone: () => void;
}) {
  const [line, setLine] = useState<GameLine>(initial);
  const [pitched, setPitched] = useState<boolean | null>(demo?.pitched ?? (asksDidYouPitch(program) ? (initial.pitching ? true : null) : null));
  const sections = useMemo(() => gameSections(program, pitched === true), [program, pitched]);
  const [step, setStep] = useState(demo?.step ?? 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const words = sportWords(sport);

  if (done) return (
    <div className="space-y-3 py-2 text-center" data-testid="game-saved">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-6 w-6" aria-hidden /></div>
      <p className="text-lg font-semibold">Game saved</p>
      <p className="text-base">{summaryLine(line, sections)}</p>
      <p className="text-sm text-muted-foreground">Your plan, your running count and your coach's view now include this game.</p>
      <Button className="h-11 w-full" onClick={onDone}>Done</Button>
    </div>
  );

  if (asksDidYouPitch(program) && pitched === null) return (
    <div className="space-y-3" data-testid="did-you-pitch">
      <p className="text-base font-semibold">Did you pitch today?</p>
      <p className="text-sm text-muted-foreground">If you did, you'll log your pitching line {words.pitchPlace} too.</p>
      <div className="grid grid-cols-2 gap-2">
        <Button className="h-12" onClick={() => setPitched(true)}>Yes, I pitched</Button>
        <Button variant="outline" className="h-12" onClick={() => setPitched(false)}>No</Button>
      </div>
      <Button variant="ghost" className="h-10 w-full" onClick={onCancel}>Cancel</Button>
    </div>
  );

  const id = sections[Math.min(step, sections.length - 1)];
  const last = id === "review";
  const patch = (p: Partial<GameLine>) => setLine((l) => ({ ...l, ...p }));
  const pitching = line.pitching ?? { pitches: null, battersFaced: null, innings: null, outs: null, strikeouts: null, walks: null, firstPitchStrikes: null, twoBallCounts: null, soft: null, medium: null, hard: null, runnersOn: null, stealsAllowed: null, stealAttempts: null };
  const setP = (k: keyof typeof pitching, v: number) => patch({ pitching: { ...pitching, [k]: v } });
  const pv = (k: keyof typeof pitching) => Number(pitching[k] ?? 0);
  const blocker = id === "fielding" && line.chances > 0 && !line.position ? "Pick where you played." : id === "pitching" && pitching.pitches == null ? "Enter your pitch count (it protects your arm)." : null;

  return (
    <div className="space-y-4" data-testid={`game-step-${id}`}>
      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{SECTION_TITLE[id]}</span>
          <span>Step {step + 1} of {sections.length}</span>
        </div>
        <Progress value={((step + 1) / sections.length) * 100} className="h-1.5" />
      </div>

      {id === "hitting" && <HittingStep atBats={line.atBats} onChange={(atBats) => patch({ atBats })} />}
      {id === "fielding" && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Where did you play?</p>
          <Chips label="Position" cols={5} value={line.position} onPick={(v) => patch({ position: v })} options={POSITIONS.map((p) => ({ v: p, l: p }))} />
          <div className="divide-y divide-border rounded-lg border border-border px-3">
            <Stepper label="Chances" help="Balls hit or thrown to you that you had to make a play on" value={line.chances} onChange={(n) => patch({ chances: n, errors: Math.min(line.errors, n) })} />
            <Stepper label="Errors" value={line.errors} max={line.chances} onChange={(n) => patch({ errors: n })} />
          </div>
        </div>
      )}
      {id === "baserunning" && (
        <div className="divide-y divide-border rounded-lg border border-border px-3">
          <Stepper label="Stolen bases" value={line.steals} onChange={(n) => patch({ steals: n })} />
          <Stepper label="Caught stealing" value={line.caught} onChange={(n) => patch({ caught: n })} />
          <Stepper label="Runs scored" value={line.runs} onChange={(n) => patch({ runs: n })} />
        </div>
      )}
      {id === "pitching" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Your pitching line {words.pitchPlace}.</p>
          <div className="divide-y divide-border rounded-lg border border-border px-3">
            <Stepper label="Pitches" help="Every pitch you threw in the game" max={200} value={pv("pitches")} onChange={(n) => setP("pitches", n)} />
            <Stepper label="Batters faced" value={pv("battersFaced")} onChange={(n) => setP("battersFaced", n)} />
            <Stepper label="Full innings" value={pv("innings")} max={15} onChange={(n) => setP("innings", n)} />
            <Stepper label="Extra outs" help="Outs in your last, unfinished inning (0–2)" value={pv("outs")} max={2} onChange={(n) => setP("outs", n)} />
            <Stepper label="Strikeouts" value={pv("strikeouts")} onChange={(n) => setP("strikeouts", n)} />
            <Stepper label="Walks" value={pv("walks")} onChange={(n) => setP("walks", n)} />
            <Stepper label="First-pitch strikes" help="Batters who got strike one on the first pitch" value={pv("firstPitchStrikes")} onChange={(n) => setP("firstPitchStrikes", n)} />
            <Stepper label="Two-ball counts" help="Batters who got to two balls" value={pv("twoBallCounts")} onChange={(n) => setP("twoBallCounts", n)} />
          </div>
          <p className="pt-1 text-sm font-medium">Contact against you</p>
          <div className="divide-y divide-border rounded-lg border border-border px-3">
            <Stepper label="Soft" value={pv("soft")} onChange={(n) => setP("soft", n)} />
            <Stepper label="Medium" value={pv("medium")} onChange={(n) => setP("medium", n)} />
            <Stepper label="Hard" value={pv("hard")} onChange={(n) => setP("hard", n)} />
          </div>
          <p className="pt-1 text-sm font-medium">Runners</p>
          <div className="divide-y divide-border rounded-lg border border-border px-3">
            <Stepper label="Runners on base" help="Batters who reached base against you" value={pv("runnersOn")} onChange={(n) => setP("runnersOn", n)} />
            <Stepper label="Steal attempts" value={pv("stealAttempts")} onChange={(n) => setP("stealAttempts", n)} />
            <Stepper label="Steals allowed" value={pv("stealsAllowed")} max={pv("stealAttempts")} onChange={(n) => setP("stealsAllowed", n)} />
          </div>
        </div>
      )}
      {id === "review" && (
        <div className="space-y-3" data-testid="game-review">
          <p className="text-sm text-muted-foreground">Check it, then save.</p>
          <p className="rounded-lg bg-muted/50 p-3 text-center text-lg font-semibold">{summaryLine(line, sections)}</p>
          <ul className="space-y-2 text-sm">
            {sections.filter((s) => s !== "review").map((s, i) => (
              <li key={s} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                <span><span className="font-medium">{SECTION_TITLE[s]}:</span> {reviewLine(s, line)}</span>
                <button type="button" className="shrink-0 text-xs font-medium text-primary underline-offset-2 hover:underline" onClick={() => setStep(i)}>Change</button>
              </li>
            ))}
          </ul>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
        </div>
      )}

      {blocker && <p className="text-sm text-muted-foreground" role="status">{blocker}</p>}
      <div className="flex gap-2">
        <Button variant="outline" className="h-12 flex-1" onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}>
          {step === 0 ? "Cancel" : <><ChevronLeft className="mr-1 h-4 w-4" aria-hidden />Back</>}
        </Button>
        {!last ? (
          <Button className="h-12 flex-1" disabled={!!blocker} onClick={() => setStep(step + 1)}>Next<ChevronRight className="ml-1 h-4 w-4" aria-hidden /></Button>
        ) : (
          <Button className="h-12 flex-1" disabled={busy} data-testid="save-game" onClick={async () => {
            setBusy(true); setErr(null);
            try { await onSave(line, sections); setDone(true); }
            catch (e: any) { setErr(`Couldn't save your game: ${e?.message ?? "try again"}. Nothing was lost — tap Save again.`); }
            finally { setBusy(false); }
          }}>{busy ? "Saving…" : "Save game"}</Button>
        )}
      </div>
    </div>
  );
}

function reviewLine(s: GameSectionId, l: GameLine): string {
  if (s === "hitting") return l.atBats.length ? `${l.atBats.length} at-bat${l.atBats.length === 1 ? "" : "s"}, ${l.atBats.reduce((n, a) => n + atBatRbi(a), 0)} RBI` : "No at-bats";
  if (s === "fielding") return l.position ? `${l.position} · ${l.chances} chances · ${l.errors} errors` : "Didn't play the field";
  if (s === "baserunning") return `${l.steals} SB · ${l.caught} CS · ${l.runs} runs`;
  if (s === "pitching") { const p = l.pitching; return p ? `${p.pitches ?? 0} pitches · ${p.innings ?? 0}${p.outs ? `.${p.outs}` : ""} IP · ${p.strikeouts ?? 0} K · ${p.walks ?? 0} BB` : "Not entered"; }
  return "";
}

const RESULT_GROUPS: { title: string; codes: string[] }[] = [
  { title: "Hits", codes: ["1B", "2B", "3B", "HR"] },
  { title: "On base", codes: ["BB", "HBP", "ROE", "FC"] },
  { title: "Outs", codes: ["K_swinging", "K_looking", "GO", "FO", "LO", "PO", "SF", "SAC"] },
];
const plain = (c: string) => AB_RESULTS.find((r) => r.code === c)?.plain ?? c;

function HittingStep({ atBats, onChange }: { atBats: AtBatEntry[]; onChange: (a: AtBatEntry[]) => void }) {
  const [draft, setDraft] = useState<AtBatEntry | null>(atBats.length ? null : { result: "", inning: 0 });
  const ready = !!draft?.result && draft.inning > 0;
  return (
    <div className="space-y-3">
      {atBats.length > 0 && (
        <ol className="space-y-2">
          {atBats.map((a, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm">
              <span><span className="font-medium">AB {i + 1}:</span> {plain(a.result)} · inning {a.inning}{atBatRbi(a) ? ` · ${atBatRbi(a)} RBI` : ""}</span>
              <button type="button" aria-label={`Remove at-bat ${i + 1}`} className="p-2 text-muted-foreground hover:text-foreground" onClick={() => onChange(atBats.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ol>
      )}
      {draft ? (
        <div className="space-y-3 rounded-lg border border-border p-3" data-testid="at-bat-draft">
          <p className="text-sm font-semibold">At-bat {atBats.length + 1}: how did it end?</p>
          {RESULT_GROUPS.map((g) => (
            <div key={g.title} className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.title}</p>
              <Chips label={g.title} cols={g.codes.length > 4 ? 4 : g.codes.length} value={draft.result || null}
                onPick={(v) => setDraft({ ...draft, result: v, runners: asksRunners(v) ? draft.runners ?? undefined : undefined, scored: null, rbi: null })}
                options={g.codes.map((c) => ({ v: c, l: plain(c).replace("Strikeout ", "K ") }))} />
            </div>
          ))}
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Which inning?</p>
            <Chips label="Inning" cols={5} value={draft.inning || null} onPick={(v) => setDraft({ ...draft, inning: v })}
              options={Array.from({ length: 10 }, (_, i) => ({ v: i + 1, l: i === 9 ? "10+" : String(i + 1) }))} />
          </div>
          {asksRunners(draft.result) && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Anyone on base?</p>
              <div className="grid grid-cols-4 gap-2">
                <button type="button" aria-pressed={(draft.runners ?? null)?.length === 0} onClick={() => setDraft({ ...draft, runners: [], scored: 0 })}
                  className={`min-h-11 rounded-lg border text-sm font-medium ${draft.runners && draft.runners.length === 0 ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>Empty</button>
                {([1, 2, 3] as Base[]).map((b) => {
                  const on = !!draft.runners?.includes(b);
                  return <button key={b} type="button" aria-pressed={on} onClick={() => { const r = new Set(draft.runners ?? []); on ? r.delete(b) : r.add(b); setDraft({ ...draft, runners: [...r].sort() as Base[], scored: Math.min(draft.scored ?? 0, r.size) }); }}
                    className={`min-h-11 rounded-lg border text-sm font-medium ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{b === 1 ? "1st" : b === 2 ? "2nd" : "3rd"}</button>;
                })}
              </div>
            </div>
          )}
          {asksScored(draft.result) && (draft.runners?.length ?? 0) > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">How many scored on it?</p>
              <Chips label="Scored" cols={4} value={draft.scored ?? 0} onPick={(v) => setDraft({ ...draft, scored: v })}
                options={Array.from({ length: (draft.runners?.length ?? 0) + 1 }, (_, i) => ({ v: i, l: String(i) }))} />
            </div>
          )}
          {draft.result && <p className="text-sm text-muted-foreground">RBI: <span className="font-semibold text-foreground">{atBatRbi(draft)}</span></p>}
          <div className="flex gap-2">
            {atBats.length > 0 && <Button variant="ghost" className="h-11 flex-1" onClick={() => setDraft(null)}>Cancel</Button>}
            <Button className="h-11 flex-1" disabled={!ready} onClick={() => { onChange([...atBats, draft]); setDraft(null); }}>Add at-bat</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="h-12 w-full" onClick={() => setDraft({ result: "", inning: 0 })}><Plus className="mr-1.5 h-4 w-4" aria-hidden />Add at-bat</Button>
      )}
      {atBats.length === 0 && !draft && <p className="text-sm text-muted-foreground">Didn't bat? Tap Next.</p>}
    </div>
  );
}

async function saveGame(o: { userId: string; sport: string; today: string; info: GameInfo; game: any; line: GameLine; sections: GameSectionId[] }) {
  const db = supabase as any;
  let gameId = o.info.id;
  if (!gameId) {
    const ins = await db.from("gp_games").insert({ user_id: o.userId, game_date: o.today, sport: o.sport, opponent_team: o.info.opponent, scheduled_time: o.info.time, status: "draft" }).select("id").single();
    if (ins.error) throw ins.error;
    gameId = ins.data.id as string;
  }
  const rows = ledgerRows(o.line, o.sections, { userId: o.userId, gameId: gameId! });
  // Edit replaces only the entries this card wrote (detailed entries from Games stay).
  for (const t of ["gp_at_bats", "gp_defense_plays", "gp_baserun_events"]) {
    const d = await db.from(t).delete().eq("user_id", o.userId).eq("game_id", gameId).eq("notes", GAME_CARD_NOTE);
    if (d.error) throw d.error;
  }
  const mark = (r: any) => ({ ...r, notes: GAME_CARD_NOTE });
  if (rows.atBats.length) { const r = await db.from("gp_at_bats").insert(rows.atBats.map((a) => mark(atBatEntryPayload(a)))); if (r.error) throw r.error; }
  if (rows.defense.length) { const r = await db.from("gp_defense_plays").insert(rows.defense.map(mark)); if (r.error) throw r.error; }
  if (rows.baserun.length) { const r = await db.from("gp_baserun_events").insert(rows.baserun.map(mark)); if (r.error) throw r.error; }
  const summary = { ...((o.game?.game_summary ?? {}) as Record<string, unknown>), game_card: { runs: rows.runs, saved_at: new Date().toISOString() } };
  const u = await db.from("gp_games").update({ ...rows.game, game_summary: summary }).eq("id", gameId).eq("user_id", o.userId);
  if (u.error) throw u.error;
}
