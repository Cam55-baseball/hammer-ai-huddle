import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, RefreshCw, Trophy, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ConfettiEffect } from './ConfettiEffect';
import { createRoot } from 'react-dom/client';

interface QuizQuestion {
  questionKey: string;
  options: string[];
  correctIndex: number;
}

interface SectionQuizProps {
  sectionId: string;
  questions: QuizQuestion[];
  onPass: (sectionId: string) => void;
  isPassed?: boolean;
}

function triggerQuizConfetti() {
  const container = document.createElement("div");
  container.id = "quiz-confetti-container";
  document.body.appendChild(container);
  
  const root = createRoot(container);
  root.render(<ConfettiEffect />);
  
  setTimeout(() => {
    root.unmount();
    container.remove();
  }, 5000);
}

export function SectionQuiz({ sectionId, questions, onPass, isPassed = false }: SectionQuizProps) {
  const { t } = useTranslation();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isStarted, setIsStarted] = useState(false);

  const handleSelectAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
      checkResults();
    }
  };

  const checkResults = () => {
    const correctCount = questions.reduce((count, q, idx) => {
      return count + (selectedAnswers[idx] === q.correctIndex ? 1 : 0);
    }, 0);
    const percentage = Math.round((correctCount / questions.length) * 100);
    
    if (percentage >= 70) {
      // Trigger celebration
      triggerQuizConfetti();
      toast.success(t('bounceBackBay.quiz.passed'), {
        description: t('bounceBackBay.quiz.passedDescription', { score: percentage }),
        duration: 4000,
      });
      onPass(sectionId);
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setShowResults(false);
  };

  const correctCount = questions.reduce((count, q, idx) => {
    return count + (selectedAnswers[idx] === q.correctIndex ? 1 : 0);
  }, 0);
  const percentage = Math.round((correctCount / questions.length) * 100);
  const passed = percentage >= 70;

  if (isPassed) {
    return (
      <Card className="mt-4 border-green-500/30 bg-green-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="font-medium text-green-700 dark:text-green-400">
              {t('bounceBackBay.quiz.alreadyPassed')}
            </span>
            <Badge variant="secondary" className="ml-auto bg-green-500/20 text-green-700 dark:text-green-400">
              <Trophy className="h-3 w-3 mr-1" />
              {t('bounceBackBay.quiz.completed')}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isStarted) {
    return (
      <Card className="mt-4 border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-medium text-primary">{t('bounceBackBay.quiz.title')}</h4>
              <p className="text-sm text-muted-foreground">
                {t('bounceBackBay.quiz.description', { count: questions.length })}
              </p>
            </div>
            <Button onClick={() => setIsStarted(true)} size="sm">
              {t('bounceBackBay.quiz.start')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    return (
      <Card className={cn(
        "mt-4 border-2",
        passed ? "border-green-500/50 bg-green-500/5" : "border-amber-500/50 bg-amber-500/5"
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            {passed ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-green-700 dark:text-green-400">{t('bounceBackBay.quiz.passed')}</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-amber-500" />
                <span className="text-amber-700 dark:text-amber-400">{t('bounceBackBay.quiz.needsRetry')}</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('bounceBackBay.quiz.score')}</span>
            <Badge variant={passed ? "default" : "secondary"} className={passed ? "bg-green-500" : ""}>
              {correctCount}/{questions.length} ({percentage}%)
            </Badge>
          </div>
          
          {passed ? (
            <p className="text-sm text-green-700 dark:text-green-400">
              {t('bounceBackBay.quiz.passMessage')}
            </p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                {t('bounceBackBay.quiz.retryMessage')}
              </p>
              <Button onClick={handleRetry} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('bounceBackBay.quiz.retry')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const question = questions[currentQuestion];

  return (
    <Card className="mt-4 border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('bounceBackBay.quiz.title')}</CardTitle>
          <Badge variant="outline">
            {currentQuestion + 1}/{questions.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-medium">
          {t(`bounceBackBay.quiz.questions.${sectionId}.${question.questionKey}`)}
        </p>
        
        <div className="space-y-2">
          {question.options.map((optionKey, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectAnswer(idx)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-colors",
                selectedAnswers[currentQuestion] === idx
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <span className="text-sm">
                {t(`bounceBackBay.quiz.questions.${sectionId}.options.${question.questionKey}.${optionKey}`)}
              </span>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleNext}
            disabled={selectedAnswers[currentQuestion] === undefined}
          >
            {currentQuestion < questions.length - 1 
              ? t('bounceBackBay.quiz.next')
              : t('bounceBackBay.quiz.finish')
            }
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Quiz definitions for each section
export const SECTION_QUIZZES: Record<string, QuizQuestion[]> = {
  'diagnostic': [
    { questionKey: 'q1', options: ['a', 'b', 'c'], correctIndex: 1 },
    { questionKey: 'q2', options: ['a', 'b', 'c'], correctIndex: 2 },
    { questionKey: 'q3', options: ['a', 'b', 'c'], correctIndex: 0 },
  ],
  'pain-scale': [
    { questionKey: 'q1', options: ['a', 'b', 'c'], correctIndex: 1 },
    { questionKey: 'q2', options: ['a', 'b', 'c'], correctIndex: 0 },
    { questionKey: 'q3', options: ['a', 'b', 'c'], correctIndex: 2 },
  ],
  'red-flags': [
    { questionKey: 'q1', options: ['a', 'b', 'c'], correctIndex: 0 },
    { questionKey: 'q2', options: ['a', 'b', 'c'], correctIndex: 2 },
    { questionKey: 'q3', options: ['a', 'b', 'c'], correctIndex: 1 },
  ],
  'rtp': [
    { questionKey: 'q1', options: ['a', 'b', 'c'], correctIndex: 1 },
    { questionKey: 'q2', options: ['a', 'b', 'c'], correctIndex: 0 },
    { questionKey: 'q3', options: ['a', 'b', 'c'], correctIndex: 2 },
  ],
  'prevention': [
    { questionKey: 'q1', options: ['a', 'b', 'c'], correctIndex: 2 },
    { questionKey: 'q2', options: ['a', 'b', 'c'], correctIndex: 1 },
    { questionKey: 'q3', options: ['a', 'b', 'c'], correctIndex: 0 },
  ],
  'recovery': [
    { questionKey: 'q1', options: ['a', 'b', 'c'], correctIndex: 0 },
    { questionKey: 'q2', options: ['a', 'b', 'c'], correctIndex: 2 },
    { questionKey: 'q3', options: ['a', 'b', 'c'], correctIndex: 1 },
  ],
  'equipment': [
    { questionKey: 'q1', options: ['a', 'b', 'c'], correctIndex: 1 },
    { questionKey: 'q2', options: ['a', 'b', 'c'], correctIndex: 0 },
    { questionKey: 'q3', options: ['a', 'b', 'c'], correctIndex: 2 },
  ],
};
