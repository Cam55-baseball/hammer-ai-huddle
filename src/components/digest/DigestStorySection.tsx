import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Activity,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import type { DigestProjection } from "@/lib/digest/projections";
import {
  organismStateWord,
  improvedSentence,
  attentionSentence,
  whatToDoNextSentence,
} from "@/lib/digest/sentences";

const STORAGE_KEY = "digest.explainSimply";

export function useExplainSimply() {
  const [on, setOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "1";
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
    } catch {
      /* no-op */
    }
  }, [on]);
  return [on, setOn] as const;
}

export function ExplainSimplyToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        id="explain-simply"
        checked={on}
        onCheckedChange={onChange}
        aria-label="Explain simply"
      />
      <Label htmlFor="explain-simply" className="cursor-pointer text-sm">
        Explain simply
      </Label>
    </div>
  );
}

interface StoryBlockProps {
  icon: React.ReactNode;
  eyebrow: string;
  sentence: string;
  accent: "neutral" | "good" | "watch" | "do";
  children?: React.ReactNode;
}

const ACCENT: Record<StoryBlockProps["accent"], string> = {
  neutral: "bg-sky-500",
  good: "bg-emerald-500",
  watch: "bg-amber-500",
  do: "bg-primary",
};

function StoryBlock({ icon, eyebrow, sentence, accent, children }: StoryBlockProps) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="relative overflow-hidden">
      <div
        className={`absolute inset-y-0 left-0 w-[3px] ${ACCENT[accent]}`}
        aria-hidden
      />
      <CardContent className="space-y-3 py-5 pl-5 pr-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {icon}
          {eyebrow}
        </div>
        <p className="text-lg font-medium leading-snug text-foreground">{sentence}</p>
        {children && (
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-11 -ml-2 text-xs text-muted-foreground"
              >
                <ChevronDown
                  className={`mr-1 h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
                />
                {open ? "Hide details" : "Learn more"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

interface Props {
  organismChange: DigestProjection;
  workloadShift: DigestProjection;
  recoveryContinuity: DigestProjection;
  behavioralTrend: DigestProjection;
  escalationEmerged: DigestProjection;
}

export function DigestStorySection({
  organismChange,
  workloadShift,
  recoveryContinuity,
  behavioralTrend,
  escalationEmerged,
}: Props) {
  const state = organismStateWord({
    workloadShift,
    recoveryContinuity,
    behavioralTrend,
    escalationEmerged,
  });

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <StoryBlock
        icon={<Activity className="h-3.5 w-3.5" />}
        eyebrow="This week"
        accent="neutral"
        sentence={`Your body is ${state}.`}
      />
      <StoryBlock
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        eyebrow="What improved"
        accent="good"
        sentence={improvedSentence(workloadShift, recoveryContinuity)}
      />
      <StoryBlock
        icon={<AlertCircle className="h-3.5 w-3.5" />}
        eyebrow="Needs attention"
        accent="watch"
        sentence={attentionSentence(behavioralTrend, escalationEmerged)}
      />
      <StoryBlock
        icon={<ArrowRight className="h-3.5 w-3.5" />}
        eyebrow="What to do next"
        accent="do"
        sentence={whatToDoNextSentence(state)}
      />
    </div>
  );
}
