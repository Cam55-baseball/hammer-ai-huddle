import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { LessonList } from "@/components/baserunning-iq/LessonList";
import { LessonDetail } from "@/components/baserunning-iq/LessonDetail";
import { DailyDecision } from "@/components/baserunning-iq/DailyDecision";
import { LevelBadge } from "@/components/baserunning-iq/LevelBadge";
import { OnboardingHero } from "@/components/baserunning-iq/OnboardingHero";
import { useBaserunningProgress } from "@/hooks/useBaserunningProgress";
import { useBaserunningDaily } from "@/hooks/useBaserunningDaily";
import { PressureBanner } from "@/components/baserunning-iq/PressureBanner";
import { computeBaserunningLevel } from "@/utils/baserunningLevel";
import { Brain } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function BaserunningIQ() {
  const selectedSport = localStorage.getItem("selectedSport") || "baseball";
  const { lessons, progress, completionPct, markComplete, isLoading } = useBaserunningProgress(selectedSport);
  const { streak, stats, todayAttempts, completedToday, streakLost, isPerfectDay } = useBaserunningDaily(selectedSport);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  const completedLessons = progress.filter((p) => p.completed).length;
  const level = computeBaserunningLevel(completedLessons, stats.accuracy, streak);
  const isFirstTime = completedLessons === 0 && todayAttempts.length === 0 && streak === 0 && !isLoading;

  const handleComplete = (lessonId: string, score: number) => {
    markComplete.mutate({ lessonId, score });
  };

  const handleOnboardingStart = () => {
    const firstLesson = lessons.find((l) => l.order_index === 0) ?? lessons[0];
    if (firstLesson) setActiveLessonId(firstLesson.id);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 py-4">
        {isFirstTime && !activeLessonId && (
          <OnboardingHero onStart={handleOnboardingStart} />
        )}

        {!isFirstTime && !activeLessonId && (
          <>
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Brain className="h-8 w-8 text-primary" />
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Baserunning IQ</h1>
              </div>
              <p className="text-muted-foreground text-base">
                Learn elite baserunning decisions and test your game IQ
              </p>
            </div>

            <LevelBadge level={level} />

            <PressureBanner streak={streak} completedToday={completedToday} streakLost={streakLost} isPerfectDay={isPerfectDay} />
            <DailyDecision sport={selectedSport} />

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : lessons.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No lessons available yet. Check back soon!
              </div>
            ) : (
              <LessonList
                lessons={lessons}
                progress={progress}
                completionPct={completionPct}
                onSelect={setActiveLessonId}
              />
            )}
          </>
        )}

        {activeLessonId && (
          <LessonDetail
            lessonId={activeLessonId}
            sport={selectedSport}
            onBack={() => setActiveLessonId(null)}
            onComplete={handleComplete}
            isCompleted={progress.some((p) => p.lesson_id === activeLessonId && p.completed)}
            previousScore={progress.find((p) => p.lesson_id === activeLessonId)?.score ?? 0}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
