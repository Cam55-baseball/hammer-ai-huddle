import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Moon, Sun, Clock, Brain, Zap, Check, AlertTriangle } from 'lucide-react';
import { useMindFuelEducationProgress } from '@/hooks/useMindFuelEducationProgress';

const sleepTips: SleepTip[] = [
  {
    id: 'schedule',
    title: 'Consistent Schedule',
    description: 'Go to bed and wake up at the same time every day, even on weekends. This reinforces your body\'s natural sleep-wake cycle.',
    icon: Clock,
  },
  {
    id: 'environment',
    title: 'Optimize Your Environment',
    description: 'Keep your bedroom cool (65-68°F), dark, and quiet. Use blackout curtains and consider white noise if needed.',
    icon: Moon,
  },
  {
    id: 'screens',
    title: 'Limit Screen Time',
    description: 'Avoid screens 1 hour before bed. Blue light suppresses melatonin production and signals your brain to stay awake.',
    icon: Sun,
  },
  {
    id: 'wind-down',
    title: 'Create a Wind-Down Routine',
    description: 'Spend 30-60 minutes relaxing before bed. Read, stretch, or practice relaxation techniques.',
    icon: Brain,
  },
  {
    id: 'caffeine',
    title: 'Watch Caffeine Intake',
    description: 'Avoid caffeine after 2 PM. It can stay in your system for 8+ hours and disrupt sleep quality.',
    icon: Zap,
  },
];

const sleepFacts = [
  'Athletes who get 8+ hours of sleep have 70% fewer injuries',
  'Sleep deprivation impairs reaction time similar to alcohol intoxication',
  'Your brain consolidates learning and memories during sleep',
  'Growth hormone is primarily released during deep sleep',
  'Poor sleep increases stress hormones and inflammation',
];

interface SleepTip {
  id: string;
  title: string;
  description: string;
  icon: typeof Moon;
}

export default function SleepScience() {
  const { t } = useTranslation();
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const { markAsComplete, isItemComplete } = useMindFuelEducationProgress();

  // Mark sleep section as complete when component mounts
  useEffect(() => {
    if (!isItemComplete('sleep', 'sleep-science')) {
      markAsComplete('sleep', 'sleep-science');
    }
  }, [markAsComplete, isItemComplete]);

  return (
    <div className="space-y-4">
      {/* Introduction */}
      <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-indigo-500" />
            {t('mentalWellness.education.sleep.title', 'Sleep & Mental Health')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.education.sleep.intro', 'Sleep is the foundation of mental and physical performance. Quality sleep improves mood, focus, recovery, and resilience. For athletes, it\'s as important as training.')}
          </p>
        </CardContent>
      </Card>

      {/* Sleep Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('mentalWellness.education.sleep.requirements', 'How Much Sleep Do You Need?')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-wellness-sky">7-9</p>
              <p className="text-xs text-muted-foreground">hours for adults</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-wellness-sage">8-10</p>
              <p className="text-xs text-muted-foreground">hours for teens</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-2xl font-bold text-wellness-lavender">9-10+</p>
              <p className="text-xs text-muted-foreground">hours for athletes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sleep Hygiene Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('mentalWellness.education.sleep.hygiene', 'Sleep Hygiene Tips')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sleepTips.map((tip) => {
            const Icon = tip.icon;
            const isActive = activeTip === tip.id;

            return (
              <div
                key={tip.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isActive ? 'border-wellness-sky bg-wellness-sky/5' : 'border-border hover:bg-muted/50'
                }`}
                onClick={() => setActiveTip(isActive ? null : tip.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${isActive ? 'bg-wellness-sky/20' : 'bg-muted'}`}>
                    <Icon className={`h-4 w-4 ${isActive ? 'text-wellness-sky' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{tip.title}</h4>
                    {isActive && (
                      <p className="text-sm text-muted-foreground mt-1 animate-in fade-in duration-200">
                        {tip.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Sleep Facts for Athletes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-wellness-sage" />
            {t('mentalWellness.education.sleep.athleteFacts', 'Sleep Facts for Athletes')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {sleepFacts.map((fact, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-wellness-sage flex-shrink-0 mt-0.5" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Warning Signs */}
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                {t('mentalWellness.education.sleep.warning', 'Signs of Sleep Problems')}
              </h4>
              <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                <li>• Taking more than 30 minutes to fall asleep regularly</li>
                <li>• Waking up multiple times during the night</li>
                <li>• Feeling tired despite adequate sleep time</li>
                <li>• Relying on caffeine to get through the day</li>
              </ul>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                If you experience persistent sleep issues, consider consulting a healthcare provider.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
