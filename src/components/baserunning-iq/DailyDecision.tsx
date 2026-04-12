import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Flame, Target, Clock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBaserunningDaily } from "@/hooks/useBaserunningDaily";
import { SessionSummary } from "./SessionSummary";

interface DailyDecisionProps {
  sport: string;
}

export function DailyDecision({ sport }: DailyDecisionProps) {
  const {
    scenarios,
    todayAttempts,
    completedToday,
    streak,
    stats,
    submitAttempt,
    isLoading,
  } = useBaserunningDaily(sport);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [sessionResults, setSessionResults] = useState<{ correct: boolean; timeMs: number }[]>([]);
  const [finished, setFinished] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  // Reset timer when scenario changes
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [currentIdx]);

  if (isLoading) return null;

  // Already completed today
  if (completedToday) {
    const todayCorrect = todayAttempts.filter((a) => a.correct).length;
    return (
      <Card className="p-5 space-y-4 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Today's Decision — Complete!</h3>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <StatBox icon={<Flame className="h-4 w-4" />} label="Streak" value={`${streak}d`} />
          <StatBox icon={<Target className="h-4 w-4" />} label="Today" value={`${todayCorrect}/${todayAttempts.length}`} />
          <StatBox icon={<Clock className="h-4 w-4" />} label="7d Acc" value={`${stats.accuracy}%`} />
        </div>
        <p className="text-sm text-muted-foreground text-center">Come back tomorrow to keep your streak alive!</p>
      </Card>
    );
  }

  // No scenarios available
  if (scenarios.length === 0 && !isLoading) {
    return (
      <Card className="p-5 text-center text-muted-foreground">
        <p>No new scenarios available today. Check back tomorrow!</p>
      </Card>
    );
  }

  // Session finished (just completed all scenarios this session)
  if (finished) {
    const correct = sessionResults.filter((r) => r.correct).length;
    const avgTime = Math.round(sessionResults.reduce((s, r) => s + r.timeMs, 0) / sessionResults.length);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Today's Decision</h3>
        </div>
        <SessionSummary
          correctCount={correct}
          totalCount={sessionResults.length}
          avgTimeMs={avgTime}
          onContinue={() => {}}
          onDismiss={() => {}}
        />
      </div>
    );
  }

  const current = scenarios[currentIdx];
  if (!current) return null;

  const isCorrect = selected === current.correct_answer;
  const isLast = currentIdx === scenarios.length - 1;

  const handleSelect = (option: string) => {
    if (showResult) return;
    const elapsed = Date.now() - startTimeRef.current;
    const correct = option === current.correct_answer;
    setSelected(option);
    setShowResult(true);
    setSessionResults((prev) => [...prev, { correct, timeMs: elapsed }]);
    submitAttempt.mutate({
      scenarioId: current.id,
      correct,
      responseTimeMs: elapsed,
    });
  };

  const handleNext = () => {
    if (isLast) {
      setFinished(true);
      return;
    }
    setCurrentIdx((i) => i + 1);
    setSelected(null);
    setShowResult(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold">Today's Decision</h3>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Flame className="h-3.5 w-3.5" /> {streak}d
          </span>
          <span className="flex items-center gap-1">
            <Target className="h-3.5 w-3.5" /> {stats.accuracy}%
          </span>
          <span>{currentIdx + 1}/{scenarios.length}</span>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary px-2 py-0.5 rounded bg-primary/10">
          {current.difficulty}
        </span>
        <p className="text-base font-medium">{current.scenario_text}</p>

        <div className="grid gap-2">
          {(current.options as string[]).map((opt) => {
            const isThis = selected === opt;
            const correct = opt === current.correct_answer;
            return (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                disabled={showResult}
                className={cn(
                  "text-left px-4 py-3 rounded-lg border transition-all text-sm",
                  !showResult && "hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
                  showResult && correct && "border-green-500 bg-green-500/10",
                  showResult && isThis && !correct && "border-destructive bg-destructive/10",
                  !showResult && "border-border"
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className="space-y-3">
            {!isCorrect && selected && current.wrong_explanations && current.wrong_explanations[selected] && (
              <div className="flex items-start gap-2 p-3 rounded-lg text-sm bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Why "{selected}" fails:</p>
                  <p>{current.wrong_explanations[selected]}</p>
                </div>
              </div>
            )}
            <div className={cn("flex items-start gap-2 p-3 rounded-lg text-sm", isCorrect ? "bg-green-500/10" : "bg-muted")}>
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-600">Correct: "{current.correct_answer}"</p>
                <p>{current.explanation}</p>
              </div>
            </div>
            {current.game_consequence && (
              <div className="flex items-start gap-2 p-3 rounded-lg text-sm bg-primary/10">
                <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-primary">Next Play:</p>
                  <p>{current.game_consequence}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {showResult && (
          <Button onClick={handleNext} className="w-full">
            {isLast ? "Finish" : "Next"}
          </Button>
        )}
      </Card>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-background border">
      <div className="text-primary">{icon}</div>
      <span className="text-lg font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
