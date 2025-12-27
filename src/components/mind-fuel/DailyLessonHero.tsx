import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Brain, Quote, BookOpen, Sparkles, Target, Lightbulb } from 'lucide-react';

interface LessonData {
  id: string;
  category: string;
  subcategory: string;
  content_type: string;
  lesson_text: string;
  author: string | null;
  sport: string;
  is_ai_generated: boolean;
}

interface StatsData {
  totalLessons: number;
  viewedLessons: number;
  lessonsRemainingToday: number;
  dailyLimit: number;
}

interface DailyLessonHeroProps {
  lesson: LessonData | null;
  stats: StatsData | null;
  isLoading?: boolean;
  onGetNewLesson: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  mental_mastery: 'Mental Mastery',
  emotional_balance: 'Emotional Balance',
  leadership: 'Leadership',
  life_mastery: 'Life Mastery',
};

const CONTENT_TYPE_ICONS: Record<string, typeof Quote> = {
  quote: Quote,
  lesson: BookOpen,
  mantra: Sparkles,
  teaching: Lightbulb,
  principle: Target,
  acronym: Brain,
};

export default function DailyLessonHero({ lesson, stats, isLoading, onGetNewLesson }: DailyLessonHeroProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 border-violet-500/30 overflow-hidden">
        <CardContent className="p-6 sm:p-8 space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  const hasNoLessonsRemaining = stats && stats.lessonsRemainingToday <= 0;

  // Get appropriate icon
  const ContentIcon = lesson ? (CONTENT_TYPE_ICONS[lesson.content_type] || BookOpen) : Brain;

  // Format content type for display
  const formatContentType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 border-violet-500/30 overflow-hidden relative">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-fuchsia-500/10 rounded-full blur-2xl" />

      <CardContent className="p-6 sm:p-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-400" />
            <span className="text-sm font-medium text-violet-300">
              {t('mindFuel.lesson.dailyFuel', 'DAILY MIND FUEL')}
            </span>
          </div>
          {lesson?.is_ai_generated && (
            <Badge variant="outline" className="border-violet-500/50 text-violet-300 text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              AI
            </Badge>
          )}
        </div>

        {lesson ? (
          <>
            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">
                <ContentIcon className="h-3 w-3 mr-1" />
                {formatContentType(lesson.content_type)}
              </Badge>
              <Badge className="bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30">
                {CATEGORY_LABELS[lesson.category] || lesson.category}
              </Badge>
            </div>

            {/* Lesson content */}
            <div className="relative">
              {lesson.content_type === 'quote' && (
                <Quote className="absolute -top-2 -left-2 h-8 w-8 text-violet-500/30" />
              )}
              <p className="text-lg sm:text-xl md:text-2xl font-medium text-white leading-relaxed pl-6">
                {lesson.lesson_text}
              </p>
            </div>

            {/* Author */}
            {lesson.author && (
              <p className="mt-4 text-sm text-violet-300/80 pl-6">
                — {lesson.author}
              </p>
            )}
          </>
        ) : hasNoLessonsRemaining ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/20 mb-4">
              <Sparkles className="h-8 w-8 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {t('mindFuel.lesson.limitReached', 'Daily Fuel Collected!')}
            </h3>
            <p className="text-violet-300/80 text-sm max-w-md mx-auto mb-4">
              {t('mindFuel.lesson.limitMessage', "You've collected your daily mind fuel. Return tomorrow for more mental mastery content.")}
            </p>
            <p className="text-violet-400/60 text-xs">
              {t('mindFuel.lesson.viewedToday', 'Tap "Get New Fuel" to view today\'s lesson again.')}
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/20 mb-4">
              <Brain className="h-8 w-8 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {t('mindFuel.lesson.ready', 'Ready for Today\'s Fuel?')}
            </h3>
            <p className="text-violet-300/80 text-sm">
              {t('mindFuel.lesson.readyMessage', 'Tap below to receive your daily mental mastery content.')}
            </p>
          </div>
        )}

        {/* Action button */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-xs text-violet-400/60">
            {stats && (
              <>
                {stats.viewedLessons} / {stats.totalLessons} {t('mindFuel.lesson.explored', 'explored')}
              </>
            )}
          </div>
          <Button
            onClick={onGetNewLesson}
            className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-0"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('mindFuel.lesson.getNew', 'Get New Fuel')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
