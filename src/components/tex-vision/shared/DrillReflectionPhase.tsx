import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { MessageSquare, ChevronRight, SkipForward } from 'lucide-react';
import { DRILL_REFLECTIONS, ReflectionQuestion } from '../drillReflections';

interface DrillReflectionPhaseProps {
  drillId: string;
  onComplete: (responses: Record<string, string | number>) => void;
  onSkip: () => void;
}

export default function DrillReflectionPhase({ drillId, onComplete, onSkip }: DrillReflectionPhaseProps) {
  const { t } = useTranslation();
  const questions = DRILL_REFLECTIONS[drillId] || [];
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | number>>({});

  if (questions.length === 0) {
    // No reflection questions for this drill
    onSkip();
    return null;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const hasAnswered = responses[currentQuestion.id] !== undefined;

  const handleAnswer = (value: string | number) => {
    setResponses(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      onComplete(responses);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const renderRatingScale = (question: ReflectionQuestion) => {
    const selectedValue = responses[question.id] as number | undefined;
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between text-xs text-[hsl(var(--tex-vision-text-muted))]">
          <span>{question.ratingLabels?.low || '1'}</span>
          <span>{question.ratingLabels?.high || '5'}</span>
        </div>
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => handleAnswer(value)}
              className={`w-12 h-12 rounded-full font-bold text-lg transition-all duration-150 ${
                selectedValue === value
                  ? 'bg-[hsl(var(--tex-vision-feedback))] text-[hsl(var(--tex-vision-primary-dark))] scale-110'
                  : 'bg-[hsl(var(--tex-vision-primary))]/50 text-[hsl(var(--tex-vision-text))] hover:bg-[hsl(var(--tex-vision-primary))]/70'
              }`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderChoiceOptions = (question: ReflectionQuestion) => {
    const selectedValue = responses[question.id] as string | undefined;
    
    return (
      <div className="space-y-2">
        {question.options?.map((option) => (
          <button
            key={option}
            onClick={() => handleAnswer(option)}
            className={`w-full p-3 rounded-lg text-sm text-left transition-all duration-150 ${
              selectedValue === option
                ? 'bg-[hsl(var(--tex-vision-feedback))]/20 border-2 border-[hsl(var(--tex-vision-feedback))] text-[hsl(var(--tex-vision-text))]'
                : 'bg-[hsl(var(--tex-vision-primary))]/30 border-2 border-transparent text-[hsl(var(--tex-vision-text-muted))] hover:bg-[hsl(var(--tex-vision-primary))]/50'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    );
  };

  const renderTextInput = (question: ReflectionQuestion) => {
    const value = (responses[question.id] as string) || '';
    
    return (
      <textarea
        value={value}
        onChange={(e) => handleAnswer(e.target.value)}
        placeholder={t('texVision.reflection.typeHere', 'Type your thoughts here...')}
        className="w-full h-24 p-3 rounded-lg bg-[hsl(var(--tex-vision-primary))]/30 border border-[hsl(var(--tex-vision-primary-light))]/30 text-[hsl(var(--tex-vision-text))] placeholder:text-[hsl(var(--tex-vision-text-muted))]/50 resize-none focus:outline-none focus:border-[hsl(var(--tex-vision-feedback))]/50"
      />
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[hsl(var(--tex-vision-primary-dark))] flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="h-5 w-5 text-[hsl(var(--tex-vision-feedback))]" />
        <span className="text-sm text-[hsl(var(--tex-vision-text-muted))]">
          {t('texVision.reflection.title', 'Quick Reflection')}
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {questions.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-150 ${
              index === currentQuestionIndex
                ? 'bg-[hsl(var(--tex-vision-feedback))] scale-125'
                : index < currentQuestionIndex
                ? 'bg-[hsl(var(--tex-vision-success))]'
                : 'bg-[hsl(var(--tex-vision-primary-light))]/30'
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <div className="w-full max-w-md text-center mb-8">
        <h2 className="text-xl font-semibold text-[hsl(var(--tex-vision-text))] mb-6">
          {currentQuestion.question}
        </h2>

        {/* Answer input based on type */}
        {currentQuestion.type === 'rating' && renderRatingScale(currentQuestion)}
        {currentQuestion.type === 'choice' && renderChoiceOptions(currentQuestion)}
        {currentQuestion.type === 'text' && renderTextInput(currentQuestion)}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          variant="ghost"
          onClick={onSkip}
          className="text-[hsl(var(--tex-vision-text-muted))] hover:text-[hsl(var(--tex-vision-text))]"
        >
          <SkipForward className="h-4 w-4 mr-2" />
          {t('texVision.reflection.skip', 'Skip')}
        </Button>

        <Button
          onClick={handleNext}
          disabled={!hasAnswered}
          className="bg-[hsl(var(--tex-vision-feedback))] hover:bg-[hsl(var(--tex-vision-feedback))]/80 text-[hsl(var(--tex-vision-primary-dark))] disabled:opacity-50"
        >
          {isLastQuestion ? (
            t('texVision.reflection.finish', 'Finish')
          ) : (
            <>
              {t('texVision.reflection.next', 'Next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
