import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Scenario {
  id: string;
  scenario_text: string;
  correct_answer: string;
  explanation: string;
  options: string[];
  difficulty: string;
}

interface ScenarioBlockProps {
  scenarios: Scenario[];
  onComplete: (score: number) => void;
}

export function ScenarioBlock({ scenarios, onComplete }: ScenarioBlockProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  if (!scenarios.length) return null;

  const current = scenarios[currentIdx];
  const isCorrect = selected === current.correct_answer;
  const isLast = currentIdx === scenarios.length - 1;

  const handleSelect = (option: string) => {
    if (showResult) return;
    setSelected(option);
    setShowResult(true);
    if (option === current.correct_answer) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = () => {
    if (isLast) {
      onComplete(correctCount + (isCorrect ? 0 : 0)); // already counted
      return;
    }
    setCurrentIdx((i) => i + 1);
    setSelected(null);
    setShowResult(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Scenario Training</h3>
        <span className="text-sm text-muted-foreground">
          {currentIdx + 1} / {scenarios.length}
        </span>
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
          <div className={cn("flex items-start gap-2 p-3 rounded-lg text-sm", isCorrect ? "bg-green-500/10" : "bg-destructive/10")}>
            {isCorrect ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
            <p>{current.explanation}</p>
          </div>
        )}

        {showResult && (
          <Button onClick={handleNext} className="w-full">
            {isLast ? "Finish" : "Next Scenario"}
          </Button>
        )}
      </Card>
    </div>
  );
}
