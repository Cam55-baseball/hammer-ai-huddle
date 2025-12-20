import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Heart, Sparkles, Star, Trophy, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Exercise {
  id: string;
  titleKey: string;
  descriptionKey: string;
  duration: string;
  completed: boolean;
}

export default function SelfBeliefExercises() {
  const { t } = useTranslation();
  const [exercises, setExercises] = useState<Exercise[]>([
    {
      id: 'strengths',
      titleKey: 'mentalWellness.resilience.selfBelief.exercises.strengths.title',
      descriptionKey: 'mentalWellness.resilience.selfBelief.exercises.strengths.desc',
      duration: '5 min',
      completed: false
    },
    {
      id: 'wins',
      titleKey: 'mentalWellness.resilience.selfBelief.exercises.wins.title',
      descriptionKey: 'mentalWellness.resilience.selfBelief.exercises.wins.desc',
      duration: '3 min',
      completed: false
    },
    {
      id: 'affirmations',
      titleKey: 'mentalWellness.resilience.selfBelief.exercises.affirmations.title',
      descriptionKey: 'mentalWellness.resilience.selfBelief.exercises.affirmations.desc',
      duration: '2 min',
      completed: false
    },
    {
      id: 'visualization',
      titleKey: 'mentalWellness.resilience.selfBelief.exercises.visualization.title',
      descriptionKey: 'mentalWellness.resilience.selfBelief.exercises.visualization.desc',
      duration: '5 min',
      completed: false
    },
    {
      id: 'comfort',
      titleKey: 'mentalWellness.resilience.selfBelief.exercises.comfort.title',
      descriptionKey: 'mentalWellness.resilience.selfBelief.exercises.comfort.desc',
      duration: '10 min',
      completed: false
    }
  ]);

  const [activeExercise, setActiveExercise] = useState<string | null>(null);

  const toggleComplete = (id: string) => {
    setExercises(exercises.map(e => 
      e.id === id ? { ...e, completed: !e.completed } : e
    ));
  };

  const completedCount = exercises.filter(e => e.completed).length;

  const exerciseDetails: Record<string, { steps: string[], affirmations?: string[] }> = {
    strengths: {
      steps: [
        t('mentalWellness.resilience.selfBelief.exercises.strengths.step1', 'List 5 things you\'re naturally good at'),
        t('mentalWellness.resilience.selfBelief.exercises.strengths.step2', 'For each, recall a time you used this strength'),
        t('mentalWellness.resilience.selfBelief.exercises.strengths.step3', 'Write how these strengths help you in sports'),
        t('mentalWellness.resilience.selfBelief.exercises.strengths.step4', 'Read your list aloud with conviction')
      ]
    },
    wins: {
      steps: [
        t('mentalWellness.resilience.selfBelief.exercises.wins.step1', 'Think of 3 recent wins (big or small)'),
        t('mentalWellness.resilience.selfBelief.exercises.wins.step2', 'Describe what YOU did to make it happen'),
        t('mentalWellness.resilience.selfBelief.exercises.wins.step3', 'Feel the pride of those accomplishments'),
        t('mentalWellness.resilience.selfBelief.exercises.wins.step4', 'Say "I earned this through my effort"')
      ]
    },
    affirmations: {
      steps: [
        t('mentalWellness.resilience.selfBelief.exercises.affirmations.step1', 'Stand tall with good posture'),
        t('mentalWellness.resilience.selfBelief.exercises.affirmations.step2', 'Look at yourself in a mirror if possible'),
        t('mentalWellness.resilience.selfBelief.exercises.affirmations.step3', 'Repeat each affirmation 3 times'),
        t('mentalWellness.resilience.selfBelief.exercises.affirmations.step4', 'Feel the words as you say them')
      ],
      affirmations: [
        t('mentalWellness.resilience.selfBelief.affirmations.1', 'I am capable of achieving my goals'),
        t('mentalWellness.resilience.selfBelief.affirmations.2', 'I trust my training and preparation'),
        t('mentalWellness.resilience.selfBelief.affirmations.3', 'I belong here and deserve success'),
        t('mentalWellness.resilience.selfBelief.affirmations.4', 'I grow stronger with every challenge')
      ]
    },
    visualization: {
      steps: [
        t('mentalWellness.resilience.selfBelief.exercises.visualization.step1', 'Close your eyes and take 3 deep breaths'),
        t('mentalWellness.resilience.selfBelief.exercises.visualization.step2', 'Picture yourself performing at your best'),
        t('mentalWellness.resilience.selfBelief.exercises.visualization.step3', 'See the details: environment, sounds, feelings'),
        t('mentalWellness.resilience.selfBelief.exercises.visualization.step4', 'Feel the confidence flowing through you'),
        t('mentalWellness.resilience.selfBelief.exercises.visualization.step5', 'Hold this image for 2-3 minutes')
      ]
    },
    comfort: {
      steps: [
        t('mentalWellness.resilience.selfBelief.exercises.comfort.step1', 'Identify one small thing outside your comfort zone'),
        t('mentalWellness.resilience.selfBelief.exercises.comfort.step2', 'It could be speaking up, trying a new drill, etc.'),
        t('mentalWellness.resilience.selfBelief.exercises.comfort.step3', 'Commit to doing it today or tomorrow'),
        t('mentalWellness.resilience.selfBelief.exercises.comfort.step4', 'After completing, acknowledge your courage')
      ]
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-wellness-lavender/20 to-wellness-coral/20 border-wellness-lavender/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5 text-wellness-lavender" />
            {t('mentalWellness.resilience.selfBelief.title', 'Self-Belief Exercises')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.resilience.selfBelief.intro', 'Build unshakeable self-belief through these powerful exercises.')}
          </p>
          
          {completedCount > 0 && (
            <div className="mt-4 flex items-center gap-2 text-wellness-sage">
              <Trophy className="h-4 w-4" />
              <span className="text-sm font-medium">
                {completedCount}/{exercises.length} {t('mentalWellness.resilience.selfBelief.completed', 'completed')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercises list */}
      <div className="space-y-3">
        {exercises.map((exercise) => (
          <Card 
            key={exercise.id}
            className={cn(
              "transition-all duration-300",
              exercise.completed && "bg-wellness-sage/10 border-wellness-sage/30",
              activeExercise === exercise.id && "ring-2 ring-wellness-lavender"
            )}
          >
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={exercise.completed}
                  onCheckedChange={() => toggleComplete(exercise.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={cn(
                      "font-medium",
                      exercise.completed && "line-through text-muted-foreground"
                    )}>
                      {t(exercise.titleKey, exercise.id)}
                    </h3>
                    <span className="text-xs text-muted-foreground">{exercise.duration}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t(exercise.descriptionKey, 'Complete this exercise')}
                  </p>
                  
                  {activeExercise !== exercise.id ? (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setActiveExercise(exercise.id)}
                      className="mt-2 text-wellness-lavender hover:text-wellness-lavender/80"
                    >
                      {t('mentalWellness.resilience.selfBelief.startExercise', 'Start Exercise')}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <div className="mt-4 p-4 bg-wellness-cream/50 rounded-lg space-y-3">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-wellness-lavender" />
                        {t('mentalWellness.resilience.selfBelief.steps', 'Steps')}
                      </h4>
                      <ol className="space-y-2">
                        {exerciseDetails[exercise.id]?.steps.map((step, i) => (
                          <li key={i} className="flex gap-2 text-sm">
                            <span className="font-medium text-wellness-lavender">{i + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>

                      {exerciseDetails[exercise.id]?.affirmations && (
                        <div className="mt-4 pt-4 border-t space-y-2">
                          <h5 className="text-sm font-medium flex items-center gap-2">
                            <Star className="h-4 w-4 text-wellness-coral" />
                            {t('mentalWellness.resilience.selfBelief.affirmationsTitle', 'Affirmations')}
                          </h5>
                          {exerciseDetails[exercise.id].affirmations?.map((aff, i) => (
                            <p key={i} className="text-sm italic text-muted-foreground pl-4 border-l-2 border-wellness-coral/30">
                              "{aff}"
                            </p>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setActiveExercise(null)}
                        >
                          {t('common.close', 'Close')}
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {
                            toggleComplete(exercise.id);
                            setActiveExercise(null);
                          }}
                          className="bg-wellness-sage hover:bg-wellness-sage/90"
                        >
                          {t('mentalWellness.resilience.selfBelief.markComplete', 'Mark Complete')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
