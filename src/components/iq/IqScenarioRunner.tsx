// Quiz runner: pick your position, answer "where do YOU go?", record attempt.
// Hardened with: per-tick resume snapshot, offline attempt queue, Save & exit,
// and `data-protected-editing` so the auth guard never evicts mid-rep.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, XCircle, ArrowRight, LogOut, RefreshCw, Eye, Megaphone, Sparkles, AlertTriangle, ChevronDown, Users, Play } from "lucide-react";
import { IqDiamond } from "./IqDiamond";
import { IqPlaybackControls } from "./IqPlaybackControls";
import { IqOverlayFilterBar, type OverlayMode } from "./IqCoachOverlay";
import { IqDebriefCard } from "./IqDebriefCard";
import { useRecordIqAttempt } from "@/hooks/useIqProgress";
import { useIqVoiceover, isVoiceoverSupported } from "@/hooks/useIqVoiceover";
import { toast } from "@/hooks/use-toast";
import type { IqActor, IqActorRole, IqScenario, IqAssignment, IqSport } from "@/lib/iq/types";
import { ASSIGNMENT_LABELS, ROLE_LABELS, DEFENSIVE_ROLES } from "@/lib/iq/types";
import { quizResume, pendingAttempts } from "@/lib/iq/resumeStore";
import { buildScenarioFeedback } from "@/lib/iq/feedback";

const OVERLAY_KEY = "iq:overlay";
const VOICE_KEY = "iq:voice";
function loadOverlay(): OverlayMode {
  try {
    const v = localStorage.getItem(OVERLAY_KEY);
    if (v === "all" || v === "footwork" || v === "comm" || v === "eyes" || v === "off") return v;
  } catch { /* noop */ }
  return "all";
}
function loadVoice(): boolean {
  try { return localStorage.getItem(VOICE_KEY) === "1"; } catch { return false; }
}

interface Props {
  situationId: string;
  situationSlug?: string;
  situationTitle?: string;
  scenario: IqScenario;
  actors: IqActor[];
  defensivePositions?: Partial<Record<IqActorRole, { x: number; y: number }>>;
  sport?: "baseball" | "softball";
  batterSide?: "R" | "L";
  debrief?: string | null;
  conceptLabels?: string[];
  /** Current situation's difficulty rung (1–5) — powers the "Next rung" prompt. */
  difficultyRung?: number;
}

export function IqScenarioRunner({ situationId, situationSlug, situationTitle, scenario, actors, defensivePositions, sport = "baseball", batterSide = "R", debrief, conceptLabels, difficultyRung = 1 }: Props) {

  const navigate = useNavigate();
  const record = useRecordIqAttempt();

  // Rehydrate from any saved snapshot for this exact scenario.
  const initial = (() => {
    const snap = quizResume.load();
    if (snap && snap.situationId === situationId && snap.scenarioId === scenario.id) return snap;
    return null;
  })();

  const [position, setPosition] = useState<IqActorRole | null>(
    (initial?.position as IqActorRole | null) ?? null,
  );
  const [answer, setAnswer] = useState<IqAssignment | null>(
    (initial?.answer as IqAssignment | null) ?? null,
  );
  const [submitted, setSubmitted] = useState(false);
  // Preview mode: lets athletes "Watch the play" before answering. It animates
  // routes/pucks in reveal styling without recording an attempt.
  const [preview, setPreview] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [overlay, setOverlay] = useState<OverlayMode>(loadOverlay);
  const [voice, setVoice] = useState<boolean>(loadVoice);
  const animating = submitted || preview;
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(initial?.startedAt ?? Date.now());

  useEffect(() => { try { localStorage.setItem(OVERLAY_KEY, overlay); } catch { /* noop */ } }, [overlay]);
  useEffect(() => { try { localStorage.setItem(VOICE_KEY, voice ? "1" : "0"); } catch { /* noop */ } }, [voice]);

  // Derive per-actor startAts matching what buildTimeline uses in IqDiamond,
  // so voiceover triggers exactly when each actor's chip becomes visible.
  const startAts = (() => {
    const defenders = actors.filter((a) => !["R1","R2","R3","BR","BAT"].includes(a.role));
    const N = Math.max(1, defenders.length);
    const map: Partial<Record<IqActorRole, number>> = {};
    actors.forEach((a, idx) => {
      const anyA = a as unknown as { start_at?: number };
      map[a.role] = anyA.start_at ?? 0.15 + (idx / N) * 0.05;
    });
    return map;
  })();
  useIqVoiceover({ enabled: submitted && voice, playing, progress, actors, mode: overlay, startAts });

  // Advance the play clock while `playing`.
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      setProgress((p) => {
        const next = p + (dt / 3.2) * speed;
        if (next >= 1) { setPlaying(false); return 1; }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, speed]);

  const correct = position
    ? scenario.correct_actor_assignments[position] === answer
    : false;

  // Persist every state change so a reload / accidental exit resumes here.
  useEffect(() => {
    if (submitted) return;
    quizResume.save({
      situationId,
      situationSlug: situationSlug ?? "",
      situationTitle: situationTitle ?? "",
      scenarioId: scenario.id,
      position,
      answer,
      startedAt: startTimeRef.current,
    });
  }, [position, answer, submitted, situationId, situationSlug, situationTitle, scenario.id]);

  // On mount, drain any pending attempts from a previous offline session.
  useEffect(() => {
    const pending = pendingAttempts.list();
    if (pending.length === 0) return;
    (async () => {
      for (const p of pending) {
        try {
          await record.mutateAsync({
            scenarioId: p.scenarioId,
            situationId: p.situationId,
            positionChosen: p.positionChosen,
            correct: p.correct,
            answerPayload: p.answerPayload,
            timeMs: p.timeMs,
          });
          pendingAttempts.remove(p.id);
        } catch {
          // Leave it queued; will retry next mount.
          break;
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    if (!position || !answer) return;
    const timeMs = Date.now() - startTimeRef.current;
    setSubmitted(true);
    quizResume.clear();
    try {
      await record.mutateAsync({
        scenarioId: scenario.id,
        situationId,
        positionChosen: position,
        correct,
        answerPayload: { position, answer },
        timeMs,
      });
    } catch (e) {
      // Queue offline; will retry on next mount.
      pendingAttempts.enqueue({
        scenarioId: scenario.id,
        situationId,
        positionChosen: position,
        correct,
        answerPayload: { position, answer },
        timeMs,
      });
      toast({
        title: "Saved offline",
        description: "We'll send your answer the next time you're online.",
      });
    }
  };

  const reset = () => {
    setPosition(null); setAnswer(null); setSubmitted(false);
    startTimeRef.current = Date.now();
  };

  const handleSaveAndExit = () => {
    // Snapshot already kept current by the effect above.
    toast({ title: "Saved", description: "You can pick this rep back up anytime." });
    navigate("/iq");
  };

  return (
    <Card className="p-5 space-y-4" data-protected-editing="true">
      <p className="text-base font-medium">{scenario.prompt}</p>

      <IqDiamond
        actors={actors}
        mode={animating ? "reveal" : "quiz"}
        highlightRole={position}
        defensivePositions={defensivePositions}
        sport={sport}
        batterSide={batterSide}
        progress={animating ? progress : undefined}
        playing={animating ? playing : false}
        scenario={scenario}
        overlay={animating ? overlay : "off"}
      />

      {animating && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => { setProgress(0); setPlaying(true); }}
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Watch the play
            </Button>
            <IqOverlayFilterBar
              value={overlay}
              onChange={setOverlay}
              voiceEnabled={voice}
              onToggleVoice={() => setVoice((v) => !v)}
              voiceSupported={isVoiceoverSupported()}
            />
          </div>
          <IqPlaybackControls
            playing={playing}
            progress={progress}
            speed={speed}
            onTogglePlay={() => {
              if (progress >= 1) setProgress(0);
              setPlaying((p) => !p);
            }}
            onScrub={(t) => { setPlaying(false); setProgress(t); }}
            onSetSpeed={setSpeed}
            onRestart={() => { setProgress(0); setPlaying(true); }}
          />
          {preview && !submitted && (
            <div className="flex items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
              <span>Preview mode — your answer isn't locked in yet.</span>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setPreview(false); setPlaying(false); setProgress(0); }}>
                Back to quiz
              </Button>
            </div>
          )}
        </div>
      )}


      {!submitted && (
        <>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">1 · Your position</div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {DEFENSIVE_ROLES.map((r) => (
                <Button key={r} type="button" size="sm"
                        variant={position === r ? "default" : "outline"}
                        onClick={() => setPosition(r)}>
                  {r}
                </Button>
              ))}
            </div>
          </div>

          {position && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">2 · Your job ({ROLE_LABELS[position]})</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(["ball","bag","backup","read","execute"] as IqAssignment[]).map((a) => (
                  <Button key={a} type="button" size="sm"
                          variant={answer === a ? "default" : "outline"}
                          onClick={() => setAnswer(a)}>
                    {ASSIGNMENT_LABELS[a]}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Button disabled={!position || !answer || record.isPending}
                  onClick={handleSubmit} className="w-full">
            Lock it in <ArrowRight className="h-4 w-4 ml-1" />
          </Button>

          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Restart rep
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleSaveAndExit}>
              <LogOut className="h-3.5 w-3.5 mr-1" /> Save & exit
            </Button>
          </div>
        </>
      )}

      {submitted && position && answer && (() => {
        const fb = buildScenarioFeedback({ scenario, actors, chosenRole: position, chosenAnswer: answer });
        return (
          <div className="space-y-3">
            {/* Verdict */}
            <div className={"rounded-lg p-4 flex items-start gap-3 " + (fb.correct ? "bg-green-500/10 border border-green-500/30" : "bg-destructive/10 border border-destructive/30")}>
              {fb.correct
                ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                : <XCircle className="h-5 w-5 text-destructive shrink-0" />}
              <div className="flex-1">
                <div className="font-semibold">
                  {fb.correct ? "Correct" : `Not quite — the right call was ${fb.correctAssignmentLabel}`}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  You played: <span className="font-medium">{fb.chosenAssignmentLabel}</span> · As the {fb.roleLabel}
                </div>
              </div>
            </div>

            {/* Why your answer missed */}
            {!fb.correct && fb.whyWrong && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Why "{fb.chosenAssignmentLabel}" wasn't the play
                </div>
                <p className="text-sm leading-relaxed">{fb.whyWrong}</p>
                {fb.coachNote && (
                  <p className="text-xs text-muted-foreground border-l-2 border-destructive/40 pl-3 mt-2">
                    <span className="font-semibold text-foreground">Coach's note: </span>{fb.coachNote}
                  </p>
                )}
              </div>
            )}

            {/* Why the right answer is right */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Why "{fb.correctAssignmentLabel}" is right for the {fb.roleLabel}
              </div>
              <div className="space-y-2.5 text-sm">
                {fb.yourJob && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Your job</div>
                    <p>{fb.yourJob}</p>
                  </div>
                )}
                {fb.read && (
                  <div className="flex gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">What to read</div>
                      <p>{fb.read}</p>
                    </div>
                  </div>
                )}
                {fb.call && (
                  <div className="flex gap-2">
                    <Megaphone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">What to call</div>
                      <p>{fb.call}</p>
                    </div>
                  </div>
                )}
                {fb.eliteCue && (
                  <div className="rounded-md bg-primary/10 border border-primary/30 p-3 flex gap-2">
                    <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm italic">{fb.eliteCue}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Big picture */}
            {fb.bigPicture && (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Big picture</div>
                <p className="text-sm leading-relaxed">{fb.bigPicture}</p>
              </div>
            )}

            {/* Rest of the field */}
            {fb.othersOnField.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="w-full flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-semibold hover:bg-accent transition-colors">
                  <span className="flex items-center gap-2"><Users className="h-4 w-4" /> What everyone else is doing ({fb.othersOnField.length})</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {fb.othersOnField.map((o) => (
                    <div key={o.role} className="rounded-md border bg-card/50 p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold">{o.roleLabel}</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted">{o.assignmentLabel}</span>
                      </div>
                      {o.note && <p className="text-xs text-muted-foreground leading-relaxed">{o.note}</p>}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            <IqDebriefCard
              situationId={situationId}
              sport={sport as IqSport}
              currentRung={difficultyRung}
              debrief={debrief}
              conceptLabels={conceptLabels}
              actors={actors}
            />


            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={reset}>Try another position</Button>
              <Button size="sm" variant="ghost" onClick={() => navigate("/iq")}>Back to library</Button>
            </div>
          </div>
        );
      })()}
    </Card>
  );
}
