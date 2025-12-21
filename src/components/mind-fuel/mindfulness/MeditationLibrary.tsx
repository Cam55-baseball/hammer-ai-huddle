import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Headphones, Play, Pause, Clock, CheckCircle2, RotateCcw, Sparkles, Brain, Heart, Zap, Moon, Target } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type MeditationCategory = 'focus' | 'calm' | 'sleep' | 'energy';
type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

interface MeditationSession {
  id: string;
  duration: number;
  category: MeditationCategory;
  level: DifficultyLevel;
  technique: string;
  promptCount: number;
}

const meditations: MeditationSession[] = [
  // Focus Category (6 sessions)
  { id: 'focus-2', duration: 120, category: 'focus', level: 'beginner', technique: 'breathCounting', promptCount: 5 },
  { id: 'focus-3', duration: 180, category: 'focus', level: 'beginner', technique: 'attentionAnchoring', promptCount: 5 },
  { id: 'focus-5', duration: 300, category: 'focus', level: 'intermediate', technique: 'visualizationBoxBreathing', promptCount: 6 },
  { id: 'focus-7', duration: 420, category: 'focus', level: 'intermediate', technique: 'flowStateInduction', promptCount: 7 },
  { id: 'focus-15', duration: 900, category: 'focus', level: 'advanced', technique: 'mentalRehearsal', promptCount: 8 },
  { id: 'focus-20', duration: 1200, category: 'focus', level: 'advanced', technique: 'comprehensiveMentalTraining', promptCount: 10 },
  
  // Calm Category (4 sessions)
  { id: 'calm-3', duration: 180, category: 'calm', level: 'beginner', technique: 'muscleRelease', promptCount: 5 },
  { id: 'calm-5', duration: 300, category: 'calm', level: 'intermediate', technique: 'fourSevenEight', promptCount: 6 },
  { id: 'calm-7', duration: 420, category: 'calm', level: 'intermediate', technique: 'rhythmicVisualization', promptCount: 7 },
  { id: 'calm-10', duration: 600, category: 'calm', level: 'advanced', technique: 'progressiveRelaxation', promptCount: 8 },
  
  // Energy Category (3 sessions)
  { id: 'energy-3', duration: 180, category: 'energy', level: 'beginner', technique: 'activatingBreath', promptCount: 5 },
  { id: 'energy-5', duration: 300, category: 'energy', level: 'intermediate', technique: 'mentalAwakening', promptCount: 6 },
  { id: 'energy-7', duration: 420, category: 'energy', level: 'intermediate', technique: 'sustainedActivation', promptCount: 7 },
  
  // Sleep Category (3 sessions)
  { id: 'sleep-5', duration: 300, category: 'sleep', level: 'beginner', technique: 'sleepTransition', promptCount: 5 },
  { id: 'sleep-10', duration: 600, category: 'sleep', level: 'intermediate', technique: 'windDown', promptCount: 7 },
  { id: 'sleep-15', duration: 900, category: 'sleep', level: 'advanced', technique: 'deepSleepInduction', promptCount: 8 },
];

const categoryConfig: Record<MeditationCategory, { color: string; bgColor: string; icon: typeof Brain }> = {
  focus: { color: 'text-blue-500', bgColor: 'bg-blue-500', icon: Target },
  calm: { color: 'text-emerald-500', bgColor: 'bg-emerald-500', icon: Heart },
  sleep: { color: 'text-violet-500', bgColor: 'bg-violet-500', icon: Moon },
  energy: { color: 'text-amber-500', bgColor: 'bg-amber-500', icon: Zap },
};

const levelColors: Record<DifficultyLevel, string> = {
  beginner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  advanced: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

export default function MeditationLibrary() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedSession, setSelectedSession] = useState<MeditationSession | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [activeFilter, setActiveFilter] = useState<MeditationCategory | 'all'>('all');
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);

  const filteredMeditations = useMemo(() => {
    if (activeFilter === 'all') return meditations;
    return meditations.filter(m => m.category === activeFilter);
  }, [activeFilter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: meditations.length };
    meditations.forEach(m => {
      counts[m.category] = (counts[m.category] || 0) + 1;
    });
    return counts;
  }, []);

  // Timer effect
  useEffect(() => {
    if (!isPlaying || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsPlaying(false);
          handleSessionComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, timeRemaining]);

  // Rotate prompts during meditation
  useEffect(() => {
    if (!isPlaying || !selectedSession) return;
    
    const promptInterval = setInterval(() => {
      setCurrentPromptIndex(prev => (prev + 1) % selectedSession.promptCount);
    }, 15000); // Change prompt every 15 seconds

    return () => clearInterval(promptInterval);
  }, [isPlaying, selectedSession]);

  const startSession = (session: MeditationSession) => {
    setSelectedSession(session);
    setTimeRemaining(session.duration);
    setMoodBefore(null);
    setIsComplete(false);
    setCurrentPromptIndex(0);
  };

  const togglePlayPause = () => {
    if (!moodBefore) return;
    setIsPlaying(!isPlaying);
  };

  const handleMoodSelect = (mood: number) => {
    setMoodBefore(mood);
    setIsPlaying(true);
  };

  const handleSessionComplete = async () => {
    setIsComplete(true);
    if (user && selectedSession) {
      try {
        await supabase.from('mindfulness_sessions').insert({
          user_id: user.id,
          session_type: 'meditation',
          technique: selectedSession.id,
          duration_seconds: selectedSession.duration,
          completed: true,
          mood_before: moodBefore,
        });
        toast.success(t('mindfulness.meditation.completed'));
      } catch (error) {
        console.error('Error saving meditation session:', error);
      }
    }
  };

  const resetSession = () => {
    setSelectedSession(null);
    setIsPlaying(false);
    setTimeRemaining(0);
    setMoodBefore(null);
    setIsComplete(false);
    setCurrentPromptIndex(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (!selectedSession) return 0;
    return ((selectedSession.duration - timeRemaining) / selectedSession.duration) * 100;
  };

  // Active Session View
  if (selectedSession) {
    const config = categoryConfig[selectedSession.category];
    const CategoryIcon = config.icon;

    return (
      <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/30 overflow-hidden">
        <CardContent className="pt-6 relative">
          {/* Ambient background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className={cn("absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20", config.bgColor)} />
            <div className={cn("absolute -bottom-20 -left-20 w-48 h-48 rounded-full blur-3xl opacity-20", config.bgColor)} />
          </div>

          {/* Pre-session mood check */}
          {!moodBefore && !isComplete && (
            <div className="text-center space-y-6 py-4 relative z-10">
              <div className="space-y-2">
                <Badge className={cn(config.bgColor, 'text-white')}>
                  {t(`mindfulness.meditation.categories.${selectedSession.category}`)}
                </Badge>
                <h3 className="text-xl font-semibold">
                  {t(`mindfulness.meditation.sessions.${selectedSession.id}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {t(`mindfulness.meditation.sessions.${selectedSession.id}.longDesc`)}
                </p>
              </div>
              
              <div className="bg-muted/50 rounded-xl p-4 max-w-sm mx-auto">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-medium">{t('mindfulness.meditation.technique')}</span>
                </div>
                <p className="text-sm">{t(`mindfulness.meditation.techniques.${selectedSession.technique}`)}</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-lg font-medium">
                  {t('mindfulness.meditation.moodCheck')}
                </h4>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((mood) => (
                    <Button
                      key={mood}
                      variant="outline"
                      size="lg"
                      onClick={() => handleMoodSelect(mood)}
                      className="w-12 h-12 text-xl hover:scale-110 transition-transform"
                    >
                      {['😔', '😕', '😐', '🙂', '😊'][mood - 1]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active meditation */}
          {moodBefore && !isComplete && (
            <div className="text-center space-y-6 py-4 relative z-10">
              <div className="flex items-center justify-center gap-2">
                <Badge className={cn(config.bgColor, 'text-white')}>
                  <CategoryIcon className="h-3 w-3 mr-1" />
                  {t(`mindfulness.meditation.categories.${selectedSession.category}`)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {t(`mindfulness.meditation.techniques.${selectedSession.technique}`)}
                </Badge>
              </div>
              
              <h3 className="text-xl font-semibold">
                {t(`mindfulness.meditation.sessions.${selectedSession.id}.title`)}
              </h3>

              {/* Timer Circle */}
              <div className="relative w-52 h-52 mx-auto">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="104"
                    cy="104"
                    r="96"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="104"
                    cy="104"
                    r="96"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    className={config.color}
                    strokeDasharray={603}
                    strokeDashoffset={603 - (603 * getProgress()) / 100}
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-mono font-bold">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>

              {/* Guided Prompt */}
              <div className="min-h-[80px] flex items-center justify-center px-4">
                <p className="text-base italic text-muted-foreground max-w-md animate-fade-in">
                  "{t(`mindfulness.meditation.sessions.${selectedSession.id}.prompts.${currentPromptIndex}`)}"
                </p>
              </div>

              {/* Breathing indicator */}
              {isPlaying && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", config.bgColor)} />
                  {t('mindfulness.meditation.breathe')}
                </div>
              )}

              {!isPlaying && (
                <p className="text-sm text-muted-foreground">
                  {t('mindfulness.meditation.paused')}
                </p>
              )}

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={togglePlayPause}
                  size="lg"
                  className={cn(
                    'w-16 h-16 rounded-full transition-all hover:scale-105',
                    isPlaying ? config.bgColor : 'bg-primary'
                  )}
                >
                  {isPlaying ? (
                    <Pause className="h-8 w-8" />
                  ) : (
                    <Play className="h-8 w-8 ml-1" />
                  )}
                </Button>
              </div>

              <Button variant="ghost" size="sm" onClick={resetSession}>
                {t('common.cancel')}
              </Button>
            </div>
          )}

          {/* Completion */}
          {isComplete && (
            <div className="text-center space-y-6 py-4 relative z-10">
              <div className="relative">
                <CheckCircle2 className="h-20 w-20 mx-auto text-emerald-500" />
                <Sparkles className="h-6 w-6 absolute top-0 right-1/3 text-amber-400 animate-pulse" />
              </div>
              <h3 className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {t('mindfulness.meditation.wellDone')}
              </h3>
              <p className="text-muted-foreground">
                {t('mindfulness.meditation.completedSession', {
                  title: t(`mindfulness.meditation.sessions.${selectedSession.id}.title`),
                })}
              </p>
              
              {/* Reflection prompt */}
              <div className="bg-muted/50 rounded-xl p-4 max-w-sm mx-auto">
                <p className="text-sm text-muted-foreground italic">
                  {t('mindfulness.meditation.reflectionPrompt')}
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <Button onClick={resetSession} variant="outline" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {t('mindfulness.meditation.chooseAnother')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Library View
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Headphones className="h-5 w-5 text-primary" />
          {t('mindfulness.meditation.title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('mindfulness.meditation.subtitle')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Filters */}
        <div className="flex gap-2 flex-wrap">
          <Badge 
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer transition-all hover:scale-105"
            onClick={() => setActiveFilter('all')}
          >
            {t('mindfulness.meditation.filterAll')} ({categoryCounts.all})
          </Badge>
          {(['focus', 'calm', 'energy', 'sleep'] as MeditationCategory[]).map((cat) => {
            const config = categoryConfig[cat];
            const Icon = config.icon;
            return (
              <Badge 
                key={cat} 
                variant={activeFilter === cat ? 'default' : 'outline'}
                className={cn(
                  "cursor-pointer transition-all hover:scale-105 gap-1",
                  activeFilter === cat && config.bgColor
                )}
                onClick={() => setActiveFilter(cat)}
              >
                <Icon className="h-3 w-3" />
                {t(`mindfulness.meditation.categories.${cat}`)} ({categoryCounts[cat] || 0})
              </Badge>
            );
          })}
        </div>

        {/* Session List */}
        <div className="grid gap-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredMeditations.map((session) => {
            const config = categoryConfig[session.category];
            const Icon = config.icon;
            
            return (
              <div
                key={session.id}
                onClick={() => startSession(session)}
                className="group p-4 border rounded-xl hover:bg-muted/50 cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
              >
                <div className="flex items-start gap-4">
                  <div className={cn('p-2 rounded-lg', config.bgColor, 'bg-opacity-20')}>
                    <Icon className={cn('h-5 w-5', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">
                        {t(`mindfulness.meditation.sessions.${session.id}.title`)}
                      </h4>
                      <Badge variant="secondary" className={cn('text-xs shrink-0', levelColors[session.level])}>
                        {t(`mindfulness.meditation.levels.${session.level}`)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {t(`mindfulness.meditation.sessions.${session.id}.desc`)}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.floor(session.duration / 60)} {t('common.min', 'min')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Brain className="h-3 w-3" />
                        {t(`mindfulness.meditation.techniques.${session.technique}`)}
                      </span>
                    </div>
                    <p className="text-xs text-primary/80 mt-2 flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {t('mindfulness.meditation.bestFor')}: {t(`mindfulness.meditation.sessions.${session.id}.benefitFor`)}
                    </p>
                  </div>
                  <Play className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
