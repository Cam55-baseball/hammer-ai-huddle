import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Brain, 
  Play, 
  Lock, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ArrowRight,
  Maximize,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, addDays, differenceInDays } from 'date-fns';
import { S2ProcessingSpeedTest } from './diagnostics/S2ProcessingSpeedTest';
import { S2DecisionEfficiencyTest } from './diagnostics/S2DecisionEfficiencyTest';
import { S2VisualMotorTest } from './diagnostics/S2VisualMotorTest';
import { S2VisualTrackingTest } from './diagnostics/S2VisualTrackingTest';
import { S2PeripheralAwarenessTest } from './diagnostics/S2PeripheralAwarenessTest';
import { S2ProcessingUnderLoadTest } from './diagnostics/S2ProcessingUnderLoadTest';
import { S2ImpulseControlTest } from './diagnostics/S2ImpulseControlTest';
import { S2FatigueIndexTest } from './diagnostics/S2FatigueIndexTest';
import { S2ResultsAnalysis } from './diagnostics/S2ResultsAnalysis';

export interface S2DiagnosticResult {
  id: string;
  user_id: string;
  test_date: string;
  sport: string;
  processing_speed_score: number | null;
  decision_efficiency_score: number | null;
  visual_motor_integration_score: number | null;
  visual_tracking_score: number | null;
  peripheral_awareness_score: number | null;
  processing_under_load_score: number | null;
  impulse_control_score: number | null;
  fatigue_index_score: number | null;
  overall_score: number | null;
  comparison_vs_prior: {
    processing_speed_change: number | null;
    decision_efficiency_change: number | null;
    visual_motor_change: number | null;
    visual_tracking_change: number | null;
    peripheral_awareness_change: number | null;
    processing_under_load_change: number | null;
    impulse_control_change: number | null;
    fatigue_index_change: number | null;
    overall_change: number | null;
  } | null;
  next_test_date: string | null;
  completed_at: string | null;
}

interface S2CognitionDiagnosticsProps {
  sport?: string;
}

type TestPhase = 
  | 'intro' 
  | 'processing_speed' 
  | 'decision_efficiency' 
  | 'visual_motor' 
  | 'visual_tracking'
  | 'peripheral_awareness'
  | 'processing_under_load'
  | 'impulse_control'
  | 'fatigue_index'
  | 'results';

const initialScores = {
  processing_speed: 0,
  decision_efficiency: 0,
  visual_motor: 0,
  visual_tracking: 0,
  peripheral_awareness: 0,
  processing_under_load: 0,
  impulse_control: 0,
  fatigue_index: 0,
};

export const S2CognitionDiagnostics = ({ sport = 'baseball' }: S2CognitionDiagnosticsProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [latestResult, setLatestResult] = useState<S2DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [testPhase, setTestPhase] = useState<TestPhase>('intro');
  const [testScores, setTestScores] = useState(initialScores);
  const [canTakeTest, setCanTakeTest] = useState(true);
  const [daysUntilNextTest, setDaysUntilNextTest] = useState(0);
  const [showStartConfirmation, setShowStartConfirmation] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchLatestResult = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('tex_vision_s2_diagnostics')
        .select('*')
        .eq('user_id', user.id)
        .eq('sport', sport)
        .order('test_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const result = {
          ...data,
          comparison_vs_prior: data.comparison_vs_prior as S2DiagnosticResult['comparison_vs_prior'],
        } as S2DiagnosticResult;
        setLatestResult(result);

        if (data.next_test_date) {
          const nextDate = new Date(data.next_test_date);
          const today = new Date();
          const daysRemaining = differenceInDays(nextDate, today);
          setDaysUntilNextTest(Math.max(0, daysRemaining));
          setCanTakeTest(daysRemaining <= 0);
        }
      }
    } catch (error) {
      console.error('Error fetching S2 diagnostic:', error);
    } finally {
      setLoading(false);
    }
  }, [user, sport]);

  useEffect(() => {
    fetchLatestResult();
  }, [fetchLatestResult]);

  const handleSubtestComplete = (subtest: keyof typeof testScores, score: number) => {
    setTestScores(prev => ({ ...prev, [subtest]: score }));
    
    const phaseOrder: TestPhase[] = [
      'processing_speed',
      'decision_efficiency',
      'visual_motor',
      'visual_tracking',
      'peripheral_awareness',
      'processing_under_load',
      'impulse_control',
      'fatigue_index',
    ];

    const currentIndex = phaseOrder.indexOf(subtest as TestPhase);
    if (currentIndex < phaseOrder.length - 1) {
      setTestPhase(phaseOrder[currentIndex + 1]);
    } else {
      saveResults({ ...testScores, [subtest]: score });
    }
  };

  const saveResults = async (finalScores: typeof testScores) => {
    if (!user) return;

    const scores = Object.values(finalScores);
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    const today = new Date().toISOString().split('T')[0];
    const nextTestDate = addDays(new Date(), 112).toISOString().split('T')[0];

    let comparison: S2DiagnosticResult['comparison_vs_prior'] = null;
    if (latestResult) {
      comparison = {
        processing_speed_change: latestResult.processing_speed_score ? finalScores.processing_speed - latestResult.processing_speed_score : null,
        decision_efficiency_change: latestResult.decision_efficiency_score ? finalScores.decision_efficiency - latestResult.decision_efficiency_score : null,
        visual_motor_change: latestResult.visual_motor_integration_score ? finalScores.visual_motor - latestResult.visual_motor_integration_score : null,
        visual_tracking_change: latestResult.visual_tracking_score ? finalScores.visual_tracking - latestResult.visual_tracking_score : null,
        peripheral_awareness_change: latestResult.peripheral_awareness_score ? finalScores.peripheral_awareness - latestResult.peripheral_awareness_score : null,
        processing_under_load_change: latestResult.processing_under_load_score ? finalScores.processing_under_load - latestResult.processing_under_load_score : null,
        impulse_control_change: latestResult.impulse_control_score ? finalScores.impulse_control - latestResult.impulse_control_score : null,
        fatigue_index_change: latestResult.fatigue_index_score ? finalScores.fatigue_index - latestResult.fatigue_index_score : null,
        overall_change: latestResult.overall_score ? overallScore - latestResult.overall_score : null,
      };
    }

    try {
      const { data, error } = await supabase
        .from('tex_vision_s2_diagnostics')
        .insert({
          user_id: user.id,
          sport,
          test_date: today,
          processing_speed_score: finalScores.processing_speed,
          decision_efficiency_score: finalScores.decision_efficiency,
          visual_motor_integration_score: finalScores.visual_motor,
          visual_tracking_score: finalScores.visual_tracking,
          peripheral_awareness_score: finalScores.peripheral_awareness,
          processing_under_load_score: finalScores.processing_under_load,
          impulse_control_score: finalScores.impulse_control,
          fatigue_index_score: finalScores.fatigue_index,
          overall_score: overallScore,
          comparison_vs_prior: comparison,
          next_test_date: nextTestDate,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setLatestResult({
        ...data,
        comparison_vs_prior: data.comparison_vs_prior as S2DiagnosticResult['comparison_vs_prior'],
      } as S2DiagnosticResult);
      setTestPhase('results');
      setCanTakeTest(false);
      setDaysUntilNextTest(112);
    } catch (error) {
      console.error('Error saving S2 diagnostic:', error);
    }
  };

  const handleStartClick = () => setShowStartConfirmation(true);

  const confirmAndStartTest = async () => {
    setShowStartConfirmation(false);
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch (err) {
      console.log('Fullscreen not available:', err);
    }
    setTestScores(initialScores);
    setTestPhase('processing_speed');
  };

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleDone = () => {
    exitFullscreen();
    setTestPhase('intro');
  };

  const handleCancelClick = () => setShowCancelConfirmation(true);

  const confirmCancel = () => {
    setShowCancelConfirmation(false);
    exitFullscreen();
    setTestPhase('intro');
    setTestScores(initialScores);
  };

  const getChangeIcon = (change: number | null) => {
    if (change === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-amber-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-teal-400';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <Card className="border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-background">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 bg-muted rounded" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const FullscreenWrapper = ({ children, showCancel = true }: { children: React.ReactNode; showCancel?: boolean }) => (
    <div className="fixed inset-0 z-50 bg-black flex flex-col p-4 overflow-auto">
      {showCancel && (
        <div className="flex justify-end mb-4">
          <Button variant="destructive" size="sm" onClick={handleCancelClick} className="flex items-center gap-2">
            <X className="h-4 w-4" />
            CANCEL ASSESSMENT
          </Button>
        </div>
      )}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-lg">{children}</div>
      </div>
      <AlertDialog open={showCancelConfirmation} onOpenChange={setShowCancelConfirmation}>
        <AlertDialogContent className="border-destructive/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Cancel Assessment?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to cancel? <strong>All progress will be lost.</strong></p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Assessment</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  // Render active test phases
  const testComponents: Record<Exclude<TestPhase, 'intro' | 'results'>, JSX.Element> = {
    processing_speed: <S2ProcessingSpeedTest onComplete={(s) => handleSubtestComplete('processing_speed', s)} />,
    decision_efficiency: <S2DecisionEfficiencyTest onComplete={(s) => handleSubtestComplete('decision_efficiency', s)} />,
    visual_motor: <S2VisualMotorTest onComplete={(s) => handleSubtestComplete('visual_motor', s)} />,
    visual_tracking: <S2VisualTrackingTest onComplete={(s) => handleSubtestComplete('visual_tracking', s)} />,
    peripheral_awareness: <S2PeripheralAwarenessTest onComplete={(s) => handleSubtestComplete('peripheral_awareness', s)} />,
    processing_under_load: <S2ProcessingUnderLoadTest onComplete={(s) => handleSubtestComplete('processing_under_load', s)} />,
    impulse_control: <S2ImpulseControlTest onComplete={(s) => handleSubtestComplete('impulse_control', s)} />,
    fatigue_index: <S2FatigueIndexTest onComplete={(s) => handleSubtestComplete('fatigue_index', s)} />,
  };

  if (testPhase !== 'intro' && testPhase !== 'results') {
    return <FullscreenWrapper>{testComponents[testPhase]}</FullscreenWrapper>;
  }

  if (testPhase === 'results') {
    // Build previous scores for comparison from latestResult
    const previousScores = latestResult ? {
      processing_speed: latestResult.processing_speed_score,
      decision_efficiency: latestResult.decision_efficiency_score,
      visual_motor: latestResult.visual_motor_integration_score,
      visual_tracking: latestResult.visual_tracking_score,
      peripheral_awareness: latestResult.peripheral_awareness_score,
      processing_under_load: latestResult.processing_under_load_score,
      impulse_control: latestResult.impulse_control_score,
      fatigue_index: latestResult.fatigue_index_score,
    } : null;

    // Build comparison data
    const comparisonData = latestResult ? {
      processing_speed_change: latestResult.processing_speed_score ? testScores.processing_speed - latestResult.processing_speed_score : null,
      decision_efficiency_change: latestResult.decision_efficiency_score ? testScores.decision_efficiency - latestResult.decision_efficiency_score : null,
      visual_motor_change: latestResult.visual_motor_integration_score ? testScores.visual_motor - latestResult.visual_motor_integration_score : null,
      visual_tracking_change: latestResult.visual_tracking_score ? testScores.visual_tracking - latestResult.visual_tracking_score : null,
      peripheral_awareness_change: latestResult.peripheral_awareness_score ? testScores.peripheral_awareness - latestResult.peripheral_awareness_score : null,
      processing_under_load_change: latestResult.processing_under_load_score ? testScores.processing_under_load - latestResult.processing_under_load_score : null,
      impulse_control_change: latestResult.impulse_control_score ? testScores.impulse_control - latestResult.impulse_control_score : null,
      fatigue_index_change: latestResult.fatigue_index_score ? testScores.fatigue_index - latestResult.fatigue_index_score : null,
      overall_change: latestResult.overall_score 
        ? Math.round(Object.values(testScores).reduce((a, b) => a + b, 0) / 8) - latestResult.overall_score 
        : null,
    } : null;

    return (
      <FullscreenWrapper showCancel={false}>
        <S2ResultsAnalysis
          scores={testScores}
          previousScores={previousScores}
          comparison={comparisonData}
          onDone={handleDone}
        />
      </FullscreenWrapper>
    );
  }

  // Intro phase
  return (
    <>
      <Card className="border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10">
              <Brain className="h-5 w-5 text-teal-400" />
            </div>
            S2 Cognition Diagnostic
          </CardTitle>
          <CardDescription>Comprehensive cognitive assessment for athletic performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-background/50 rounded-lg border border-border/50 space-y-3">
            <h4 className="font-semibold text-sm">What This Measures (8 Tests):</h4>
            <div className="grid gap-1.5 text-xs text-muted-foreground">
              {[
                ['Processing Speed', 'Pattern recognition speed'],
                ['Decision Efficiency', 'Go/no-go accuracy'],
                ['Visual-Motor', 'Hand-eye coordination'],
                ['Visual Tracking', 'Track moving objects'],
                ['Peripheral Awareness', 'Side vision detection'],
                ['Processing Under Load', 'Mental speed under pressure'],
                ['Impulse Control', 'Discipline & restraint'],
                ['Fatigue Index', 'Mental endurance'],
              ].map(([name, desc]) => (
                <div key={name} className="flex items-center gap-2">
                  <ArrowRight className="h-3 w-3 text-teal-400 flex-shrink-0" />
                  <span><strong>{name}</strong> - {desc}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Takes approximately 12-15 minutes. Find a quiet space.</p>
          </div>

          {latestResult && (
            <div className="p-4 bg-teal-500/5 rounded-lg border border-teal-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Your Latest Results</h4>
                <Badge variant="outline" className="text-xs">{format(new Date(latestResult.test_date), 'MMM d, yyyy')}</Badge>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className={`text-4xl font-black ${getScoreColor(latestResult.overall_score)}`}>
                  {latestResult.overall_score}
                </div>
                {latestResult.comparison_vs_prior && getChangeIcon(latestResult.comparison_vs_prior.overall_change)}
              </div>
            </div>
          )}

          {canTakeTest ? (
            <Button onClick={handleStartClick} className="w-full bg-teal-600 hover:bg-teal-700" size="lg">
              <Play className="h-4 w-4 mr-2" />
              Start Assessment
            </Button>
          ) : (
            <div className="space-y-3">
              <Button disabled className="w-full" size="lg">
                <Lock className="h-4 w-4 mr-2" />
                Locked for {daysUntilNextTest} Days
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Next assessment available on {latestResult?.next_test_date ? format(new Date(latestResult.next_test_date), 'MMMM d, yyyy') : 'N/A'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showStartConfirmation} onOpenChange={setShowStartConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Maximize className="h-5 w-5 text-teal-400" />
              Ready to Begin?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This assessment includes <strong>8 cognitive tests</strong> and takes about <strong>12-15 minutes</strong>.</p>
              <p>For best results: quiet environment, full attention, no interruptions.</p>
              <p className="text-amber-400 font-medium">You can only take this assessment once every 16 weeks.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not Now</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAndStartTest} className="bg-teal-600 hover:bg-teal-700">
              Enter Fullscreen & Start
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
