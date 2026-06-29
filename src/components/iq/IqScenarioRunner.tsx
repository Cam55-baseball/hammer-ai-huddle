// Quiz runner: pick your position, answer "where do YOU go?", record attempt.
// Hardened with: per-tick resume snapshot, offline attempt queue, Save & exit,
// and `data-protected-editing` so the auth guard never evicts mid-rep.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, ArrowRight, LogOut, RefreshCw } from "lucide-react";
import { IqDiamond } from "./IqDiamond";
import { useRecordIqAttempt } from "@/hooks/useIqProgress";
import { toast } from "@/hooks/use-toast";
import type { IqActor, IqActorRole, IqScenario, IqAssignment } from "@/lib/iq/types";
import { ASSIGNMENT_LABELS, ROLE_LABELS, DEFENSIVE_ROLES } from "@/lib/iq/types";
import { quizResume, pendingAttempts } from "@/lib/iq/resumeStore";

interface Props {
  situationId: string;
  situationSlug?: string;
  situationTitle?: string;
  scenario: IqScenario;
  actors: IqActor[];
}

export function IqScenarioRunner({ situationId, situationSlug, situationTitle, scenario, actors }: Props) {
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
  const startTimeRef = useRef<number>(initial?.startedAt ?? Date.now());

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

      <IqDiamond actors={actors} mode={submitted ? "reveal" : "quiz"} highlightRole={position} />

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

      {submitted && (
        <div className={"rounded-lg p-4 flex items-start gap-3 " + (correct ? "bg-green-500/10 border border-green-500/30" : "bg-destructive/10 border border-destructive/30")}>
          {correct ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" /> : <XCircle className="h-5 w-5 text-destructive shrink-0" />}
          <div className="flex-1 space-y-2">
            <div className="font-semibold">
              {correct ? "Correct" : `Actually: ${ASSIGNMENT_LABELS[scenario.correct_actor_assignments[position!]]}`}
            </div>
            {scenario.explanation && (
              <p className="text-sm text-muted-foreground">{scenario.explanation}</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={reset}>Try another position</Button>
              <Button size="sm" variant="ghost" onClick={() => navigate("/iq")}>Back to library</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
