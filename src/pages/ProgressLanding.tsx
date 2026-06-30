/**
 * ProgressLanding — topic-driven landing layer above the legacy
 * ProgressDashboard. Users land on ranked topic buttons; each panel
 * surfaces existing widgets + correlations + inline Ask Hammer.
 *
 * The legacy ProgressDashboard is preserved at the bottom under
 * "Classic view" so nothing is lost.
 */
import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  Activity,
  HeartPulse,
  CalendarClock,
  Target,
  ChevronDown,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TopicButtonGrid, type TopicTile } from "@/components/progress/TopicButtonGrid";
import { TopicPanel } from "@/components/progress/TopicPanel";
import { GpInGameSummaryCard } from "@/components/progress/GpInGameSummaryCard";
import { IqInsightCard } from "@/components/progress/IqInsightCard";
import { SideSplitsSection } from "@/components/progress/SideSplitsSection";
import { PitchingPanel } from "@/components/progress/panels/PitchingPanel";
import { ReadinessPanel } from "@/components/progress/panels/ReadinessPanel";
import { WorkloadPanel } from "@/components/progress/panels/WorkloadPanel";
import { GoalsMindPanel } from "@/components/progress/panels/GoalsMindPanel";
import {
  rankProgressTopics,
  type ProgressTopicId,
} from "@/lib/progress/rankProgressTopics";
import { useHammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import { useScheduleWindow } from "@/hooks/command/useScheduleWindow";
import { useAthleteCommandRows } from "@/hooks/command/useAthleteCommandRows";
import ProgressDashboard from "@/pages/ProgressDashboard";

interface TopicDef {
  readonly id: ProgressTopicId;
  readonly title: string;
  readonly subtitle: string;
  readonly tagline: string;
  readonly icon: typeof Activity;
  readonly render: () => JSX.Element;
  readonly hammerFocus: {
    readonly id: string;
    readonly name: string;
    readonly hierarchyRank: "non_negotiable" | "rank_1";
    readonly whyItMatters: string;
    readonly howToImprove: string;
  };
}

const TOPIC_DEFS: Record<ProgressTopicId, TopicDef> = {
  pitching: {
    id: "pitching",
    title: "Pitching",
    subtitle: "Tempo and landmark-backed mechanics.",
    tagline: "Your replay-certified pitching metrics.",
    icon: Activity,
    render: () => <PitchingPanel />,
    hammerFocus: {
      id: "progress-pitching",
      name: "Pitching progress",
      hierarchyRank: "rank_1",
      whyItMatters:
        "Tempo and mechanics drive command and survivability. Only landmark-backed measures are trusted here.",
      howToImprove:
        "Discuss what these tempo and mechanics numbers mean and the next deterministic step the athlete can take.",
    },
  },
  readiness: {
    id: "readiness",
    title: "Readiness & Recovery",
    subtitle: "How your body is doing today and across the week.",
    tagline: "Readiness, fatigue, sleep, recovery.",
    icon: HeartPulse,
    render: () => <ReadinessPanel />,
    hammerFocus: {
      id: "progress-readiness",
      name: "Readiness & recovery",
      hierarchyRank: "non_negotiable",
      whyItMatters:
        "Readiness and recovery gate everything else. Survivability supersedes optimization.",
      howToImprove:
        "Help the athlete understand readiness, fatigue, sleep and recovery patterns and what to adjust today.",
    },
  },
  workload: {
    id: "workload",
    title: "Workload & Schedule",
    subtitle: "Training load, games, tournaments, posture.",
    tagline: "Sessions, schedule posture, upcoming events.",
    icon: CalendarClock,
    render: () => <WorkloadPanel />,
    hammerFocus: {
      id: "progress-workload",
      name: "Workload & schedule",
      hierarchyRank: "rank_1",
      whyItMatters:
        "Workload around games and tournaments determines whether the athlete shows up fresh.",
      howToImprove:
        "Explain the athlete's current schedule posture, load trend, and what to push or taper.",
    },
  },
  goals: {
    id: "goals",
    title: "Goals & Mind",
    subtitle: "Ranked goals progress and behavioral signals.",
    tagline: "Your goals, mood, and progress events.",
    icon: Target,
    render: () => <GoalsMindPanel />,
    hammerFocus: {
      id: "progress-goals",
      name: "Goals & mind",
      hierarchyRank: "rank_1",
      whyItMatters:
        "Ranked development goals and behavioral signals tell us where attention should land.",
      howToImprove:
        "Discuss the athlete's ranked goals, recent progress, and any mood/behavior signals visible in lineage.",
    },
  },
};

export default function ProgressLanding() {
  const ctx = useHammerAthleteContext();
  const schedule = useScheduleWindow();
  const { data: rows = [] } = useAthleteCommandRows({ days: 30, limit: 500 });
  const [openId, setOpenId] = useState<ProgressTopicId | null>(null);
  const [classicOpen, setClassicOpen] = useState(false);

  const sport = ctx.get<string>("sport_primary")?.value ?? null;
  const position = ctx.get<string>("position_primary")?.value ?? null;
  const isPitcher =
    typeof position === "string" && position.toLowerCase().includes("pitch");
  const hasGameThisWeek = Boolean(schedule?.upcomingCompetition);
  const hasEscalation = rows.some((r) =>
    r.topic_id?.includes("escalation"),
  );
  const topGoal = ctx.get<string>("goal_top_category")?.value ?? null;

  const ranked = useMemo(
    () =>
      rankProgressTopics({
        isPitcher,
        hasGameThisWeek,
        hasEscalation,
        topGoalCategory: topGoal,
      }),
    [isPitcher, hasGameThisWeek, hasEscalation, topGoal],
  );

  const availability = useMemo<Record<ProgressTopicId, boolean>>(() => {
    const hasPitchingData = rows.some((r) => r.topic_id?.includes("tempo") || r.topic_id?.includes("pitching"));
    const hasReadinessData = rows.some((r) =>
      r.topic_id?.includes("readiness") || r.topic_id?.includes("sleep") || r.topic_id?.includes("recovery"),
    );
    const hasWorkloadData = rows.some((r) => r.topic_id?.includes("session"));
    const hasGoalsData = rows.some(
      (r) => r.topic_id?.includes("goal") || r.topic_id?.includes("mood"),
    );
    return {
      pitching: isPitcher || hasPitchingData,
      readiness: hasReadinessData || true, // always available — readiness card itself shows missingness
      workload: hasWorkloadData || true,
      goals: hasGoalsData || true,
    };
  }, [rows, isPitcher]);

  const tiles: TopicTile[] = ranked.map((r) => {
    const def = TOPIC_DEFS[r.id];
    return {
      id: r.id,
      title: def.title,
      tagline: def.tagline,
      icon: def.icon,
      available: availability[r.id],
    };
  });

  const handleSelect = (id: ProgressTopicId) => {
    setOpenId(id);
    requestAnimationFrame(() => {
      document.getElementById(`topic-${id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">The General</h1>
          <p className="text-muted-foreground">
            Pick a topic to see your data, what correlates, and ask Hammer.
            {sport ? ` Ordered for your ${sport} profile.` : ""}
          </p>
        </div>

        <TopicButtonGrid tiles={tiles} onSelect={handleSelect} />

        <GpInGameSummaryCard />

        <IqInsightCard />

        <SideSplitsSection />

        <div className="space-y-3">
          {ranked.map((r, idx) => {
            const def = TOPIC_DEFS[r.id];
            return (
              <TopicPanel
                key={r.id}
                id={r.id}
                title={def.title}
                subtitle={def.subtitle}
                icon={def.icon}
                priorityBadge={`Priority #${idx + 1}`}
                open={openId === r.id}
                onOpenChange={(o) => setOpenId(o ? r.id : null)}
                snapshot={def.render()}
                hammerFocus={def.hammerFocus}
              />
            );
          })}
        </div>

        <section id="classic-view" className="scroll-mt-20">
          <Collapsible open={classicOpen} onOpenChange={setClassicOpen}>
            <Card className="border-border/40">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-3 text-left hover:bg-muted/40 transition-colors"
                  aria-expanded={classicOpen}
                >
                  <div>
                    <h3 className="font-semibold text-sm">All sections (classic view)</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Every legacy dashboard widget, unchanged.
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      classicOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border/40">
                  <ProgressDashboard />
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </section>
      </div>
    </DashboardLayout>
  );
}
