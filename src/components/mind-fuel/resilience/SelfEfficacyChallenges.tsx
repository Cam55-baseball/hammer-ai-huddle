import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Flame, Trophy, Star, ArrowRight, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Challenge {
  id: string;
  level: number;
  title: string;
  description: string;
  completed: boolean;
  locked: boolean;
}

export default function SelfEfficacyChallenges() {
  const { t } = useTranslation();
  const [challenges, setChallenges] = useState<Challenge[]>([
    {
      id: '1',
      level: 1,
      title: t('mentalWellness.resilience.efficacy.challenges.1.title', 'Positive Self-Talk'),
      description: t('mentalWellness.resilience.efficacy.challenges.1.desc', 'Replace one negative thought with a positive one today'),
      completed: false,
      locked: false
    },
    {
      id: '2',
      level: 1,
      title: t('mentalWellness.resilience.efficacy.challenges.2.title', 'Small Win Recognition'),
      description: t('mentalWellness.resilience.efficacy.challenges.2.desc', 'Write down 3 small wins from today'),
      completed: false,
      locked: false
    },
    {
      id: '3',
      level: 2,
      title: t('mentalWellness.resilience.efficacy.challenges.3.title', 'Comfort Zone Push'),
      description: t('mentalWellness.resilience.efficacy.challenges.3.desc', 'Try something new in practice that challenges you'),
      completed: false,
      locked: true
    },
    {
      id: '4',
      level: 2,
      title: t('mentalWellness.resilience.efficacy.challenges.4.title', 'Public Commitment'),
      description: t('mentalWellness.resilience.efficacy.challenges.4.desc', 'Share a goal with a teammate or coach'),
      completed: false,
      locked: true
    },
    {
      id: '5',
      level: 3,
      title: t('mentalWellness.resilience.efficacy.challenges.5.title', 'Lead by Example'),
      description: t('mentalWellness.resilience.efficacy.challenges.5.desc', 'Be the first to volunteer for a difficult drill'),
      completed: false,
      locked: true
    },
    {
      id: '6',
      level: 3,
      title: t('mentalWellness.resilience.efficacy.challenges.6.title', 'Embrace Failure'),
      description: t('mentalWellness.resilience.efficacy.challenges.6.desc', 'Intentionally try something hard and embrace the struggle'),
      completed: false,
      locked: true
    },
    {
      id: '7',
      level: 4,
      title: t('mentalWellness.resilience.efficacy.challenges.7.title', 'Pressure Simulation'),
      description: t('mentalWellness.resilience.efficacy.challenges.7.desc', 'Create a high-pressure practice scenario and perform'),
      completed: false,
      locked: true
    },
    {
      id: '8',
      level: 4,
      title: t('mentalWellness.resilience.efficacy.challenges.8.title', 'Mentor Someone'),
      description: t('mentalWellness.resilience.efficacy.challenges.8.desc', 'Help a younger or less experienced teammate'),
      completed: false,
      locked: true
    }
  ]);

  const toggleChallenge = (id: string) => {
    setChallenges(prev => {
      const updated = prev.map(c => 
        c.id === id ? { ...c, completed: !c.completed } : c
      );
      
      // Check if level is complete and unlock next
      const levels = [1, 2, 3, 4];
      levels.forEach(level => {
        const levelChallenges = updated.filter(c => c.level === level);
        const allComplete = levelChallenges.every(c => c.completed);
        
        if (allComplete && level < 4) {
          // Unlock next level
          return updated.map(c => 
            c.level === level + 1 ? { ...c, locked: false } : c
          );
        }
      });
      
      // Unlock next level if current level complete
      const currentLevel = prev.find(c => c.id === id)?.level || 1;
      const levelChallenges = updated.filter(c => c.level === currentLevel);
      const allComplete = levelChallenges.every(c => c.completed);
      
      if (allComplete && currentLevel < 4) {
        return updated.map(c => 
          c.level === currentLevel + 1 ? { ...c, locked: false } : c
        );
      }
      
      return updated;
    });
  };

  const completedCount = challenges.filter(c => c.completed).length;
  const currentLevel = Math.floor(completedCount / 2) + 1;

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'wellness-sage';
      case 2: return 'wellness-sky';
      case 3: return 'wellness-lavender';
      case 4: return 'wellness-coral';
      default: return 'wellness-sage';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-wellness-coral/20 to-wellness-lavender/20 border-wellness-coral/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5 text-wellness-coral" />
            {t('mentalWellness.resilience.efficacy.title', 'Self-Efficacy Challenges')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.resilience.efficacy.intro', 'Build confidence through progressive challenges. Complete each level to unlock harder challenges.')}
          </p>
          
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-wellness-sage" />
              <span className="text-sm font-medium">{completedCount}/{challenges.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-wellness-coral" />
              <span className="text-sm font-medium">
                {t('mentalWellness.resilience.efficacy.level', 'Level')} {Math.min(currentLevel, 4)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Challenges by level */}
      {[1, 2, 3, 4].map(level => {
        const levelChallenges = challenges.filter(c => c.level === level);
        const levelComplete = levelChallenges.every(c => c.completed);
        const levelLocked = levelChallenges.every(c => c.locked);
        const color = getLevelColor(level);
        
        return (
          <div key={level} className="space-y-3">
            <div className="flex items-center gap-2">
              <div 
                className={`h-6 w-6 rounded-full flex items-center justify-center ${
                  levelComplete ? `bg-${color}` : levelLocked ? 'bg-muted' : `bg-${color}/20`
                }`}
                style={levelComplete ? { backgroundColor: `hsl(var(--${color}))` } : 
                       !levelLocked ? { backgroundColor: `hsl(var(--${color}) / 0.2)` } : undefined}
              >
                {levelLocked ? (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                ) : levelComplete ? (
                  <Star className="h-3 w-3 text-white" />
                ) : (
                  <span className="text-xs font-bold" style={{ color: `hsl(var(--${color}))` }}>{level}</span>
                )}
              </div>
              <h3 className={cn(
                "text-sm font-medium",
                levelLocked && "text-muted-foreground"
              )}>
                {t(`mentalWellness.resilience.efficacy.levels.${level}`, `Level ${level}`)}
              </h3>
              {levelComplete && (
                <span className="text-xs text-wellness-sage font-medium ml-auto">
                  {t('common.complete', 'Complete')}!
                </span>
              )}
            </div>
            
            <div className="space-y-2 pl-8">
              {levelChallenges.map(challenge => (
                <Card 
                  key={challenge.id}
                  className={cn(
                    "transition-all duration-300",
                    challenge.locked && "opacity-60",
                    challenge.completed && "bg-wellness-sage/10 border-wellness-sage/30"
                  )}
                >
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={challenge.completed}
                        onCheckedChange={() => toggleChallenge(challenge.id)}
                        disabled={challenge.locked}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={cn(
                            "text-sm font-medium",
                            challenge.completed && "line-through text-muted-foreground"
                          )}>
                            {challenge.title}
                          </h4>
                          {challenge.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {challenge.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* Unlock message */}
      {completedCount > 0 && completedCount < challenges.length && (
        <Card className="bg-wellness-cream/50 border-wellness-lavender/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Unlock className="h-5 w-5 text-wellness-lavender" />
              <p className="text-sm">
                {t('mentalWellness.resilience.efficacy.unlockHint', 'Complete all challenges in a level to unlock the next one!')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
