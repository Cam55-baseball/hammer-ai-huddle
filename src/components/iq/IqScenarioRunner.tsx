// Quiz runner: pick your position, answer "where do YOU go?", record attempt.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { IqDiamond } from "./IqDiamond";
import { useRecordIqAttempt } from "@/hooks/useIqProgress";
import { toast } from "@/hooks/use-toast";
import type { IqActor, IqActorRole, IqScenario, IqAssignment } from "@/lib/iq/types";
import { ASSIGNMENT_LABELS, ROLE_LABELS, DEFENSIVE_ROLES } from "@/lib/iq/types";

interface Props {
  situationId: string;
  scenario: IqScenario;
  actors: IqActor[];
}

export function IqScenarioRunner({ situationId, scenario, actors }: Props) {
  const [position, setPosition] = useState<IqActorRole | null>(null);
  const [answer, setAnswer] = useState<IqAssignment | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [startTime] = useState(Date.now());
  const record = useRecordIqAttempt();

  const correct = position
    ? scenario.correct_actor_assignments[position] === answer
    : false;

  const handleSubmit = async () => {
    if (!position || !answer) return;
    const timeMs = Date.now() - startTime;
    setSubmitted(true);
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
      toast({ title: "Couldn't save", description: e instanceof Error ? e.message : "Sign in to track progress.", variant: "destructive" });
    }
  };

  const reset = () => {
    setPosition(null); setAnswer(null); setSubmitted(false);
  };

  return (
    <Card className="p-5 space-y-4">
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
            <Button size="sm" variant="outline" onClick={reset}>Try another position</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
