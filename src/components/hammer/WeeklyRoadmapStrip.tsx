import { useState } from "react";
import {useQuery}from '@tanstack/react-query';
import {useAuth}from '@/hooks/useAuth';
import {useSubscription}from '@/hooks/useSubscription';
import {readComposedWeek}from '@/lib/hammer/readComposedWeek';
import {composedDayCategories}from '@/lib/hammer/composedWeek';
import {isoShift}from '../../../supabase/functions/_shared/wic/schedule/timeline';
import {localIso}from '@/hooks/usePitcherSchedule';
import { Button } from "@/components/ui/button";
import { SeasonDatesDialog } from "@/components/hammer/SeasonDatesDialog";
import { WeeklyBodyLoadBar } from "@/components/hammer/WeeklyBodyLoadBar";
import { GAME_IQ_AVAILABLE_TO_ATHLETES } from "@/lib/hammer/athleteFeatureAvailability";

import { Calendar, Target } from "lucide-react";
import { QUARTER_LABEL } from "@/lib/hammer/workout/phaseQuarter";
const seasonWords=(p:string)=>(QUARTER_LABEL as Record<string,string>)[p]??({off_season:"Off-season",preseason:"Preseason",in_season:"In-season",post_season:"Post-season"} as Record<string,string>)[p]??p.replace(/_/g," ");
import type {
  HammerDailyPlanResult,
} from "@/lib/hammer/prescription/dailyPlan";
import type {
  RoadmapDay,
  ModalityIntensity,
} from "@/lib/hammer/prescription/weeklyMicrocycle";
import type { ModalityKey } from "@/lib/hammer/prescription/dailyPlan";
import { RoadmapExplainerSheet } from "./RoadmapExplainerSheet";
import { useSeasonStatus } from "@/hooks/useSeasonStatus";

const MODALITY_ABBR: Record<ModalityKey, string> = {
  warmup: "WU",
  speed: "SPD",
  strength: "LIFT",
  hitting: "HIT",
  throwing: "THR",
  pitching: "PIT",
  defense: "DEF",
  baserunning: "BR",
  game_iq: "IQ",
  game: "GAME",
  fueling: "FUEL",
  recovery: "REC",
};

const MODALITY_LABEL: Record<ModalityKey, string> = {
  warmup: "Warm-up",
  speed: "Speed",
  strength: "Full-body lift",
  hitting: "Hitting",
  throwing: "Throwing",
  pitching: "Pitching",
  defense: "Defense",
  baserunning: "Baserunning",
  game_iq: "Game IQ",
  game: "Game",
  fueling: "Fueling",
  recovery: "Recovery",
};

const INTENSITY_TONE: Record<ModalityIntensity, string> = {
  primary: "bg-primary/15 text-primary border-primary/30",
  secondary: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  activation: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30",
  off: "bg-muted/20 text-muted-foreground border-muted/40",
};

interface Props {
  readonly plan: Pick<HammerDailyPlanResult, "weeklyRoadmap" | "weeklyTemplate" | "microcycle" | "roadmap">;
  readonly todayCategories?: readonly string[];
  readonly savedPhase?: string | null;
  readonly sport?:'baseball'|'softball';
}

export function WeeklyRoadmapStrip({ plan, todayCategories, savedPhase,sport }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const [seasonDatesOpen, setSeasonDatesOpen] = useState(false);
  const { weeklyRoadmap, roadmap } = plan;
  const season = useSeasonStatus();
  const {user}=useAuth();const {modules}=useSubscription();
  const today=localIso();
  const monday=isoShift(today,-((new Date(`${today}T12:00:00Z`).getUTCDay()+6)%7));
  const savedWeek=useQuery({queryKey:['composed-plan-week',user?.id,sport,monday],enabled:!!user&&!!sport,
    queryFn:()=>{if(!user||!sport)throw new Error('Sign in');return readComposedWeek(user.id,monday,isoShift(monday,6),sport,modules.includes(`${sport}_5tool`)||modules.includes(`${sport}_golden2way`));}});
  const savedCategories=(day:RoadmapDay)=>{const date=isoShift(monday,(day.dow+6)%7);const saved=savedWeek.data?.days.find(d=>d.date===date);return saved?composedDayCategories(saved):undefined;};
  const resolvedPhaseCode = { off_season: "off", preseason: "pre", in_season: "in", post_season: "post" }[season.resolvedPhase];
  const phaseWeek = roadmap.quarter.phaseKnown && season.phaseStartedAt && season.phaseDaysIn !== null && resolvedPhaseCode === roadmap.quarter.phase
    ? Math.max(1, Math.floor(season.phaseDaysIn / 7) + 1)
    : null;

  return (
    <section
      aria-label="Your training block and season"
      className="rounded-lg border border-primary/25 bg-gradient-to-b from-primary/5 to-transparent p-3"
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground">Your training block &amp; season</div>
             <div className="text-xs text-muted-foreground">Your training steps: {roadmap.rung.label}</div>
            {!roadmap.quarter.quarterKnown ? (
              <div className="text-[11px] text-muted-foreground leading-tight">
                {savedPhase && <span>Season: {seasonWords(savedPhase)}. </span>}
                {roadmap.quarter.phaseKnown ? "Your season phase is known, but its start date isn't. Add your season dates to show your week." : "Add your season dates to show where you are in your training block."}{' '}
                <Button variant="link" size="sm" className="h-auto p-0 text-[11px]" onClick={() => setSeasonDatesOpen(true)}>Set season dates</Button>
              </div>
            ) : (
               <div className="text-[11px] text-muted-foreground leading-tight">
                 Where you are in the season: {seasonWords(savedPhase ?? season.resolvedPhase)} {phaseWeek !== null ? `· Week ${phaseWeek}` : "· Add your season dates to show your week"}
              </div>
            )}

          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setExplainerOpen(true)}
          className="flex items-center gap-1 px-2 text-[11px] shrink-0"
        >
          <Target className="h-3 w-3" />
          Training steps
        </Button>
      </header>
      <RoadmapExplainerSheet
        open={explainerOpen}
        onOpenChange={setExplainerOpen}
        roadmap={roadmap}
      />
      <SeasonDatesDialog open={seasonDatesOpen} onOpenChange={setSeasonDatesOpen} />


      <div className="grid grid-cols-7 gap-1">
        {weeklyRoadmap.map((day, idx) => (
          <DayCell
            key={day.dow}
            day={day}
            onClick={() => setExpanded((cur) => (cur === idx ? null : idx))}
            active={expanded === idx}
            todayCategories={savedCategories(day)??(day.isToday ? todayCategories : undefined)}
          />
        ))}
      </div>

      {expanded !== null && weeklyRoadmap[expanded] && (
        <DayDetail day={weeklyRoadmap[expanded]} todayCategories={savedCategories(weeklyRoadmap[expanded])??(weeklyRoadmap[expanded].isToday ? todayCategories : undefined)} />
      )}

      <WeeklyBodyLoadBar embedded />
    </section>
  );
}

const CATEGORY_ABBR: Record<string, string> = {
  Hitting: "HIT", Defense: "DEF", Baserunning: "BR", Throwing: "THR", Pitching: "PIT", Bunting: "BUNT",
  Lifts: "LIFT", "Lift / tissue care": "LIFT", Speed: "SPD", "Bat speed": "BAT", Conditioning: "COND",
  "Base running & conditioning": "COND", Recovery: "REC",
};
const CATEGORY_LABEL: Record<string, string> = { Lifts: "Full-body lift", "Lift / tissue care": "Full-body lift" };
const categoryLabel = (c: string) => CATEGORY_LABEL[c] ?? c;
const CHIP = "rounded border font-normal px-1 py-[1px] text-[9px] leading-none";

function DayCell({
  day,
  onClick,
  active,
  todayCategories,
}: {
  day: RoadmapDay;
  onClick: () => void;
  active: boolean;
  todayCategories?: readonly string[];
}) {
  const primaryChips = day.modalities.filter(
    (m) => (m.key !== 'game_iq' || GAME_IQ_AVAILABLE_TO_ATHLETES) && (m.intensity === "primary" || m.intensity === "secondary"),
  );
  const chips = todayCategories
    ? [...new Map(todayCategories.map((c) => [CATEGORY_ABBR[c] ?? c.slice(0, 4).toUpperCase(), c])).entries()]
        .map(([abbr, c]) => ({ key: abbr, abbr, tone: INTENSITY_TONE.primary, label: c }))
    : primaryChips.map((m) => ({ key: m.key, abbr: MODALITY_ABBR[m.key], tone: INTENSITY_TONE[m.intensity], label: m.key }));
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex min-h-[84px] min-w-0 flex-col items-center overflow-hidden rounded-md border px-0.5 py-1.5 text-[10px] transition-colors",
        day.isToday
          ? "border-primary bg-primary/10 font-semibold text-foreground"
          : "border-muted/40 bg-background text-muted-foreground hover:border-primary/40",
        active ? "ring-1 ring-primary" : "",
      ].join(" ")}
    >
      <span className="text-[10px] uppercase tracking-wide">{day.short}</span>
      {day.restDay ? (
        <span className="mt-1 text-[9px] text-muted-foreground/70">Rest</span>
      ) : (
        <div className="mt-1 flex w-full flex-col items-center gap-0.5">
          {chips.slice(0, 3).map((chip) => (
            <span key={chip.key} className={`${CHIP} ${chip.tone}`}>{chip.abbr}</span>
          ))}
          {chips.length > 3 && <span className="text-[9px] leading-none text-muted-foreground">+{chips.length - 3}</span>}
        </div>
      )}
    </button>
  );
}

function DayDetail({ day, todayCategories }: { day: RoadmapDay; todayCategories?: readonly string[] }) {
  if (day.restDay) {
    return (
      <div className="mt-2 rounded-md border border-muted/40 bg-muted/5 px-2 py-1.5 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">{day.short} — Rest day.</span>{" "}
        Sleep, hydration, mobility, breath. Anchors still run (warm-up · fueling · recovery).
      </div>
    );
  }
  if (todayCategories) return (
    <div className="mt-2 space-y-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-[11px]">
      <div className="text-xs font-semibold text-foreground">{day.short} · {todayCategories.length} scheduled blocks</div>
      <ul className="space-y-0.5">
        {[...new Set(todayCategories.map(categoryLabel))].map((c) => <li key={c} className="break-words text-foreground">{c}</li>)}
      </ul>
    </div>
  );
  return (
    <div className="mt-2 space-y-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-[11px]">
      <div className="text-xs font-semibold text-foreground">
        {day.short} · {day.modalities.filter((m) => m.key !== 'game_iq' || GAME_IQ_AVAILABLE_TO_ATHLETES).length} scheduled blocks
      </div>
      <ul className="space-y-0.5">
        {day.modalities.filter((m) => m.key !== 'game_iq' || GAME_IQ_AVAILABLE_TO_ATHLETES).map((m) => (
          <li key={m.key} className="flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[10px] border ${INTENSITY_TONE[m.intensity]}`}>
              {m.intensity}
            </span>
            <span className="text-foreground">{MODALITY_LABEL[m.key]}</span>
            {m.accent && (
              <span className="text-muted-foreground">— {m.accent}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
