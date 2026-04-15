import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lightbulb, Target } from "lucide-react";
import { ScenarioBlock } from "./ScenarioBlock";
import { Skeleton } from "@/components/ui/skeleton";

interface LessonDetailProps {
  lessonId: string;
  sport: string;
  onBack: () => void;
  onComplete: (lessonId: string, score: number) => void;
  isCompleted: boolean;
  previousScore: number;
}

export function LessonDetail({ lessonId, sport, onBack, onComplete, isCompleted, previousScore }: LessonDetailProps) {
  const lessonQuery = useQuery({
    queryKey: ["baserunning-lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("baserunning_lessons")
        .select("*")
        .eq("id", lessonId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const scenariosQuery = useQuery({
    queryKey: ["baserunning-scenarios", lessonId, sport],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("baserunning_scenarios")
        .select("*")
        .eq("lesson_id", lessonId)
        .or(`sport.eq.${sport},sport.eq.both`);
      if (error) throw error;
      return data;
    },
  });

  const lesson = lessonQuery.data;
  const scenarios = scenariosQuery.data ?? [];

  if (lessonQuery.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (!lesson) return null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-1 -ml-2">
        <ArrowLeft className="h-4 w-4" /> Back to lessons
      </Button>

      <div>
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary mb-1">
          {lesson.level}
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold">{lesson.title}</h1>
      </div>

      <Card className="p-5 sm:p-6 prose prose-sm dark:prose-invert max-w-none">
        <div dangerouslySetInnerHTML={{ __html: lesson.content.replace(/\n/g, "<br/>") }} />
      </Card>

      {lesson.elite_cue && (
        <Card className="p-4 sm:p-5 border-primary/30 bg-primary/5 flex gap-3 items-start">
          <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm mb-1">Elite Cue</h3>
            <p className="text-sm text-muted-foreground">{lesson.elite_cue}</p>
          </div>
        </Card>
      )}

      {lesson.game_transfer && (
        <Card className="p-4 sm:p-5 flex gap-3 items-start">
          <Target className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm mb-1">Game Transfer</h3>
            <p className="text-sm text-muted-foreground">{lesson.game_transfer}</p>
          </div>
        </Card>
      )}

      {isCompleted && (
        <div className="text-sm text-muted-foreground">
          Previous best: {previousScore}/{scenarios.length} correct
        </div>
      )}

      {scenarios.length > 0 && (
        <ScenarioBlock
          scenarios={scenarios.map((s) => ({ ...s, options: (s.options as any) || [], answer_options: (s.answer_options as any) || null, correct_answer_id: s.correct_answer_id || null }))}
          onComplete={(score) => onComplete(lessonId, score)}
        />
      )}
    </div>
  );
}
