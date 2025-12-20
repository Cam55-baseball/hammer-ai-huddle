import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Baby, Heart, MessageCircle, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';

interface Exercise {
  id: string;
  title: string;
  description: string;
  prompt: string;
  affirmation: string;
}

const exercises: Exercise[] = [
  {
    id: 'letter',
    title: 'Letter to Your Younger Self',
    description: 'Write a compassionate letter to yourself as a child',
    prompt: 'Think of yourself at age 8-10. What did that child need to hear? What reassurance, love, or wisdom would have helped them?',
    affirmation: 'You were always enough, exactly as you were.',
  },
  {
    id: 'needs',
    title: 'Unmet Needs',
    description: 'Identify and honor needs that weren\'t met',
    prompt: 'What did you need as a child that you didn\'t receive? How can you give that to yourself now as an adult?',
    affirmation: 'It\'s never too late to give yourself what you needed.',
  },
  {
    id: 'joy',
    title: 'Reconnect with Joy',
    description: 'Remember what brought you pure happiness',
    prompt: 'What activities made you lose track of time as a child? What made you feel free and alive? How can you bring more of that into your life now?',
    affirmation: 'Your inner child\'s joy is still alive within you.',
  },
  {
    id: 'protection',
    title: 'Be Your Own Protector',
    description: 'Step into the role of protector for your younger self',
    prompt: 'If you could go back and protect your younger self from something difficult, what would you say or do? How can you protect yourself now?',
    affirmation: 'You are safe. You are protected. You are loved.',
  },
];

export default function InnerChildWork() {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});

  const currentExercise = exercises[currentIndex];

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const updateResponse = (text: string) => {
    setResponses({ ...responses, [currentExercise.id]: text });
  };

  return (
    <div className="space-y-4">
      {/* Introduction Card */}
      <Card className="bg-gradient-to-br from-wellness-rose/10 to-wellness-lavender/10 border-wellness-rose/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-wellness-rose/20">
              <Baby className="h-5 w-5 text-wellness-rose" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">
                {t('mentalWellness.healing.innerChild.title', 'Inner Child Work')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('mentalWellness.healing.innerChild.intro', 'Inner child work helps you heal old wounds by connecting with and nurturing the child within you. These exercises promote self-compassion and emotional healing.')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercise Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-wellness-lavender" />
              {currentExercise.title}
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {exercises.length}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{currentExercise.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prompt */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-2">
              <MessageCircle className="h-4 w-4 text-wellness-lavender mt-0.5 flex-shrink-0" />
              <p className="text-sm leading-relaxed">{currentExercise.prompt}</p>
            </div>
          </div>

          {/* Response Area */}
          <Textarea
            value={responses[currentExercise.id] || ''}
            onChange={(e) => updateResponse(e.target.value)}
            placeholder={t('mentalWellness.healing.innerChild.placeholder', 'Take your time. Write from the heart...')}
            className="min-h-[120px] resize-none"
          />

          {/* Affirmation */}
          <div className="p-3 rounded-lg bg-wellness-rose/10 border border-wellness-rose/20">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-wellness-rose" />
              <p className="text-sm font-medium text-wellness-rose">
                {currentExercise.affirmation}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('common.previous', 'Previous')}
            </Button>
            <Button
              onClick={handleNext}
              disabled={currentIndex === exercises.length - 1}
              className="bg-wellness-lavender hover:bg-wellness-lavender/90"
            >
              {t('common.next', 'Next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Exercise Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {exercises.map((exercise, index) => (
          <button
            key={exercise.id}
            onClick={() => setCurrentIndex(index)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              index === currentIndex
                ? 'border-wellness-lavender bg-wellness-lavender/10'
                : 'border-border hover:bg-muted/50'
            }`}
          >
            <p className="text-xs font-medium line-clamp-1">{exercise.title}</p>
            {responses[exercise.id] && (
              <p className="text-xs text-wellness-sage mt-1">✓ Written</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
