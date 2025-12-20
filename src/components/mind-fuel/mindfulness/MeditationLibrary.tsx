import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Headphones, Play, Pause, Clock, CheckCircle2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MeditationSession {
  id: string;
  title: string;
  duration: number; // in seconds
  description: string;
  category: 'focus' | 'calm' | 'sleep' | 'energy';
}

const meditations: MeditationSession[] = [
  { id: 'focus-2', title: 'Quick Focus', duration: 120, description: 'Brief mental reset', category: 'focus' },
  { id: 'calm-5', title: 'Calming Breath', duration: 300, description: 'Reduce anxiety', category: 'calm' },
  { id: 'focus-5', title: 'Pre-Game Focus', duration: 300, description: 'Mental preparation', category: 'focus' },
  { id: 'energy-5', title: 'Energy Boost', duration: 300, description: 'Wake up your mind', category: 'energy' },
  { id: 'calm-10', title: 'Deep Relaxation', duration: 600, description: 'Full body calm', category: 'calm' },
  { id: 'sleep-10', title: 'Sleep Prep', duration: 600, description: 'Wind down routine', category: 'sleep' },
  { id: 'focus-15', title: 'Visualization', duration: 900, description: 'Mental rehearsal', category: 'focus' },
];

const categoryColors: Record<string, string> = {
  focus: 'bg-blue-500',
  calm: 'bg-green-500',
  sleep: 'bg-purple-500',
  energy: 'bg-orange-500',
};

export default function MeditationLibrary() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedSession, setSelectedSession] = useState<MeditationSession | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [isComplete, setIsComplete] = useState(false);

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

  const startSession = (session: MeditationSession) => {
    setSelectedSession(session);
    setTimeRemaining(session.duration);
    setMoodBefore(null);
    setIsComplete(false);
  };

  const togglePlayPause = () => {
    if (!moodBefore) {
      // Ask for mood before starting
      return;
    }
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
        toast.success(t('mindfulness.meditation.completed', 'Session completed!'));
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
    return (
      <Card className="border-wellness-sky/30 bg-gradient-to-br from-wellness-cream to-white">
        <CardContent className="pt-6">
          {/* Pre-session mood check */}
          {!moodBefore && !isComplete && (
            <div className="text-center space-y-6 py-4">
              <h3 className="text-lg font-medium">
                {t('mindfulness.meditation.moodCheck', 'How are you feeling right now?')}
              </h3>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((mood) => (
                  <Button
                    key={mood}
                    variant="outline"
                    size="lg"
                    onClick={() => handleMoodSelect(mood)}
                    className="w-12 h-12 text-xl"
                  >
                    {['😔', '😕', '😐', '🙂', '😊'][mood - 1]}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Active meditation */}
          {moodBefore && !isComplete && (
            <div className="text-center space-y-6 py-4">
              <Badge className={cn(categoryColors[selectedSession.category], 'text-white')}>
                {t(`mindfulness.meditation.categories.${selectedSession.category}`, selectedSession.category)}
              </Badge>
              
              <h3 className="text-xl font-semibold">
                {t(`mindfulness.meditation.sessions.${selectedSession.id}.title`, selectedSession.title)}
              </h3>

              {/* Timer Circle */}
              <div className="relative w-48 h-48 mx-auto">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    className="text-wellness-sky"
                    strokeDasharray={553}
                    strokeDashoffset={553 - (553 * getProgress()) / 100}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-mono font-bold">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                {isPlaying
                  ? t('mindfulness.meditation.breathe', 'Breathe deeply and relax...')
                  : t('mindfulness.meditation.paused', 'Session paused')}
              </p>

              <div className="flex gap-3 justify-center">
                <Button
                  onClick={togglePlayPause}
                  size="lg"
                  className={cn(
                    'w-16 h-16 rounded-full',
                    isPlaying ? 'bg-wellness-sky' : 'bg-wellness-sage'
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
                {t('common.cancel', 'Cancel')}
              </Button>
            </div>
          )}

          {/* Completion */}
          {isComplete && (
            <div className="text-center space-y-6 py-4">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
              <h3 className="text-xl font-semibold text-green-700">
                {t('mindfulness.meditation.wellDone', 'Well Done!')}
              </h3>
              <p className="text-muted-foreground">
                {t('mindfulness.meditation.completedSession', 'You completed {{title}}', {
                  title: selectedSession.title,
                })}
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={resetSession} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t('mindfulness.meditation.chooseAnother', 'Choose Another')}
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
    <Card className="border-wellness-sky/30 bg-gradient-to-br from-wellness-cream to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Headphones className="h-5 w-5 text-wellness-sky" />
          {t('mindfulness.meditation.title', 'Meditation Library')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Filters */}
        <div className="flex gap-2 flex-wrap">
          {['focus', 'calm', 'sleep', 'energy'].map((cat) => (
            <Badge key={cat} variant="outline" className="cursor-pointer">
              {t(`mindfulness.meditation.categories.${cat}`, cat.charAt(0).toUpperCase() + cat.slice(1))}
            </Badge>
          ))}
        </div>

        {/* Session List */}
        <div className="grid gap-3">
          {meditations.map((session) => (
            <div
              key={session.id}
              onClick={() => startSession(session)}
              className="p-4 border rounded-xl hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-4"
            >
              <div className={cn('w-2 h-12 rounded-full', categoryColors[session.category])} />
              <div className="flex-1">
                <h4 className="font-medium">
                  {t(`mindfulness.meditation.sessions.${session.id}.title`, session.title)}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t(`mindfulness.meditation.sessions.${session.id}.desc`, session.description)}
                </p>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {Math.floor(session.duration / 60)} {t('common.min', 'min')}
              </div>
              <Play className="h-5 w-5 text-muted-foreground" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
