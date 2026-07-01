/**
 * HammerDailyPlan — expandable, conversational daily prescription.
 *
 * Elite-execution overhaul:
 *   • Each modality card expands to show drills (setup/dosage/cue/stopIf),
 *     coaching cues, stop rules, and "why today" roadmap reason.
 *   • "Add to Game Plan" turns the block into a real `custom_activity_template`
 *     via `useCustomActivities.createTemplate` so it logs through the existing
 *     mechanics — zero parallel storage.
 *   • Inline "Ask Hammer" mini-chat carries the modality + drills as
 *     `categoryFocus` so the AI replies with context (no cookie-cutter).
 *   • Missing knowledge gaps render inline answer affordances that
 *     `persistContextAnswer` directly — no dead-end redirects.
 *
 * Schedule context line from `useScheduleWindow` retained.
 */
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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
  CalendarClock,
  ChevronDown,
  MessageCircle,
  CalendarPlus,
  Send,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
} from "lucide-react";
import { toast } from "sonner";
import { useHammerAthleteContext } from "@/lib/hammer/context/athleteContext";
import {
  buildHammerDailyPlan,
  type BlockStatus,
  type PrescribedBlock,
} from "@/lib/hammer/prescription/dailyPlan";
import { projectScheduleSignal } from "@/lib/hammer/prescription/scheduleContext";
import { getHammerIdentity } from "@/lib/hammer/identity";
import { useScheduleWindow } from "@/hooks/command/useScheduleWindow";
import { useCustomActivities } from "@/hooks/useCustomActivities";
import { SideContextPicker } from "@/components/shared/SideContextPicker";
import { useSideContext } from "@/contexts/SideContext";
import { readSideBias } from "@/lib/side/sideBias";
import { useAuth } from "@/hooks/useAuth";
import { useHammerChat } from "@/hooks/useHammerChat";
import { HAMMER_KNOWLEDGE_GAPS } from "@/lib/hammer/onboarding/knowledgeGaps";
import { persistContextAnswer } from "@/lib/hammer/context/acquisition";
import type { CustomActivityTemplate } from "@/types/customActivity";
import { DailyPlanVideoChips } from "@/components/hammer/DailyPlanVideoChips";
import { HammerScheduleStrip } from "@/components/hammer/HammerScheduleStrip";
import { WkLiftsSpeedSection } from "@/components/hammer/WkLiftsSpeedSection";
import { GpInGameAdvisoryStrip } from "@/components/hammer/GpInGameAdvisoryStrip";
import { useGpSignal } from "@/hooks/useGpSignal";
import { useWkDailyPrescriptions } from "@/hooks/useWkDailyPrescriptions";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { HammerWarmupDialog } from "@/components/hammer/HammerWarmupDialog";
import { ReportInjuryDialog } from "@/components/hammer/ReportInjuryDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Sliders } from "lucide-react";

const STATUS_TONE: Record<BlockStatus, string> = {
  ready: "border-primary/20",
  "awaiting-input": "border-amber-500/30 bg-amber-500/5",
  suppressed: "border-muted/30 opacity-60",
};

const PHASE_TONE: Record<string, string> = {
  build: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  sharpen: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  maintain: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  deload: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  recover: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  skill: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
};

function scheduleLine(sched: ReturnType<typeof useScheduleWindow>): string | null {
  if (sched.unknown || sched.loading) return null;
  if (sched.empty) return null;
  const tw = sched.tournamentWindow;
  if (tw && tw.dayIndex >= 1) {
    return `Tournament — Day ${tw.dayIndex} of ${tw.totalDays}. Saving legs.`;
  }
  const todayCamp = sched.today.find((s) => s.kind === "camp");
  if (todayCamp) return `Camp today (${todayCamp.label}) — Hammer steps back.`;
  const todayTravel = sched.today.find((s) => s.kind === "travel");
  if (todayTravel) return `Travel today — mobility + hydration only.`;
  const comp = sched.upcomingCompetition;
  if (comp) {
    if (comp.daysUntil === 0) return `Game today (${comp.label}) — prioritising freshness.`;
    if (comp.daysUntil === 1) return `Game tomorrow (${comp.label}) — short, sharp work today.`;
    if (comp.daysUntil <= 2) return `Competition in ${comp.daysUntil}d — tapering load.`;
    return `Next competition in ${comp.daysUntil}d (${comp.label}).`;
  }
  if (sched.totalPractices > 0) {
    return `${sched.totalPractices} practice${sched.totalPractices === 1 ? "" : "s"} this week.`;
  }
  return null;
}

export function HammerDailyPlan() {
  const ctx = useHammerAthleteContext();
  const navigate = useNavigate();
  const identity = getHammerIdentity();
  const sched = useScheduleWindow();
  const scheduleSignal = useMemo(() => projectScheduleSignal(sched), [sched]);
  const sideBias = useMemo(
    () => ({ hit: readSideBias("hit"), throw: readSideBias("throw") }),
    // Re-read once per render; cache writes happen on Progress mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx],
  );
  const gpSig = useGpSignal();
  // Stable projection — avoid re-running planner on advisory-array identity changes.
  const gpForPlan = useMemo(
    () => ({
      chasePct: gpSig.chasePct,
      whiffPct: gpSig.whiffPct,
      miscueClusters: gpSig.miscueClusters,
      atBats: gpSig.atBats,
      pitchesSeen: gpSig.pitchesSeen,
      defensivePlays: gpSig.defensivePlays,
    }),
    [
      gpSig.chasePct,
      gpSig.whiffPct,
      gpSig.miscueClusters,
      gpSig.atBats,
      gpSig.pitchesSeen,
      gpSig.defensivePlays,
    ],
  );
  const rawPlan = useMemo(
    () => buildHammerDailyPlan(ctx, scheduleSignal, sideBias, gpForPlan),
    [ctx, scheduleSignal, sideBias, gpForPlan],
  );
  // CNS→Hammer Clamp: when today's elite Lifts/Speed prescriptions sum to a
  // heavy CNS load (Σ ≥ 7), downgrade skill block intensity to "maintain" so
  // hitting/throwing volume doesn't compound the neural cost.
  const wkRx = useWkDailyPrescriptions();
  // Prefer actuals over prescribed so the clamp reflects what the athlete did.
  const totalCns = wkRx.effectiveCnsTotal ?? 0;
  const cnsHigh = totalCns >= 7;
  const plan = useMemo(() => {
    if (!cnsHigh) return rawPlan;
    const clampedBlocks = rawPlan.blocks.map((b) => {
      if (b.modality !== "hitting" && b.modality !== "throwing" && b.modality !== "defense") return b;
      if (b.phase !== "build" && b.phase !== "sharpen") return b;
      return {
        ...b,
        phase: "maintain" as const,
        roadmapReason: `${b.roadmapReason} (CNS load is high today — keeping skill intensity at maintenance.)`,
      };
    });
    return { ...rawPlan, blocks: clampedBlocks };
  }, [rawPlan, cnsHigh]);
  const { isOwner } = useOwnerAccess();
  const schedMsg = scheduleLine(sched);
  const [injuryOpen, setInjuryOpen] = useState(false);

  return (
    <Card id="hammer-plan" className="scroll-mt-24">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="truncate">{identity.voiceLabel} · today's plan</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {plan.schedulePosture !== "normal" && (
              <Badge
                variant="secondary"
                className="text-[10px] capitalize"
                title={plan.scheduleSignal.rationale}
              >
                {plan.scheduleSignal.tournamentDayLabel
                  ? `Tournament ${plan.scheduleSignal.tournamentDayLabel}`
                  : plan.schedulePosture === "team_practice"
                    ? "Team practice"
                    : plan.schedulePosture === "taper"
                      ? "Tapering"
                      : plan.schedulePosture === "game"
                        ? "Game today"
                        : plan.schedulePosture === "camp"
                          ? "Camp today"
                          : plan.schedulePosture === "travel"
                            ? "Travel day"
                            : plan.schedulePosture}
              </Badge>
            )}
            {plan.gpBiasTags.length > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] border-amber-400/60 text-amber-700 dark:text-amber-300"
                title={`Today's order reflects your last 7d of games: ${plan.gpBiasTags.join(", ")}`}
              >
                Game-shaped
              </Badge>
            )}
            {plan.missingnessCount > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {plan.missingnessCount} needs input
              </Badge>
            )}
            {cnsHigh && (
              <Badge
                variant="outline"
                className="text-[10px] border-rose-400/60 text-rose-700 dark:text-rose-300"
                title={`Today's elite Lifts/Speed plan totals ${totalCns} CNS — skill blocks held at maintenance to protect tomorrow.`}
              >
                CNS heavy · skill clamped
              </Badge>
            )}
            {(plan.sideBias?.hit || plan.sideBias?.throw) && (
              <Badge
                variant="default"
                className="text-[10px]"
                title={[plan.sideBias?.hit?.note, plan.sideBias?.throw?.note].filter(Boolean).join(" ")}
              >
                Weaker side focus:{" "}
                {plan.sideBias?.hit
                  ? `Bat ${plan.sideBias.hit.weakerSide}`
                  : `Throw ${plan.sideBias!.throw!.weakerSide}`}
              </Badge>
            )}
            {/* Side context — only renders for switch hitters / ambidextrous throwers */}
            <SideContextPicker discipline="hit" label="Bat" />
            <SideContextPicker discipline="throw" label="Throw" />
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px]"
              onClick={() => setInjuryOpen(true)}
              title="Report an injury — Hammer plans around it"
            >
              <HeartPulse className="mr-1 h-3.5 w-3.5" />
              Report injury
            </Button>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    title="Owner tools"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/admin/periodization")}>
                    <Sliders className="mr-2 h-3.5 w-3.5" />
                    Tuning
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardTitle>
        {schedMsg && (
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <CalendarClock className="h-3 w-3" />
            <span>{schedMsg}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <HammerScheduleStrip />
        <GpInGameAdvisoryStrip />
        {plan.blocks.map((b) => (
          <BlockCard key={b.modality} block={b} onNavigate={(r) => navigate(r)} />
        ))}
        <ErrorBoundary label="wk-lifts-speed">
          <WkLiftsSpeedSection />
        </ErrorBoundary>
      </CardContent>
      <ReportInjuryDialog open={injuryOpen} onOpenChange={setInjuryOpen} />
    </Card>
  );
}

function BlockCard({
  block,
  onNavigate,
}: {
  block: PrescribedBlock;
  onNavigate: (route: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [gapsOpen, setGapsOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [warmupOpen, setWarmupOpen] = useState(false);
  const { user } = useAuth();
  const ctx = useHammerAthleteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sport = (ctx.get<string>("sport_primary")?.value as
    | "baseball"
    | "softball"
    | undefined) ?? "baseball";
  const { createTemplate } = useCustomActivities(sport);

  const focusGaps = useMemo(
    () =>
      block.missingContextKeys
        .map((k) => HAMMER_KNOWLEDGE_GAPS.find((g) => g.id === k))
        .filter((g): g is (typeof HAMMER_KNOWLEDGE_GAPS)[number] => !!g),
    [block.missingContextKeys],
  );

  async function handleAddToGamePlan() {
    if (!block.gamePlanTemplate || adding) return;
    if (!user) {
      toast.error("Sign in to add to your Game Plan.");
      return;
    }
    setAdding(true);
    try {
      const seed = block.gamePlanTemplate;
      const payload = {
        activity_type: seed.activityType,
        title: seed.title,
        description: seed.description,
        icon: seed.icon,
        color: seed.color,
        exercises: [],
        meals: {} as never,
        custom_fields: block.drills.map((d, i) => ({
          id: `drill-${i}`,
          label: d.name,
          value: d.setup ? `${d.dosage} — ${d.setup}` : d.dosage,
          notes: d.cue ?? "",
        })),
        duration_minutes: seed.durationMinutes,
        intensity: null,
        distance_value: null,
        distance_unit: null,
        pace_value: null,
        intervals: [],
        is_favorited: false,
        is_non_negotiable: false,
        source: seed.source,
        recurring_days: [],
        recurring_active: false,
        sport,
        embedded_running_sessions: null,
        display_nickname: null,
        custom_logo_url: null,
        reminder_enabled: false,
        reminder_time: null,
        display_on_game_plan: true,
        display_days: [],
        display_time: null,
        specific_dates: null,
      } as unknown as Omit<
        CustomActivityTemplate,
        "id" | "user_id" | "created_at" | "updated_at"
      >;
      const result = await createTemplate(payload, true);
      if (!result) {
        // createTemplate already surfaced its own toast.error
        return;
      }
      setAdded(true);
      // Nudge any listening surfaces (GamePlanCard etc.) to refetch immediately.
      try {
        const bc = new BroadcastChannel("data-sync");
        bc.postMessage({ type: "custom-activity-updated", templateId: result.id });
        bc.close();
      } catch {
        /* BroadcastChannel unavailable — realtime will catch up */
      }
      queryClient.invalidateQueries({ queryKey: ["custom-activity-logs"] });
      queryClient.invalidateQueries({ queryKey: ["custom-activity-templates"] });
      queryClient.invalidateQueries({ queryKey: ["game-plan"] });
      toast.success(`${block.title} added to today's Game Plan`, {
        action: {
          label: "View",
          onClick: () => navigate("/dashboard#game-plan"),
        },
      });
    } catch (e) {
      console.error("[HammerDailyPlan] Add to Game Plan failed", e);
      toast.error(e instanceof Error ? e.message : "Couldn't add to Game Plan");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      id={`hammer-plan-${block.modality}`}
      className={`rounded-lg border p-3 scroll-mt-24 ${STATUS_TONE[block.status]}`}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold capitalize">{block.title}</span>
              <BlockSideBadge modality={block.modality} />
              {block.durationMin !== null && block.durationMin > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {block.durationMin} min
                </Badge>
              )}
              {block.phase && (
                <Badge
                  variant="outline"
                  className={`text-[10px] border-transparent ${PHASE_TONE[block.phase] ?? ""}`}
                >
                  {block.phase}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{block.why}</p>
            {block.roadmapReason && (
              <p className="text-[11px] text-muted-foreground/80 mt-0.5 italic">
                {block.roadmapReason}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Button
              size="sm"
              variant={block.status === "awaiting-input" ? "outline" : "default"}
              onClick={() => {
                // Warm-up opens the generator in place — Practice Hub is for
                // hitting/throwing/defense/baserunning practice sessions, not warm-ups.
                if (block.route === "hammer:open-warmup-generator") {
                  setWarmupOpen(true);
                  return;
                }
                // "Answer Hammer" (and any in-page hash route) is an
                // inline-onboarding affordance, not a real route. Expand the
                // block, open the gap drawer, and scroll the user to it so
                // they can answer right where they are.
                if (block.route.startsWith("#") || block.status === "awaiting-input") {
                  setOpen(true);
                  setGapsOpen(true);
                  // Fall back to chat if there are no structured gaps to ask.
                  if (focusGaps.length === 0) setChatOpen(true);
                  // Defer scroll until the collapsible has expanded.
                  requestAnimationFrame(() => {
                    const el = document.getElementById(`hammer-plan-${block.modality}`);
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                  });
                  return;
                }
                onNavigate(block.route);
              }}
              className="text-xs"
            >
              {block.ctaLabel}
            </Button>

            <CollapsibleTrigger asChild>
              <Button size="sm" variant="ghost" className="text-[11px] h-7 px-2 gap-1">
                {open ? "Hide" : "Details"}
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent className="mt-3 space-y-3">
          {block.drills.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Drills
              </div>
              <ul className="space-y-1.5">
                {block.drills.map((d, i) => (
                  <li
                    key={i}
                    className="text-xs rounded-md border border-border/50 bg-muted/30 p-2"
                  >
                    <div className="font-medium">{d.name}</div>
                    <div className="text-muted-foreground mt-0.5">{d.dosage}</div>
                    {d.setup && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Setup: {d.setup}
                      </div>
                    )}
                    {d.cue && (
                      <div className="text-[11px] text-foreground/80 mt-0.5">
                        Cue: {d.cue}
                      </div>
                    )}
                    {d.stopIf && (
                      <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5 flex items-start gap-1">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>Stop if: {d.stopIf}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {block.cues.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Coaching cues
              </div>
              <ul className="text-xs space-y-0.5 list-disc list-inside marker:text-muted-foreground">
                {block.cues.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {block.stopRules.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-1">
                Stop if
              </div>
              <ul className="text-xs space-y-0.5 list-disc list-inside marker:text-amber-500">
                {block.stopRules.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {(focusGaps.length > 0 || block.missingContextKeys.length > 0) && user && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-2">
              <button
                onClick={() => setGapsOpen((v) => !v)}
                className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1"
              >
                Hammer needs to know
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${gapsOpen ? "rotate-180" : ""}`}
                />
              </button>
              {gapsOpen && (
                <div className="mt-2 space-y-2">
                  {focusGaps.map((g) => (
                    <InlineGapAnswer key={g.id} gap={g} userId={user.id} />
                  ))}
                  {focusGaps.length === 0 && (
                    <div className="text-[11px] text-muted-foreground">
                      Tell Hammer about{" "}
                      <span className="font-medium text-foreground">
                        {block.missingContextKeys.join(", ").replace(/_/g, " ")}
                      </span>{" "}
                      in chat below and your plan will adapt.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DailyPlanVideoChips modality={block.modality} />



          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/40">
            {block.gamePlanTemplate && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAddToGamePlan}
                disabled={adding || added}
                className="text-xs gap-1"
              >
                {added ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" /> Added
                  </>
                ) : (
                  <>
                    <CalendarPlus className="h-3 w-3" />
                    {adding ? "Adding…" : "Add to Game Plan"}
                  </>
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setChatOpen((v) => !v)}
              className="text-xs gap-1"
            >
              <MessageCircle className="h-3 w-3" />
              {chatOpen ? "Close chat" : "Ask Hammer"}
            </Button>
          </div>

          {chatOpen && <InlineBlockChat block={block} />}
        </CollapsibleContent>
      </Collapsible>
      {block.modality === "warmup" && (
        <HammerWarmupDialog open={warmupOpen} onOpenChange={setWarmupOpen} sport={sport} />
      )}
    </div>
  );
}

function InlineGapAnswer({
  gap,
  userId,
}: {
  gap: (typeof HAMMER_KNOWLEDGE_GAPS)[number];
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!value.trim() || saving) return;
    setSaving(true);
    try {
      const parsed =
        gap.inputKind === "number" ? Number(value) : value.trim();
      await persistContextAnswer(userId, gap.persistTo, parsed, "hammer_daily_plan_inline");
      setSaved(true);
      // Live-refresh the plan so the gap disappears and prescriptions update.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["hammer-context-envelope", userId] }),
        queryClient.invalidateQueries({ queryKey: ["athlete-context-envelope", userId] }),
        queryClient.invalidateQueries({ queryKey: ["hie-snapshot"] }),
      ]);
      toast.success("Got it — Hammer just updated your plan.");
    } catch (e) {
      console.error("[HammerDailyPlan] persistContextAnswer failed", e);
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" /> Saved — plan updated.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="text-xs">{gap.question}</div>
      {gap.helper && (
        <div className="text-[10px] text-muted-foreground">{gap.helper}</div>
      )}
      <div className="flex gap-1.5">
        {gap.inputKind === "select" && gap.options ? (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 text-xs rounded border border-border bg-background px-2 py-1"
          >
            <option value="">Choose…</option>
            {gap.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <Input
            type={gap.inputKind === "number" ? "number" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 text-xs"
            placeholder="Type your answer…"
          />
        )}
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!value.trim() || saving}
          className="h-8 text-xs"
        >
          {saving ? "…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function InlineBlockChat({ block }: { block: PrescribedBlock }) {
  const chat = useHammerChat({
    categoryFocus: {
      id: `hammer.daily.${block.modality}`,
      name: block.title,
      hierarchyRank: "rank_1",
      whyItMatters: `${block.why} ${block.roadmapReason}`.trim(),
      howToImprove: block.drills
        .map((d) => `${d.name} (${d.dosage})${d.cue ? ` — ${d.cue}` : ""}`)
        .join("; "),
    },
  });
  const [text, setText] = useState("");

  async function handleSend() {
    if (!text.trim() || chat.isSending) return;
    const t = text;
    setText("");
    await chat.send(t);
  }

  return (
    <div className="mt-2 rounded-md border border-border/50 bg-background p-2 space-y-2">
      <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs">
        {chat.messages.length === 0 && (
          <div className="text-[11px] text-muted-foreground italic">
            Ask Hammer anything about this block — how to do a drill, why it's
            prescribed, swaps, modifications.
          </div>
        )}
        {chat.messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "text-foreground"
                : "text-foreground bg-muted/40 rounded p-1.5"
            }
          >
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">
              {m.role === "user" ? "You" : "Hammer"}
            </span>
            {m.content}
          </div>
        ))}
        {chat.isSending && (
          <div className="text-[11px] text-muted-foreground italic">
            Hammer is thinking…
          </div>
        )}
        {chat.error && (
          <div className="text-[11px] text-destructive">{chat.error}</div>
        )}
      </div>
      <div className="flex gap-1.5">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Ask about this block…"
          className="min-h-[36px] text-xs resize-none"
          rows={1}
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!text.trim() || chat.isSending}
          className="h-9 px-2"
        >
          <Send className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Tiny L/R badge that auto-decides which side context applies to a block
 * (hitting → hit picker; throwing/pitching/defense → throw picker). Hidden
 * for non-switch / non-ambi athletes.
 */
function BlockSideBadge({ modality }: { modality: string }) {
  const { shouldShowPicker, selectedSide } = useSideContext();
  const discipline: "hit" | "throw" | null =
    modality === "hitting"
      ? "hit"
      : modality === "throwing" || modality === "defense"
        ? "throw"
        : null;
  if (!discipline || !shouldShowPicker(discipline)) return null;
  const s = selectedSide[discipline];
  return (
    <Badge
      variant="outline"
      className="text-[10px] font-bold"
      title={`Programmed for ${s === "L" ? "Left" : "Right"} ${discipline === "hit" ? "swing" : "arm"} — toggle in header`}
    >
      {s}
    </Badge>
  );
}
