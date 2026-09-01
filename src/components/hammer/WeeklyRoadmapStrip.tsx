import { useState } from "react";
import { Link } from "react-router-dom";

import { ChevronDown, ChevronUp, Calendar, Target } from "lucide-react";
import type {
  HammerDailyPlanResult,
} from "@/lib/hammer/prescription/dailyPlan";
import type {
  RoadmapDay,
  ModalityIntensity,
} from "@/lib/hammer/prescription/weeklyMicrocycle";
import type { ModalityKey } from "@/lib/hammer/prescription/dailyPlan";
import { RoadmapExplainerSheet } from "./RoadmapExplainerSheet";

const MODALITY_ABBR: Record<ModalityKey, string> = {
  warmup: "WU",
  speed: "SPD",
  strength: "LFT",
  hitting: "HIT",
  throwing: "THR",
  defense: "DEF",
  baserunning: "BR",
  game_iq: "IQ",
  fueling: "FUEL",
  recovery: "REC",
};

const MODALITY_LABEL: Record<ModalityKey, string> = {
  warmup: "Warm-up",
  speed: "Speed",
  strength: "Lifts",
  hitting: "Hitting",
  throwing: "Throwing",
  defense: "Defense",
  baserunning: "Baserunning",
  game_iq: "Game IQ",
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
}

export function WeeklyRoadmapStrip({ plan }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [explainerOpen, setExplainerOpen] = useState(false);
  const { weeklyRoadmap, weeklyTemplate, microcycle, roadmap } = plan;

  return (
    <section
      aria-label="Weekly training roadmap"
      className="rounded-lg border border-primary/25 bg-gradient-to-b from-primary/5 to-transparent p-3"
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-foreground truncate">
              {roadmap.rung.label} · {roadmap.quarter.label}
            </div>
            {!roadmap.quarter.phaseKnown ? (
              <div className="text-[11px] text-muted-foreground truncate">
                No season dates on file —{' '}
                <Link to="/profile" className="font-medium text-primary hover:underline">
                  set your season dates
                </Link>
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground truncate">
                {weeklyTemplate.label} · builds toward {roadmap.eliteTarget.league} 6-game weeks
              </div>
            )}

          </div>
        </div>
        <button
          type="button"
          onClick={() => setExplainerOpen(true)}
          className="flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 shrink-0"
        >
          <Target className="h-3 w-3" />
          Rung {roadmap.rung.index}/5
        </button>
      </header>
      <RoadmapExplainerSheet
        open={explainerOpen}
        onOpenChange={setExplainerOpen}
        roadmap={roadmap}
      />


      <div className="grid grid-cols-7 gap-1">
        {weeklyRoadmap.map((day, idx) => (
          <DayCell
            key={day.dow}
            day={day}
            onClick={() => setExpanded((cur) => (cur === idx ? null : idx))}
            active={expanded === idx}
          />
        ))}
      </div>

      {expanded !== null && weeklyRoadmap[expanded] && (
        <DayDetail day={weeklyRoadmap[expanded]} />
      )}

      <div className="mt-2 flex items-start gap-2 rounded-md border border-muted/30 bg-muted/5 px-2 py-1.5 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">Today:</span>
        <span>
          {SCHEDULED_TODAY_LINE(plan.microcycle.perModality) ||
            "Anchor blocks only — warm-up + fueling + recovery."}{" "}
          <span className="text-muted-foreground/70">
            (CNS spacing: max-speed and heavy-lift lower are never stacked back-to-back.)
          </span>
        </span>
      </div>

      {microcycle.template.id === "in_season" && (
        <div className="mt-1 text-[10px] text-muted-foreground">
          In-season posture: lifts run 2×/week for maintenance only. Speed is 1×/week for freshness. Skill work is daily but capped at activation dose.
        </div>
      )}
    </section>
  );
}

function DayCell({
  day,
  onClick,
  active,
}: {
  day: RoadmapDay;
  onClick: () => void;
  active: boolean;
}) {
  const primaryChips = day.modalities.filter(
    (m) => m.intensity === "primary" || m.intensity === "secondary",
  );
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex flex-col items-center rounded-md border px-1 py-1.5 text-[10px] transition-colors",
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
        <div className="mt-1 flex flex-wrap justify-center gap-0.5">
          {primaryChips.slice(0, 3).map((m) => (
            <span
              key={m.key}
              className={`rounded px-1 py-[1px] text-[9px] leading-none border ${INTENSITY_TONE[m.intensity]}`}
            >
              {MODALITY_ABBR[m.key]}
            </span>
          ))}
          {primaryChips.length > 3 && (
            <span className="text-[9px] text-muted-foreground">+{primaryChips.length - 3}</span>
          )}
        </div>
      )}
    </button>
  );
}

function DayDetail({ day }: { day: RoadmapDay }) {
  if (day.restDay) {
    return (
      <div className="mt-2 rounded-md border border-muted/40 bg-muted/5 px-2 py-1.5 text-[11px] text-muted-foreground">
        <span className="font-medium text-foreground">{day.short} — Rest day.</span>{" "}
        Sleep, hydration, mobility, breath. Anchors still run (warm-up · fueling · recovery).
      </div>
    );
  }
  return (
    <div className="mt-2 space-y-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5 text-[11px]">
      <div className="text-xs font-semibold text-foreground">
        {day.short} · {day.modalities.length} scheduled block{day.modalities.length === 1 ? "" : "s"}
      </div>
      <ul className="space-y-0.5">
        {day.modalities.map((m) => (
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

function SCHEDULED_TODAY_LINE(
  perModality: HammerDailyPlanResult["microcycle"]["perModality"],
): string {
  const on: string[] = [];
  const off: string[] = [];
  (Object.keys(perModality) as ModalityKey[]).forEach((k) => {
    if (["warmup", "fueling", "recovery", "game_iq"].includes(k)) return;
    const d = perModality[k];
    if (d.scheduled) {
      on.push(MODALITY_LABEL[k] + (d.intensity !== "primary" ? ` (${d.intensity})` : ""));
    } else if (d.nextScheduledLabel) {
      off.push(`${MODALITY_LABEL[k]} → ${d.nextScheduledLabel}`);
    }
  });
  const onLine = on.length ? `On: ${on.join(", ")}.` : "";
  const offLine = off.length ? ` Off: ${off.slice(0, 4).join(" · ")}.` : "";
  return `${onLine}${offLine}`.trim();
}
