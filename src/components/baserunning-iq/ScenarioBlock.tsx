import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionSummary } from "./SessionSummary";

interface AnswerOption {
  id: string;
  text: string;
}

interface Scenario {
  id: string;
  scenario_text: string;
  correct_answer: string;
  explanation: string;
  options: string[];
  difficulty: string;
  wrong_explanations?: Record<string, string> | unknown;
  game_consequence?: string | null;
  answer_options?: AnswerOption[] | null;
  correct_answer_id?: string | null;
}

interface ScenarioBlockProps {
  scenarios: Scenario[];
  onComplete: (score: number) => void;
}

function getOptions(scenario: Scenario): AnswerOption[] {
  if (scenario.answer_options && scenario.answer_options.length > 0) {
    return scenario.answer_options;
  }
  return (scenario.options as string[]).map((text, i) => ({
    id: String.fromCharCode(97 + i),
    text,
  }));
}

function getCorrectId(scenario: Scenario): string {
  if (scenario.correct_answer_id) return scenario.correct_answer_id;
  const opts = getOptions(scenario);
  const match = opts.find((o) => o.text === scenario.correct_answer);
  return match?.id ?? opts[0]?.id ?? "a";
}

function getWrongExplanation(scenario: Scenario, selectedId: string, selectedText: string): string | null {
  const we = scenario.wrong_explanations as Record<string, string> | null | undefined;
  if (!we) return null;
  const result = we[selectedId] ?? we[selectedText] ?? null;
  if (!result && import.meta.env.DEV) {
    console.warn(`[BaserunningIQ] Missing wrong_explanation for scenario ${scenario.id}, selected: id=${selectedId} text="${selectedText}"`);
  }
  return result;
}

export function ScenarioBlock({ scenarios, onComplete }: ScenarioBlockProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);

  if (!scenarios.length) return null;

  const current = scenarios[currentIdx];
  const opts = getOptions(current);
  const correctId = getCorrectId(current);
  const isCorrect = selectedId === correctId;
  const isLast = currentIdx === scenarios.length - 1;
  const selectedOpt = opts.find((o) => o.id === selectedId);
  const correctOpt = opts.find((o) => o.id === correctId);

  const handleSelect = (optionId: string) => {
    if (showResult) return;
    setSelectedId(optionId);
    setShowResult(true);
    if (optionId === correctId) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = () => {
    if (isLast) {
      setShowSummary(true);
      return;
    }
    setCurrentIdx((i) => i + 1);
    setSelectedId(null);
    setShowResult(false);
  };

  if (showSummary) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Scenario Training</h3>
        <SessionSummary
          correctCount={correctCount}
          totalCount={scenarios.length}
          onContinue={() => onComplete(correctCount)}
        />
      </div>
    );
  }

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
          {opts.map((opt) => {
            const isThis = selectedId === opt.id;
            const correct = opt.id === correctId;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                disabled={showResult}
                className={cn(
                  "text-left px-4 py-3 rounded-lg border transition-all text-sm",
                  !showResult && "hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
                  showResult && correct && "border-green-500 bg-green-500/10",
                  showResult && isThis && !correct && "border-destructive bg-destructive/10",
                  !showResult && "border-border"
                )}
              >
                {opt.text}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div className="space-y-3">
            {!isCorrect && selectedOpt && (() => {
              const wrongExp = getWrongExplanation(current, selectedOpt.id, selectedOpt.text);
              if (!wrongExp) return null;
              return (
                <div className="flex items-start gap-2 p-3 rounded-lg text-sm bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-destructive">Why "{selectedOpt.text}" fails:</p>
                    <p>{wrongExp}</p>
                  </div>
                </div>
              );
            })()}
            <div className={cn("flex items-start gap-2 p-3 rounded-lg text-sm", isCorrect ? "bg-green-500/10" : "bg-muted")}>
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-600">Correct: "{correctOpt?.text ?? current.correct_answer}"</p>
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
            {isLast ? "Finish" : "Next Scenario"}
          </Button>
        )}
      </Card>
    </div>
  );
}
