import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  title: string;
  level: string;
  order_index: number;
}

interface ProgressRecord {
  lesson_id: string;
  completed: boolean;
  score: number;
}

interface LessonListProps {
  lessons: Lesson[];
  progress: ProgressRecord[];
  completionPct: number;
  onSelect: (lessonId: string) => void;
}

export function LessonList({ lessons, progress, completionPct, onSelect }: LessonListProps) {
  const getProgress = (lessonId: string) => progress.find((p) => p.lesson_id === lessonId);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm text-muted-foreground">{completionPct}%</span>
        </div>
        <Progress value={completionPct} className="h-2" />
      </div>

      <div className="grid gap-3">
        {lessons.map((lesson) => {
          const prog = getProgress(lesson.id);
          const completed = prog?.completed ?? false;

          return (
            <Card
              key={lesson.id}
              onClick={() => onSelect(lesson.id)}
              className={cn(
                "p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all hover:scale-[1.01]",
                completed && "border-green-500/30 bg-green-500/5"
              )}
            >
              {completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{lesson.title}</h3>
                <span className="text-xs text-muted-foreground capitalize">{lesson.level}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
