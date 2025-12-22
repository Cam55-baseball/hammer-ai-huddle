import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

  const startTest = () => {
    setTestScores({ processing_speed: 0, decision_efficiency: 0, visual_motor: 0 });
    setTestPhase('processing_speed');
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

  // Render active test phase
  if (testPhase === 'processing_speed') {
    return <S2ProcessingSpeedTest onComplete={(score) => handleSubtestComplete('processing_speed', score)} />;
  }

  if (testPhase === 'decision_efficiency') {
    return <S2DecisionEfficiencyTest onComplete={(score) => handleSubtestComplete('decision_efficiency', score)} />;
  }

  if (testPhase === 'visual_motor') {
    return <S2VisualMotorTest onComplete={(score) => handleSubtestComplete('visual_motor', score)} />;
  }

  // Results phase
  if (testPhase === 'results') {
    const overallScore = Math.round(
      (testScores.processing_speed + testScores.decision_efficiency + testScores.visual_motor) / 3
    );

    return (
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
              onClick={() => setTestPhase('intro')} 
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              Done
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Intro phase (default view)
  return (
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
            onClick={startTest} 
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
  );
};
