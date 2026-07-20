import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Lightbulb, AlertTriangle, Sparkles } from "lucide-react";
import { IqDiamond, legendForAssignments } from "@/components/iq/IqDiamond";
import { IqScenarioRunner } from "@/components/iq/IqScenarioRunner";
import { useIqSituation } from "@/hooks/useIqSituations";
import { useSportTheme } from "@/contexts/SportThemeContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { ROLE_LABELS, ASSIGNMENT_LABELS, ASSIGNMENT_COLOR, LENS_ACCENT, LENS_LABELS, DEFENSIVE_ROLES, OFFENSIVE_ROLES } from "@/lib/iq/types";
import type { IqActorRole } from "@/lib/iq/types";
import {
  CONTEXT_AXIS_LABELS, getContextValues, computeRoleShifts, NEUTRAL_SELECTION,
  type ContextAxis, type ContextSelection,
} from "@/lib/iq/contextShifts";
import { useAlignmentPresets, fallbackAlignment, resolvePositions } from "@/hooks/useDefensiveAlignment";
import type { Handedness } from "@/lib/iq/fieldModel";
import { resolveAlignment, type RunnerBase } from "@/lib/iq/alignmentResolver";



export default function GameIqSituation() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { sport } = useSportTheme();
  const fieldSport = sport === "softball" ? "softball" : "baseball";
  const q = useIqSituation(slug ?? "", sport);
  const [hover, setHover] = useState<IqActorRole | null>(null);
  const [mode, setMode] = useState<"teach" | "quiz">("teach");
  const [context, setContext] = useState<ContextSelection>(NEUTRAL_SELECTION);
  const [hand, setHand] = useState<Handedness>("R");
  const [runners, setRunners] = useState<RunnerBase[]>([]);
  const [outs, setOuts] = useState<number>(0);
  const alignmentsQ = useAlignmentPresets(fieldSport);




  if (q.isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DashboardLayout>
    );
  }
  if (!q.data) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto p-8 text-center">
          <p className="text-muted-foreground">Situation not found.</p>
          <Button variant="ghost" onClick={() => navigate("/iq")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { situation, actors, scenarios } = q.data;
  const hoveredActor = hover ? actors.find((a) => a.role === hover) : null;
  const firstScenario = scenarios[0];
  const presets = alignmentsQ.data ?? [];
  const resolved = resolveAlignment({
    presets,
    selector: (situation as any).alignment_selector ?? null,
    situationPreset: firstScenario?.alignment_preset ?? situation.alignment_preset ?? null,
    sport: fieldSport,
    state: { batterSide: hand, runners, outs },
  });
  const defensivePositions = resolved.positions.P ? resolved.positions : fallbackAlignment(fieldSport);



  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-0 py-4 space-y-5">
        <Button variant="ghost" onClick={() => navigate("/iq")} className="-ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> All situations
        </Button>

        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {situation.lens_tags.map((l) => (
              <Badge key={l} variant="outline" className="text-[10px] uppercase"
                     style={{ borderColor: LENS_ACCENT[l], color: LENS_ACCENT[l] }}>
                {LENS_LABELS[l]}
              </Badge>
            ))}
            <Badge variant="secondary" className="text-[10px] capitalize">{situation.difficulty}</Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{situation.title}</h1>
          <p className="text-muted-foreground mt-1">{situation.summary}</p>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant={mode === "teach" ? "default" : "outline"} onClick={() => setMode("teach")}>
            <BookOpen className="h-4 w-4 mr-1" /> Teach
          </Button>
          <Button size="sm" variant={mode === "quiz" ? "default" : "outline"} onClick={() => setMode("quiz")}
                  disabled={!firstScenario}>
            <Sparkles className="h-4 w-4 mr-1" /> Quiz
          </Button>
        </div>

        {mode === "teach" && (() => {
          const roles = actors.map((a) => a.role);
          const shifts = computeRoleShifts(context, roles);
          const ctxValues = getContextValues(sport);

          const activeNotes = roles.flatMap((r) =>
            (shifts[r]?.notes ?? []).map((n) => ({ role: r, note: n }))
          );
          const hasContext = Object.values(context).some(Boolean);
          return (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Batter</span>
                  <div className="inline-flex rounded-full border p-0.5 text-xs">
                    <button type="button" onClick={() => setHand("R")}
                            className={"px-3 py-0.5 rounded-full " + (hand === "R" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                      RHH
                    </button>
                    <button type="button" onClick={() => setHand("L")}
                            className={"px-3 py-0.5 rounded-full " + (hand === "L" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                      LHH
                    </button>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 text-xs">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Runners</span>
                  {(["1B","2B","3B"] as RunnerBase[]).map((b) => {
                    const on = runners.includes(b);
                    return (
                      <button key={b} type="button"
                        onClick={() => setRunners((r) => on ? r.filter((x) => x !== b) : [...r, b])}
                        className={"px-2 py-0.5 rounded-full border text-[11px] " + (on ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30")}>
                        {b}
                      </button>
                    );
                  })}
                </div>
                <div className="inline-flex items-center gap-1 text-xs">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Outs</span>
                  {[0,1,2].map((o) => (
                    <button key={o} type="button" onClick={() => setOuts(o)}
                      className={"px-2 py-0.5 rounded-full border text-[11px] " + (outs === o ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30")}>
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px]">
                Alignment: {resolved.presetKey}{resolved.reason === "rule" ? " (rule)" : resolved.reason === "default" ? " (default)" : ""}
              </Badge>
            </div>
            <IqDiamond actors={actors} mode="teach" highlightRole={hover} roleShifts={shifts} defensivePositions={defensivePositions} sport={fieldSport} batterSide={hand} />


            <Card className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Context — shift the defense by the read
                </div>
                {hasContext && (
                  <Button size="sm" variant="ghost" className="h-6 text-xs"
                          onClick={() => setContext(NEUTRAL_SELECTION)}>
                    Reset
                  </Button>
                )}
              </div>
              <div className="space-y-1.5">
                {(Object.keys(ctxValues) as ContextAxis[]).map((axis) => (
                  <div key={axis} className="flex items-start gap-2 flex-wrap">
                    <div className="text-[10px] uppercase font-semibold text-muted-foreground w-24 mt-1.5 shrink-0">
                      {CONTEXT_AXIS_LABELS[axis]}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {ctxValues[axis].map((v) => {

                        const active = context[axis] === v.value;
                        return (
                          <button key={v.value} type="button"
                                  onClick={() => setContext((c) => ({
                                    ...c, [axis]: active ? undefined : v.value,
                                  }))}
                                  className={"text-[10px] px-2 py-1 rounded-full border transition-colors " +
                                    (active
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-muted/30 hover:bg-muted")}>
                            {v.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {activeNotes.length > 0 && (
                <div className="border-t pt-2 space-y-1 max-h-32 overflow-y-auto">
                  {activeNotes.slice(0, 8).map((n, i) => (
                    <div key={i} className="text-[11px] leading-snug">
                      <span className="font-semibold">{n.role}:</span> {n.note}
                    </div>
                  ))}
                </div>
              )}
            </Card>


            <Card className="p-3 flex flex-wrap gap-3 justify-center text-xs">
              {legendForAssignments().map((l) => (
                <div key={l.key} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ background: ASSIGNMENT_COLOR[l.key] }} />
                  <span>{l.label}</span>
                </div>
              ))}
            </Card>

            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tap a position to study its job
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Defense</div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {DEFENSIVE_ROLES.map((r) => {
                    const a = actors.find((x) => x.role === r);
                    if (!a) return null;
                    return (
                      <Button key={r} size="sm"
                              variant={hover === r ? "default" : "outline"}
                              onClick={() => setHover(hover === r ? null : r)}
                              style={{ borderColor: ASSIGNMENT_COLOR[a.assignment] }}>
                        {r}
                      </Button>
                    );
                  })}
                </div>
              </div>
              {OFFENSIVE_ROLES.some((r) => actors.some((x) => x.role === r)) && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Offense</div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {OFFENSIVE_ROLES.map((r) => {
                      const a = actors.find((x) => x.role === r);
                      if (!a) return null;
                      return (
                        <Button key={r} size="sm"
                                variant={hover === r ? "default" : "outline"}
                                onClick={() => setHover(hover === r ? null : r)}
                                style={{ borderColor: ASSIGNMENT_COLOR[a.assignment] }}>
                          {r}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>


            {hoveredActor && (
              <Card className="p-5 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{ROLE_LABELS[hoveredActor.role]}</h3>
                  <Badge style={{ background: ASSIGNMENT_COLOR[hoveredActor.assignment], color: "hsl(var(--iq-field))" }}>
                    {ASSIGNMENT_LABELS[hoveredActor.assignment]}
                  </Badge>
                </div>
                {hoveredActor.coaching_note && (
                  <p className="text-sm leading-relaxed">{hoveredActor.coaching_note}</p>
                )}
                {hoveredActor.communication_call && (
                  <p className="text-sm"><span className="font-semibold">Call:</span> "{hoveredActor.communication_call}"</p>
                )}
                {hoveredActor.secondary_read && (
                  <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">If…</span> {hoveredActor.secondary_read}</p>
                )}
                {hoveredActor.elite_cue && (
                  <div className="flex gap-2 items-start rounded bg-primary/5 border border-primary/20 p-2">
                    <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-xs"><span className="font-semibold">Elite cue:</span> {hoveredActor.elite_cue}</p>
                  </div>
                )}
                {hoveredActor.common_mistake && (
                  <div className="flex gap-2 items-start rounded bg-destructive/5 border border-destructive/20 p-2">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs"><span className="font-semibold">Common mistake:</span> {hoveredActor.common_mistake}</p>
                  </div>
                )}
              </Card>
            )}

            {situation.sources?.length > 0 && (
              <Card className="p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Sources · triple-checked</div>
                <ul className="text-xs space-y-1">
                  {situation.sources.map((s, i) => <li key={i}>· {s.label}</li>)}
                </ul>
              </Card>
            )}
          </>
          );
        })()}


        {mode === "quiz" && firstScenario && (
          <IqScenarioRunner
            situationId={situation.id}
            situationSlug={situation.slug}
            situationTitle={situation.title}
            scenario={firstScenario}
            actors={actors}
            defensivePositions={defensivePositions}
            sport={fieldSport}
            batterSide={hand}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
