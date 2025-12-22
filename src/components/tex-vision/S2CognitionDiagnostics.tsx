import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

export interface S2DiagnosticResult {
  id: string;
  user_id: string;
  test_date: string;
  sport: string;
  processing_speed_score: number | null;
  decision_efficiency_score: number | null;
  visual_motor_integration_score: number | null;
  overall_score: number | null;
  comparison_vs_prior: {
    processing_speed_change: number | null;
    decision_efficiency_change: number | null;
    visual_motor_change: number | null;
    overall_change: number | null;
  } | null;
  next_test_date: string | null;
  completed_at: string | null;
}

interface S2CognitionDiagnosticsProps {
  sport?: string;
}

type TestPhase = 'intro' | 'processing_speed' | 'decision_efficiency' | 'visual_motor' | 'results';

export const S2CognitionDiagnostics = ({ sport = 'baseball' }: S2CognitionDiagnosticsProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [latestResult, setLatestResult] = useState<S2DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [testPhase, setTestPhase] = useState<TestPhase>('intro');
  const [testScores, setTestScores] = useState({
    processing_speed: 0,
    decision_efficiency: 0,
    visual_motor: 0,
  });
  const [canTakeTest, setCanTakeTest] = useState(true);
  const [daysUntilNextTest, setDaysUntilNextTest] = useState(0);
  const [showStartConfirmation, setShowStartConfirmation] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch latest diagnostic result
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

        // Check if can take test (6 weeks lockout)
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

  // Handle subtest completion
  const handleSubtestComplete = (subtest: keyof typeof testScores, score: number) => {
    setTestScores(prev => ({ ...prev, [subtest]: score }));
    
    // Advance to next phase
    if (subtest === 'processing_speed') {
      setTestPhase('decision_efficiency');
    } else if (subtest === 'decision_efficiency') {
      setTestPhase('visual_motor');
    } else if (subtest === 'visual_motor') {
      // Save results and show results phase
      saveResults();
    }
  };

  // Save results to database
  const saveResults = async () => {
    if (!user) return;

    const overallScore = Math.round(
      (testScores.processing_speed + testScores.decision_efficiency + testScores.visual_motor) / 3
    );

    const today = new Date().toISOString().split('T')[0];
    const nextTestDate = addDays(new Date(), 112).toISOString().split('T')[0]; // 16 weeks

    // Calculate comparison if we have prior results
    let comparison: S2DiagnosticResult['comparison_vs_prior'] = null;
    if (latestResult) {
      comparison = {
        processing_speed_change: latestResult.processing_speed_score 
          ? testScores.processing_speed - latestResult.processing_speed_score 
          : null,
        decision_efficiency_change: latestResult.decision_efficiency_score
          ? testScores.decision_efficiency - latestResult.decision_efficiency_score
          : null,
        visual_motor_change: latestResult.visual_motor_integration_score
          ? testScores.visual_motor - latestResult.visual_motor_integration_score
          : null,
        overall_change: latestResult.overall_score
          ? overallScore - latestResult.overall_score
          : null,
      };
    }

    try {
      const { data, error } = await supabase
        .from('tex_vision_s2_diagnostics')
        .insert({
          user_id: user.id,
          sport,
          test_date: today,
          processing_speed_score: testScores.processing_speed,
          decision_efficiency_score: testScores.decision_efficiency,
          visual_motor_integration_score: testScores.visual_motor,
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

  // Show confirmation dialog before starting
  const handleStartClick = () => {
    setShowStartConfirmation(true);
  };

  // Enter fullscreen and start test
  const confirmAndStartTest = async () => {
    setShowStartConfirmation(false);
    
    // Try to enter fullscreen
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch (err) {
      // Continue even if fullscreen fails (some browsers/devices may block it)
      console.log('Fullscreen not available:', err);
    }
    
    setTestScores({ processing_speed: 0, decision_efficiency: 0, visual_motor: 0 });
    setTestPhase('processing_speed');
  };

  // Exit fullscreen
  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle test completion - exit fullscreen
  const handleDone = () => {
    exitFullscreen();
    setTestPhase('intro');
  };

  // Handle cancel button click
  const handleCancelClick = () => {
    setShowCancelConfirmation(true);
  };

  // Confirm cancel and exit assessment
  const confirmCancel = () => {
    setShowCancelConfirmation(false);
    exitFullscreen();
    setTestPhase('intro');
    setTestScores({ processing_speed: 0, decision_efficiency: 0, visual_motor: 0 });
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

  // Fullscreen container wrapper for active tests
  const FullscreenWrapper = ({ children, showCancel = true }: { children: React.ReactNode; showCancel?: boolean }) => (
    <div className="fixed inset-0 z-50 bg-black flex flex-col p-4 overflow-auto">
      {showCancel && (
        <div className="flex justify-end mb-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleCancelClick}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            CANCEL ASSESSMENT
          </Button>
        </div>
      )}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-lg">
          {children}
        </div>
      </div>
      
      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelConfirmation} onOpenChange={setShowCancelConfirmation}>
        <AlertDialogContent className="border-destructive/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Cancel Assessment?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to cancel? <strong>All progress will be lost.</strong></p>
              <p>You will need to start over from the beginning if you want to complete the assessment.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Assessment</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  // Render active test phase
  if (testPhase === 'processing_speed') {
    return (
      <FullscreenWrapper>
        <S2ProcessingSpeedTest onComplete={(score) => handleSubtestComplete('processing_speed', score)} />
      </FullscreenWrapper>
    );
  }

  if (testPhase === 'decision_efficiency') {
    return (
      <FullscreenWrapper>
        <S2DecisionEfficiencyTest onComplete={(score) => handleSubtestComplete('decision_efficiency', score)} />
      </FullscreenWrapper>
    );
  }

  if (testPhase === 'visual_motor') {
    return (
      <FullscreenWrapper>
        <S2VisualMotorTest onComplete={(score) => handleSubtestComplete('visual_motor', score)} />
      </FullscreenWrapper>
    );
  }

  // Results phase
  if (testPhase === 'results') {
    const overallScore = Math.round(
      (testScores.processing_speed + testScores.decision_efficiency + testScores.visual_motor) / 3
    );

    return (
      <FullscreenWrapper showCancel={false}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
        <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-teal-400">
              <CheckCircle2 className="h-6 w-6" />
              S2 Cognition Assessment Complete
            </CardTitle>
            <CardDescription>Your cognitive performance results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Score */}
            <div className="text-center p-6 bg-background/50 rounded-xl border border-teal-500/20">
              <div className="text-sm text-muted-foreground mb-2">Overall Score</div>
              <div className={`text-5xl font-black ${getScoreColor(overallScore)}`}>
                {overallScore}
              </div>
              <div className="text-sm text-muted-foreground mt-1">out of 100</div>
            </div>

            {/* Individual Scores */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-background/30 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Processing Speed</div>
                <div className={`text-2xl font-bold ${getScoreColor(testScores.processing_speed)}`}>
                  {testScores.processing_speed}
                </div>
              </div>
              <div className="text-center p-4 bg-background/30 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Decision Efficiency</div>
                <div className={`text-2xl font-bold ${getScoreColor(testScores.decision_efficiency)}`}>
                  {testScores.decision_efficiency}
                </div>
              </div>
              <div className="text-center p-4 bg-background/30 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Visual-Motor</div>
                <div className={`text-2xl font-bold ${getScoreColor(testScores.visual_motor)}`}>
                  {testScores.visual_motor}
                </div>
              </div>
            </div>

            <Alert className="bg-teal-500/10 border-teal-500/30">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Your next S2 assessment will be available in 16 weeks on {format(addDays(new Date(), 112), 'MMM d, yyyy')}.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleDone} 
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              Done
            </Button>
          </CardContent>
        </Card>
        </motion.div>
      </FullscreenWrapper>
    );
  }

  // Intro phase (default view)
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
        <CardDescription>
          Comprehensive cognitive assessment for athletic performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Description */}
        <div className="p-4 bg-background/50 rounded-lg border border-border/50 space-y-3">
          <h4 className="font-semibold text-sm">What This Measures:</h4>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-3 w-3 text-teal-400" />
              <span><strong>Processing Speed</strong> - How fast you recognize patterns</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-3 w-3 text-teal-400" />
              <span><strong>Decision Efficiency</strong> - Go/no-go reaction accuracy</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-3 w-3 text-teal-400" />
              <span><strong>Visual-Motor Integration</strong> - Hand-eye coordination</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Takes approximately 5-7 minutes. Find a quiet space with good lighting.
          </p>
        </div>

        {/* Latest Results (if exists) */}
        {latestResult && (
          <div className="p-4 bg-teal-500/5 rounded-lg border border-teal-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Your Latest Results</h4>
              <Badge variant="outline" className="text-xs">
                {format(new Date(latestResult.test_date), 'MMM d, yyyy')}
              </Badge>
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <span className="text-4xl font-black text-teal-400">
                {latestResult.overall_score}
              </span>
              {latestResult.comparison_vs_prior?.overall_change !== null && (
                <div className="flex items-center gap-1">
                  {getChangeIcon(latestResult.comparison_vs_prior?.overall_change ?? null)}
                  <span className={`text-sm ${(latestResult.comparison_vs_prior?.overall_change ?? 0) >= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {(latestResult.comparison_vs_prior?.overall_change ?? 0) > 0 ? '+' : ''}
                    {latestResult.comparison_vs_prior?.overall_change}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-muted-foreground">Speed</div>
                <div className="font-semibold">{latestResult.processing_speed_score}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Decision</div>
                <div className="font-semibold">{latestResult.decision_efficiency_score}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Motor</div>
                <div className="font-semibold">{latestResult.visual_motor_integration_score}</div>
              </div>
            </div>
          </div>
        )}

        {/* Start Test Button */}
        {canTakeTest ? (
          <Button 
            onClick={handleStartClick} 
            className="w-full bg-teal-600 hover:bg-teal-700"
            size="lg"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Assessment
          </Button>
        ) : (
          <div className="space-y-3">
            <Button 
              disabled 
              className="w-full"
              size="lg"
            >
              <Lock className="h-4 w-4 mr-2" />
              Locked for {daysUntilNextTest} Days
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Next assessment available: {latestResult?.next_test_date && format(new Date(latestResult.next_test_date), 'MMMM d, yyyy')}
            </p>
          </div>
        )}

        {!latestResult && (
          <Alert className="bg-amber-500/10 border-amber-500/30">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              This is a baseline assessment. Future tests will show your improvement over time.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>

    {/* Confirmation Dialog */}
    <AlertDialog open={showStartConfirmation} onOpenChange={setShowStartConfirmation}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
            Before You Begin
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p className="font-medium text-foreground">Once you start this assessment:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>You <strong>cannot pause or exit</strong> until all 3 tests are complete</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>Closing the app will <strong>forfeit your progress</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>The screen will enter <strong>fullscreen mode</strong> for focus</span>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground pt-2 border-t">
              Make sure you have 5-7 minutes of uninterrupted time in a quiet space.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={confirmAndStartTest}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Maximize className="h-4 w-4 mr-2" />
            I'm Ready, Begin
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
