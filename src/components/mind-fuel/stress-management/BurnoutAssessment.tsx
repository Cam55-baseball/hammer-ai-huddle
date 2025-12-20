import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Flame, AlertTriangle, CheckCircle2, ArrowRight, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  text: string;
  category: 'exhaustion' | 'cynicism' | 'inefficacy';
}

const questions: Question[] = [
  { id: 'q1', text: 'I feel emotionally drained from my training/competition', category: 'exhaustion' },
  { id: 'q2', text: 'I feel used up at the end of the day', category: 'exhaustion' },
  { id: 'q3', text: 'I feel fatigued when I get up to face another day', category: 'exhaustion' },
  { id: 'q4', text: 'I feel like I\'m just going through the motions', category: 'cynicism' },
  { id: 'q5', text: 'I\'ve become less enthusiastic about my sport', category: 'cynicism' },
  { id: 'q6', text: 'I doubt the significance of my training', category: 'cynicism' },
  { id: 'q7', text: 'I feel I\'m not as effective as I should be', category: 'inefficacy' },
  { id: 'q8', text: 'I struggle to accomplish goals I set for myself', category: 'inefficacy' },
  { id: 'q9', text: 'I feel less confident in my abilities', category: 'inefficacy' },
];

const responseOptions = [
  { value: 0, label: 'Never' },
  { value: 1, label: 'Rarely' },
  { value: 2, label: 'Sometimes' },
  { value: 3, label: 'Often' },
  { value: 4, label: 'Always' },
];

interface Results {
  total: number;
  exhaustion: number;
  cynicism: number;
  inefficacy: number;
  severity: string;
  recommendations: string[];
}

export default function BurnoutAssessment() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Results | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleResponse = (value: string) => {
    const question = questions[currentQuestion];
    setResponses({ ...responses, [question.id]: parseInt(value) });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateResults();
    }
  };

  const calculateResults = async () => {
    const exhaustionScore = questions
      .filter((q) => q.category === 'exhaustion')
      .reduce((sum, q) => sum + (responses[q.id] || 0), 0);
    
    const cynicismScore = questions
      .filter((q) => q.category === 'cynicism')
      .reduce((sum, q) => sum + (responses[q.id] || 0), 0);
    
    const inefficacyScore = questions
      .filter((q) => q.category === 'inefficacy')
      .reduce((sum, q) => sum + (responses[q.id] || 0), 0);

    const totalScore = exhaustionScore + cynicismScore + inefficacyScore;
    const maxScore = questions.length * 4;
    const percentage = (totalScore / maxScore) * 100;

    let severity: string;
    let recommendations: string[];

    if (percentage <= 25) {
      severity = 'low';
      recommendations = [
        t('stressManagement.burnout.recs.low1', 'Great balance! Keep maintaining your current routines.'),
        t('stressManagement.burnout.recs.low2', 'Continue prioritizing rest and recovery.'),
      ];
    } else if (percentage <= 50) {
      severity = 'mild';
      recommendations = [
        t('stressManagement.burnout.recs.mild1', 'Consider adding more recovery time between sessions.'),
        t('stressManagement.burnout.recs.mild2', 'Practice stress management techniques regularly.'),
      ];
    } else if (percentage <= 75) {
      severity = 'moderate';
      recommendations = [
        t('stressManagement.burnout.recs.mod1', 'Take a deliberate break from intense training.'),
        t('stressManagement.burnout.recs.mod2', 'Talk to a coach or mentor about your workload.'),
        t('stressManagement.burnout.recs.mod3', 'Reconnect with why you love your sport.'),
      ];
    } else {
      severity = 'high';
      recommendations = [
        t('stressManagement.burnout.recs.high1', 'Consider taking a longer break from training.'),
        t('stressManagement.burnout.recs.high2', 'Speak with a mental health professional.'),
        t('stressManagement.burnout.recs.high3', 'Focus on activities outside of your sport.'),
      ];
    }

    const result: Results = {
      total: totalScore,
      exhaustion: exhaustionScore,
      cynicism: cynicismScore,
      inefficacy: inefficacyScore,
      severity,
      recommendations,
    };

    setResults(result);

    // Save to database
    if (user) {
      setIsSubmitting(true);
      try {
        await supabase.from('stress_assessments').insert({
          user_id: user.id,
          assessment_type: 'burnout',
          score: totalScore,
          severity,
          recommendations,
          responses: {
            ...responses,
            exhaustion: exhaustionScore,
            cynicism: cynicismScore,
            inefficacy: inefficacyScore,
          },
        });
        toast.success(t('stressManagement.burnout.saved', 'Assessment saved'));
      } catch (error) {
        console.error('Error saving burnout assessment:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const resetAssessment = () => {
    setCurrentQuestion(0);
    setResponses({});
    setResults(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-500';
      case 'mild': return 'bg-yellow-500';
      case 'moderate': return 'bg-orange-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (results) {
    return (
      <Card className="border-wellness-coral/30 bg-gradient-to-br from-wellness-cream to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5 text-wellness-coral" />
            {t('stressManagement.burnout.results', 'Assessment Results')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Score */}
          <div className="text-center space-y-2">
            <Badge className={cn(getSeverityColor(results.severity), 'text-white text-lg px-4 py-1')}>
              {t(`stressManagement.burnout.severity.${results.severity}`, results.severity.charAt(0).toUpperCase() + results.severity.slice(1))} {t('stressManagement.burnout.risk', 'Risk')}
            </Badge>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">{t('stressManagement.burnout.exhaustion', 'Exhaustion')}</span>
              <span className="text-sm font-medium">{results.exhaustion}/12</span>
            </div>
            <Progress value={(results.exhaustion / 12) * 100} className="h-2" />

            <div className="flex justify-between items-center">
              <span className="text-sm">{t('stressManagement.burnout.cynicism', 'Cynicism')}</span>
              <span className="text-sm font-medium">{results.cynicism}/12</span>
            </div>
            <Progress value={(results.cynicism / 12) * 100} className="h-2" />

            <div className="flex justify-between items-center">
              <span className="text-sm">{t('stressManagement.burnout.inefficacy', 'Inefficacy')}</span>
              <span className="text-sm font-medium">{results.inefficacy}/12</span>
            </div>
            <Progress value={(results.inefficacy / 12) * 100} className="h-2" />
          </div>

          {/* Recommendations */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {t('stressManagement.burnout.recommendations', 'Recommendations')}
            </h4>
            <ul className="space-y-1">
              {results.recommendations.map((rec, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          <Button onClick={resetAssessment} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('stressManagement.burnout.retake', 'Take Again')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const question = questions[currentQuestion];

  return (
    <Card className="border-wellness-coral/30 bg-gradient-to-br from-wellness-cream to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flame className="h-5 w-5 text-wellness-coral" />
          {t('stressManagement.burnout.title', 'Burnout Assessment')}
        </CardTitle>
        <CardDescription>
          {t('stressManagement.burnout.subtitle', 'Evaluate your current burnout risk level')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{t('stressManagement.burnout.question', 'Question')} {currentQuestion + 1}/{questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question */}
        <div className="py-4">
          <p className="text-base font-medium">{t(`stressManagement.burnout.questions.${question.id}`, question.text)}</p>
        </div>

        {/* Response Options */}
        <RadioGroup
          value={responses[question.id]?.toString() || ''}
          onValueChange={handleResponse}
          className="space-y-2"
        >
          {responseOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value={option.value.toString()} id={`${question.id}-${option.value}`} />
              <Label htmlFor={`${question.id}-${option.value}`} className="flex-1 cursor-pointer">
                {t(`stressManagement.burnout.options.${option.label.toLowerCase()}`, option.label)}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {/* Next Button */}
        <Button
          onClick={handleNext}
          disabled={responses[question.id] === undefined}
          className="w-full"
        >
          {currentQuestion < questions.length - 1 ? (
            <>
              {t('common.next', 'Next')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          ) : (
            t('stressManagement.burnout.seeResults', 'See Results')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
