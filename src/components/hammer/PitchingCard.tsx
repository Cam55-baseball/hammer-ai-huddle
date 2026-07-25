/**
 * PitchingCard — elite pitching prescription for Hammers Today.
 *
 * Mounts only when the athlete pitches (auto-detected from position, or
 * explicitly enabled in the pitcher settings). Owns arm care on pen/start
 * days by cooperating with `ArmCareBudgetContext` — cards downstream check
 * for `owner === "throwing"` already so we surface pitching as throwing for
 * budget purposes.
 *
 * Constitutionally interpretive: never authors organism truth, never mutates
 * ledger. All state derived from athlete-owned inputs.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, Settings2, Target, ShieldAlert, Trophy, Timer, HeartPulse, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useHammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import { projectEnvelope } from "@/lib/hammer/context/decisionFilters";
import { useSeasonStatus } from "@/hooks/useSeasonStatus";
import { useScheduleWindow } from "@/hooks/command/useScheduleWindow";
import { useRecentPitchingLoad } from "@/hooks/useRecentPitchingLoad";
import { resolveRoadmapRung } from "@/lib/hammer/roadmap/roadmapLadder";
import { resolveSeasonQuarter } from "@/lib/hammer/roadmap/seasonQuarters";
import { useArmCareBudget } from "@/components/hammer/ArmCareBudgetContext";
import { ExerciseLogSheet } from "@/components/hammer/logging/ExerciseLogSheet";
import type { WkRx } from "@/hooks/useWkDailyPrescriptions";
import {
  DEFAULT_PITCHER_PROFILE,
  arsenalCatalog,
  readPitcherProfile,
  shouldShowPitchingCard,
  writePitcherProfile,
  type PitcherArsenalPitch,
  type PitcherLevel,
  type PitcherProfile,
  type PitcherRole,
} from "@/lib/hammer/pitching/pitcherProfile";
import {
  buildPitchingMicrocycle,
  labelDow,
  type PitcherDayType,
} from "@/lib/hammer/pitching/pitchingMicrocycle";
import { prescribePitchLadder } from "@/lib/hammer/pitching/pitchLadder";
import { pickPfpDrillsForToday } from "@/lib/hammer/pitching/pfpLibrary";
import { clampDayTypeForRecovery } from "@/lib/hammer/pitching/recoveryClamp";
import { currentStage, progressionFor } from "@/lib/hammer/pitching/rehabProgression";

const DAY_TONE: Record<PitcherDayType, string> = {
  start:         "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  game:          "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
  bullpen:       "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  side:          "bg-amber-500/5 text-amber-700 dark:text-amber-300 border-amber-500/20",
  touch:         "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  long_toss:     "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  flush:         "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30",
  fielding_only: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  rest:          "bg-muted text-muted-foreground border-border",
  available:     "bg-primary/10 text-primary border-primary/30",
};

export function PitchingCard() {
  const { user } = useAuth();
  const ctx = useHammerAthleteContext();
  const proj = useMemo(() => projectEnvelope(ctx), [ctx]);
  const { phaseStartedAt } = useSeasonStatus();
  const sched = useScheduleWindow();

  const sport = (ctx.get<string>("sport_primary")?.value === "softball" ? "softball" : "baseball") as
    | "baseball"
    | "softball";
  const primaryPos = ctx.get<string>("position_primary")?.value ?? null;
  const secondaryPos = ctx.get<string>("position_secondary")?.value ?? null;

  const [profile, setProfileState] = useState<PitcherProfile>(() => readPitcherProfile(user?.id));
  useEffect(() => {
    setProfileState(readPitcherProfile(user?.id));
  }, [user?.id]);

  const [open, setOpen] = useState<boolean>(true);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  const show = shouldShowPitchingCard(profile, primaryPos, secondaryPos);

  const today = useMemo(() => new Date(), []);
  const rung = useMemo(() => resolveRoadmapRung(proj).descriptor.rung, [proj]);
  const quarter = useMemo(
    () => resolveSeasonQuarter(proj, phaseStartedAt ?? null, today),
    [proj, phaseStartedAt, today],
  );

  // Game dows in the next 7 days from the schedule window
  const gameDows = useMemo<number[]>(() => {
    if (sched.unknown || sched.loading) return [];
    const set = new Set<number>();
    for (const [iso, slots] of Object.entries(sched.slotsByDate ?? {})) {
      if (slots.some((s) => s.kind === "game" || s.kind === "tournament")) {
        const d = new Date(iso + "T12:00:00");
        if (!Number.isNaN(d.getTime())) set.add(d.getDay());
      }
    }
    return [...set].sort();
  }, [sched.slotsByDate, sched.loading, sched.unknown]);

  const cycle = useMemo(
    () =>
      buildPitchingMicrocycle({
        sport,
        rung,
        quarter,
        profile,
        today,
        gameDows,
        preferredBullpenDow: profile.preferredBullpenDow,
      }),
    [sport, rung, quarter, profile, today, gameDows],
  );

  const ladder = useMemo(
    () =>
      prescribePitchLadder({
        sport,
        rung,
        quarter,
        profile,
        dayType: cycle.today.dayType,
      }),
    [sport, rung, quarter, profile, cycle.today.dayType],
  );

  const pfp = useMemo(() => pickPfpDrillsForToday(today, rung), [rung, today]);

  if (!show) return null;

  const saveProfile = (next: PitcherProfile) => {
    writePitcherProfile(user?.id, next);
    setProfileState(next);
    toast.success("Pitcher settings saved");
  };

  return (
    <Card className="border-rose-400/30">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="w-full text-left" aria-expanded={open}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Target className="h-4 w-4 text-rose-500 shrink-0" />
                  <span className="truncate">Pitching · {cycle.today.headline}</span>
                  <Badge variant="outline" className={`text-[10px] ${DAY_TONE[cycle.today.dayType]}`}>
                    {cycle.today.dayType.replace("_", " ")}
                  </Badge>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                />
              </CardTitle>
              <div className="text-[11px] text-muted-foreground">{cycle.weekLabel}</div>
            </CardHeader>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {/* Today's prescription */}
            <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Trophy className="h-3.5 w-3.5 text-primary" />
                {ladder.headline}
              </div>
              <div className="text-[11px] text-muted-foreground">{cycle.today.detail}</div>
              <div className="text-[11px] text-muted-foreground">{ladder.rationale}</div>
              {ladder.restDaysAfterOuting > 0 && (
                <div className="text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  Earn {ladder.restDaysAfterOuting} rest day{ladder.restDaysAfterOuting === 1 ? "" : "s"} after this outing before returning to the mound.
                </div>
              )}
            </div>

            {/* Weekly rhythm */}
            <div>
              <div className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground mb-1">
                This week
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cycle.week.map((d) => (
                  <div
                    key={d.dow}
                    className={`rounded-md border px-1.5 py-1 text-center text-[10px] ${DAY_TONE[d.dayType]} ${
                      d.dow === today.getDay() ? "ring-2 ring-primary/40" : ""
                    }`}
                    title={d.detail}
                  >
                    <div className="font-semibold">{labelDow(d.dow)}</div>
                    <div className="truncate">{d.headline.split(" ")[0]}</div>
                  </div>
                ))}
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                Weekly cap: {ladder.weeklyPitchCap} pitches · per-outing cap: {ladder.outingPitchCap}
              </div>
            </div>

            {/* PFP */}
            <div>
              <div className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" />
                Pitcher fielding — every day
              </div>
              <ul className="space-y-1.5">
                {pfp.map((d) => (
                  <li key={d.slug} className="rounded-md border border-border/50 bg-muted/20 px-2 py-1.5 text-xs">
                    <div className="font-medium">{d.name} · {d.minutes} min</div>
                    <div className="text-[11px] text-muted-foreground">Cue: {d.cue}</div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Arsenal */}
            {profile.arsenal.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground mb-1">
                  Arsenal focus
                </div>
                <div className="flex flex-wrap gap-1">
                  {profile.arsenal.map((p) => (
                    <Badge
                      key={p.key}
                      variant={p.primary ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {p.label}
                      {p.primary ? " ★" : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Settings */}
            <div className="pt-1 border-t border-border/50">
              <button
                type="button"
                onClick={() => setSettingsOpen((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Settings2 className="h-3 w-3" />
                Pitcher settings
                <ChevronDown className={`h-3 w-3 transition-transform ${settingsOpen ? "rotate-180" : ""}`} />
              </button>
              {settingsOpen && (
                <PitcherSettings sport={sport} value={profile} onSave={saveProfile} />
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ------------------------------------------------------------------
// Settings form
// ------------------------------------------------------------------

function PitcherSettings({
  sport,
  value,
  onSave,
}: {
  sport: "baseball" | "softball";
  value: PitcherProfile;
  onSave: (p: PitcherProfile) => void;
}) {
  const [draft, setDraft] = useState<PitcherProfile>(value);
  useEffect(() => setDraft(value), [value]);
  const catalog = arsenalCatalog(sport);

  const toggleArsenal = (pitch: PitcherArsenalPitch) => {
    const exists = draft.arsenal.find((p) => p.key === pitch.key);
    const next: PitcherArsenalPitch[] = exists
      ? draft.arsenal.filter((p) => p.key !== pitch.key)
      : [...draft.arsenal, { ...pitch }];
    setDraft({ ...draft, arsenal: next });
  };

  const setPrimary = (key: string) => {
    setDraft({
      ...draft,
      arsenal: draft.arsenal.map((p) => ({ ...p, primary: p.key === key })),
    });
  };

  return (
    <div className="mt-2 space-y-3 rounded-md border border-border/60 bg-background/60 p-3">
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={draft.isPitcher}
          onChange={(e) => setDraft({ ...draft, isPitcher: e.target.checked })}
        />
        I pitch this season
      </label>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground">Role</div>
          <Select
            value={draft.role}
            onValueChange={(v) => setDraft({ ...draft, role: v as PitcherRole })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="reliever">Reliever</SelectItem>
              <SelectItem value="closer">Closer</SelectItem>
              <SelectItem value="two_way">Two-way</SelectItem>
              <SelectItem value="undecided">Undecided</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground">Level</div>
          <Select
            value={draft.level}
            onValueChange={(v) => setDraft({ ...draft, level: v as PitcherLevel })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="youth">Youth</SelectItem>
              <SelectItem value="middle_school">Middle school</SelectItem>
              <SelectItem value="high_school">High school</SelectItem>
              <SelectItem value="travel">Travel</SelectItem>
              <SelectItem value="college">College</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="unknown">Unspecified</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground">
            Innings-per-outing target
          </div>
          <Input
            type="number"
            min={0}
            max={9}
            step={0.5}
            value={draft.inningsPerOutingTarget}
            onChange={(e) =>
              setDraft({
                ...draft,
                inningsPerOutingTarget: Math.max(0, Math.min(9, Number(e.target.value) || 0)),
              })
            }
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-muted-foreground">Preferred bullpen day</div>
          <Select
            value={draft.preferredBullpenDow === null ? "none" : String(draft.preferredBullpenDow)}
            onValueChange={(v) =>
              setDraft({ ...draft, preferredBullpenDow: v === "none" ? null : Number(v) })
            }
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No preference</SelectItem>
              <SelectItem value="0">Sunday</SelectItem>
              <SelectItem value="1">Monday</SelectItem>
              <SelectItem value="2">Tuesday</SelectItem>
              <SelectItem value="3">Wednesday</SelectItem>
              <SelectItem value="4">Thursday</SelectItem>
              <SelectItem value="5">Friday</SelectItem>
              <SelectItem value="6">Saturday</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-[11px] font-medium text-muted-foreground">
          Arsenal (tap to toggle; star = primary)
        </div>
        <div className="flex flex-wrap gap-1">
          {catalog.map((p) => {
            const on = draft.arsenal.some((x) => x.key === p.key);
            const isPrimary = draft.arsenal.find((x) => x.key === p.key)?.primary;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => (on ? setPrimary(p.key) : toggleArsenal(p))}
                onContextMenu={(e) => {
                  e.preventDefault();
                  toggleArsenal(p);
                }}
                className={`rounded-full border px-2 py-0.5 text-[10px] ${
                  on
                    ? isPrimary
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border"
                    : "border-border/60 text-muted-foreground"
                }`}
                title={on ? "Tap to make primary · right-click to remove" : "Tap to add"}
              >
                {p.label}
                {isPrimary ? " ★" : ""}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-[11px] font-medium text-muted-foreground">Notes for Hammer</div>
        <Textarea
          rows={2}
          value={draft.notes ?? ""}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })}
          className="text-xs"
          placeholder="e.g. rehabbing from Tommy John · 3 months in, cleared for pens."
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(draft)}>Save</Button>
        <Button size="sm" variant="ghost" onClick={() => setDraft(DEFAULT_PITCHER_PROFILE)}>
          Reset
        </Button>
      </div>
    </div>
  );
}
