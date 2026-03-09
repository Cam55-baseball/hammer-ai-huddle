import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Target, TrendingUp, Footprints, ArrowRight, Timer, Gauge, Trophy, Ruler } from 'lucide-react';
import type { RepResult } from './LiveRepRunner';
import type { LeadConfig } from './SessionSetup';
import {
  getScaledBenchmarks,
  calcBenchmarkDifference,
  calcStealWindow,
  interpretStealWindow,
  calcProjectedStealSuccess,
  calcAccelerationEfficiency,
  interpretAccelerationEfficiency,
  calcLeadEfficiency,
  buildStealProfile,
  type Grade,
} from '@/lib/stealAnalytics';

const MLB_BENCHMARKS = {
  eliteReactionSec: 0.20,
  goodReactionSec: 0.30,
  avgReactionSec: 0.45,
  eliteStealTime90ft: 3.3,
  goodStealTime90ft: 3.6,
  avgStealTime90ft: 3.9,
  eliteLeadPct: 16,
  goodLeadPct: 13,
};

function gradeReaction(avgSec: number | null): Grade {
  if (avgSec == null) return 'Average';
  if (avgSec <= MLB_BENCHMARKS.eliteReactionSec) return 'Elite';
  if (avgSec <= MLB_BENCHMARKS.goodReactionSec) return 'Good';
  if (avgSec <= MLB_BENCHMARKS.avgReactionSec) return 'Average';
  return 'Needs Work';
}

function gradeAcceleration(avgRunTime: number | null, baseDist: number): Grade {
  if (avgRunTime == null) return 'Average';
  const normalized = (avgRunTime / baseDist) * 90;
  if (normalized <= MLB_BENCHMARKS.eliteStealTime90ft) return 'Elite';
  if (normalized <= MLB_BENCHMARKS.goodStealTime90ft) return 'Good';
  if (normalized <= MLB_BENCHMARKS.avgStealTime90ft) return 'Average';
  return 'Needs Work';
}

function gradeLeadEfficiency(leadDist: number | null, baseDist: number): Grade {
  if (!leadDist || leadDist <= 0) return 'Average';
  const pct = (leadDist / baseDist) * 100;
  if (pct >= MLB_BENCHMARKS.eliteLeadPct) return 'Elite';
  if (pct >= MLB_BENCHMARKS.goodLeadPct) return 'Good';
  if (pct >= 10) return 'Average';
  return 'Needs Work';
}

function gradeToScore(g: Grade): number {
  switch (g) {
    case 'Elite': return 95;
    case 'Good': return 75;
    case 'Average': return 55;
    case 'Needs Work': return 30;
  }
}

function gradeColor(g: Grade): string {
  switch (g) {
    case 'Elite': return 'text-amber-500';
    case 'Good': return 'text-green-500';
    case 'Average': return 'text-blue-500';
    case 'Needs Work': return 'text-red-500';
  }
}

function badgeVariant(g: Grade): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (g) {
    case 'Elite': return 'default';
    case 'Good': return 'secondary';
    case 'Average': return 'outline';
    case 'Needs Work': return 'destructive';
  }
}

function classifyPerformance(takeoff: Grade, accel: Grade): string {
  return `${takeoff} Takeoff + ${accel} Acceleration`;
}

function generateDetailedInsight(
  takeoff: Grade,
  accel: Grade,
  lead: Grade,
  avgDecision: number | null,
  avgRun: number | null,
  correctRate: number,
): string {
  const parts: string[] = [];

  if (takeoff === 'Elite' && accel === 'Elite') {
    parts.push('Outstanding steal profile — your reaction and speed are both at elite level.');
  } else if (takeoff === 'Needs Work' && accel === 'Elite') {
    parts.push('Explosive acceleration but delayed first movement.');
    if (avgDecision != null) {
      const improvement = Math.max(0, avgDecision - MLB_BENCHMARKS.eliteReactionSec);
      parts.push(`Improving reaction time could drop your steal time by ~${improvement.toFixed(2)} seconds.`);
    }
  } else if (takeoff === 'Elite' && (accel === 'Needs Work' || accel === 'Average')) {
    parts.push('Great first-step reaction but acceleration needs development. Focus on explosive drive phase after your initial jump.');
  } else if (takeoff === 'Good' && accel === 'Good') {
    parts.push('Solid overall steal mechanics. To reach elite level, sharpen both reaction timing and sprint acceleration.');
  } else {
    parts.push('Building a strong foundation. Focus on reading signals faster and explosive first steps.');
  }

  if (lead === 'Needs Work') {
    parts.push('Your lead distance is conservative — extending it safely could cut significant time.');
  } else if (lead === 'Elite') {
    parts.push('Aggressive lead distance gives you an edge.');
  }

  if (correctRate < 0.7) {
    parts.push('Decision accuracy needs attention — prioritize reading the signal correctly before speed.');
  }

  return parts.join(' ');
}

function getSuccessColor(pct: number): string {
  if (pct >= 80) return 'text-green-500';
  if (pct >= 60) return 'text-amber-500';
  return 'text-red-500';
}

function getWindowColor(window: number): string {
  if (window >= 0.10) return 'text-green-500';
  if (window >= 0) return 'text-amber-500';
  return 'text-red-500';
}

interface PerformanceAnalysisProps {
  reps: RepResult[];
  config: LeadConfig;
  onDone: () => void;
}

export function PerformanceAnalysis({ reps, config, onDone }: PerformanceAnalysisProps) {
  const baseDist = parseFloat(config.baseDistanceFt) || 90;
  const leadDist = parseFloat(config.leadDistanceFt) || 0;

  // Compute averages
  const decisionTimes = reps.filter(r => r.decisionTimeSec != null).map(r => r.decisionTimeSec!);
  const avgDecision = decisionTimes.length > 0
    ? decisionTimes.reduce((s, v) => s + v, 0) / decisionTimes.length
    : null;

  const runTimes = reps.filter(r => r.timeToBaseSec != null && r.timeToBaseSec! > 0).map(r => r.timeToBaseSec!);
  const avgRun = runTimes.length > 0
    ? runTimes.reduce((s, v) => s + v, 0) / runTimes.length
    : null;

  // First two steps average (go reps only)
  const stepTimes = reps.filter(r => r.signalType === 'go' && r.firstTwoStepsSec != null && r.firstTwoStepsSec! > 0).map(r => r.firstTwoStepsSec!);
  const avgFirstTwoSteps = stepTimes.length > 0
    ? stepTimes.reduce((s, v) => s + v, 0) / stepTimes.length
    : null;

  const correctCount = reps.filter(r => r.decisionCorrect).length;
  const correctRate = reps.length > 0 ? correctCount / reps.length : 0;
  const eliteJumps = reps.filter(r => r.eliteJump).length;

  // Grades
  const takeoffGrade = gradeReaction(avgDecision);
  const accelGrade = gradeAcceleration(avgRun, baseDist);
  const leadGrade = gradeLeadEfficiency(leadDist, baseDist);

  // Composite score
  const takeoffScore = gradeToScore(takeoffGrade);
  const accelScore = gradeToScore(accelGrade);
  const leadScore = gradeToScore(leadGrade);
  const accuracyScore = Math.round(correctRate * 100);
  const compositeScore = Math.round(takeoffScore * 0.3 + accelScore * 0.3 + leadScore * 0.15 + accuracyScore * 0.25);

  const classification = classifyPerformance(takeoffGrade, accelGrade);
  const insight = generateDetailedInsight(takeoffGrade, accelGrade, leadGrade, avgDecision, avgRun, correctRate);

  // Grade first two steps
  const firstTwoStepsGrade: Grade = avgFirstTwoSteps == null ? 'Average'
    : avgFirstTwoSteps <= 0.45 ? 'Elite'
    : avgFirstTwoSteps <= 0.65 ? 'Good'
    : avgFirstTwoSteps <= 0.85 ? 'Average'
    : 'Needs Work';

  const grades: { label: string; grade: Grade; detail: string; icon: React.ReactNode }[] = [
    {
      label: 'Takeoff Grade',
      grade: takeoffGrade,
      detail: avgDecision != null ? `${avgDecision.toFixed(2)}s avg reaction` : 'No data',
      icon: <Zap className="h-4 w-4" />,
    },
    ...(avgFirstTwoSteps != null ? [{
      label: 'First 2 Steps',
      grade: firstTwoStepsGrade,
      detail: `${avgFirstTwoSteps.toFixed(2)}s avg (go reps)`,
      icon: <Footprints className="h-4 w-4" />,
    }] : []),
    {
      label: 'Acceleration Grade',
      grade: accelGrade,
      detail: avgRun != null ? `${avgRun.toFixed(2)}s avg run time` : 'No run time data',
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      label: 'Lead Efficiency',
      grade: leadGrade,
      detail: leadDist > 0 ? `${leadDist}ft / ${baseDist}ft base` : 'No lead distance set',
      icon: <Footprints className="h-4 w-4" />,
    },
    {
      label: 'Decision Accuracy',
      grade: correctRate >= 0.9 ? 'Elite' : correctRate >= 0.75 ? 'Good' : correctRate >= 0.6 ? 'Average' : 'Needs Work',
      detail: `${correctCount}/${reps.length} correct`,
      icon: <Target className="h-4 w-4" />,
    },
  ];

  // Advanced analytics
  const benchmarks = getScaledBenchmarks(baseDist);
  const benchmarkComparison = avgRun != null ? calcBenchmarkDifference(avgRun, baseDist) : null;
  const firstTwoStepsBenchmarkDiff = avgFirstTwoSteps != null 
    ? avgFirstTwoSteps - benchmarks.eliteFirstTwoSteps 
    : null;

  // Steal profile for advanced metrics
  const stealProfile = buildStealProfile({
    avgDecision,
    avgFirstTwoSteps,
    avgRun,
    leadDist,
    baseDist,
  });

  // Acceleration efficiency
  const accelEfficiency = avgFirstTwoSteps != null && avgRun != null && avgRun > 0
    ? calcAccelerationEfficiency(avgFirstTwoSteps, avgRun)
    : null;

  // Lead efficiency
  const leadEfficiency = leadDist > 0 && baseDist > 0
    ? calcLeadEfficiency(leadDist, baseDist)
    : null;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h2 className="text-xl font-bold text-center">Performance Analysis</h2>

      {/* Steal Efficiency Score */}
      <Card className="border-primary/40">
        <CardContent className="pt-6 text-center space-y-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Steal Efficiency Score</p>
          <div className="text-6xl font-black tabular-nums text-primary">{compositeScore}</div>
          <Progress value={compositeScore} className="h-2" />
          <Badge variant="secondary" className="text-xs">{classification}</Badge>
        </CardContent>
      </Card>

      {/* Grade Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {grades.map((g) => (
            <div key={g.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {g.icon}
                <div>
                  <p className="text-sm font-medium">{g.label}</p>
                  <p className="text-xs text-muted-foreground">{g.detail}</p>
                </div>
              </div>
              <Badge variant={badgeVariant(g.grade)} className={gradeColor(g.grade)}>
                {g.grade}
              </Badge>
            </div>
          ))}
          {eliteJumps > 0 && (
            <div className="flex items-center gap-2 text-amber-500 text-sm font-semibold pt-1 border-t border-border">
              <Zap className="h-4 w-4" /> {eliteJumps} Elite Jump{eliteJumps > 1 ? 's' : ''} Detected
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Insight */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Key Insight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{insight}</p>
        </CardContent>
      </Card>

      {/* Elite Benchmark Comparison */}
      {avgRun != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Elite Benchmark Comparison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Your Avg Time</p>
                <p className="text-2xl font-bold tabular-nums">{avgRun.toFixed(2)}s</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Elite ({baseDist}ft)</p>
                <p className="text-2xl font-bold tabular-nums text-amber-500">{benchmarks.eliteTime.toFixed(2)}s</p>
              </div>
            </div>
            {benchmarkComparison && (
              <div className={`text-sm font-medium ${benchmarkComparison.isElite ? 'text-green-500' : 'text-red-500'}`}>
                {benchmarkComparison.label}
              </div>
            )}
            {avgFirstTwoSteps != null && (
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">First 2 Steps</span>
                  <span>
                    {avgFirstTwoSteps.toFixed(2)}s vs {benchmarks.eliteFirstTwoSteps.toFixed(2)}s elite
                    <span className={`ml-2 ${firstTwoStepsBenchmarkDiff! <= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ({firstTwoStepsBenchmarkDiff! <= 0 ? '' : '+'}{firstTwoStepsBenchmarkDiff!.toFixed(2)}s)
                    </span>
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Projected Steal Success */}
      {stealProfile.projectedSuccessAvg != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> Projected Steal Success
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-muted-foreground">vs Avg MLB Battery</span>
                <span className={`text-sm font-bold ${getSuccessColor(stealProfile.projectedSuccessAvg)}`}>
                  {stealProfile.projectedSuccessAvg}%
                </span>
              </div>
              <Progress 
                value={stealProfile.projectedSuccessAvg} 
                className="h-2"
                indicatorClassName={stealProfile.projectedSuccessAvg >= 80 ? 'bg-green-500' : stealProfile.projectedSuccessAvg >= 60 ? 'bg-amber-500' : 'bg-red-500'}
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-muted-foreground">vs Elite MLB Battery</span>
                <span className={`text-sm font-bold ${getSuccessColor(stealProfile.projectedSuccessElite!)}`}>
                  {stealProfile.projectedSuccessElite}%
                </span>
              </div>
              <Progress 
                value={stealProfile.projectedSuccessElite!} 
                className="h-2"
                indicatorClassName={stealProfile.projectedSuccessElite! >= 80 ? 'bg-green-500' : stealProfile.projectedSuccessElite! >= 60 ? 'bg-amber-500' : 'bg-red-500'}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Accounts for 0.17s slide adjustment (drill is standing run)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Steal Window */}
      {stealProfile.stealWindowAvg != null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="h-4 w-4" /> Steal Window
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">vs Avg Battery (3.2s)</span>
              <div className="text-right">
                <span className={`font-bold ${getWindowColor(stealProfile.stealWindowAvg)}`}>
                  {stealProfile.stealWindowAvg >= 0 ? '+' : ''}{stealProfile.stealWindowAvg.toFixed(2)}s
                </span>
                <p className="text-xs text-muted-foreground">
                  {interpretStealWindow(stealProfile.stealWindowAvg).label}
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">vs Elite Battery (2.4s)</span>
              <div className="text-right">
                <span className={`font-bold ${getWindowColor(stealProfile.stealWindowElite!)}`}>
                  {stealProfile.stealWindowElite! >= 0 ? '+' : ''}{stealProfile.stealWindowElite!.toFixed(2)}s
                </span>
                <p className="text-xs text-muted-foreground">
                  {interpretStealWindow(stealProfile.stealWindowElite!).label}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Elite Steal Profile Card */}
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="h-4 w-4 text-amber-500" /> Elite Steal Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {stealProfile.takeoffGrade && (
              <div>
                <p className="text-xs text-muted-foreground">Takeoff Speed</p>
                <p className={`font-semibold ${gradeColor(stealProfile.takeoffGrade)}`}>
                  {stealProfile.takeoffGrade}
                </p>
              </div>
            )}
            {accelEfficiency && (
              <div>
                <p className="text-xs text-muted-foreground">Accel. Efficiency</p>
                <p className={`font-semibold ${gradeColor(accelEfficiency.grade)}`}>
                  {accelEfficiency.pct.toFixed(1)}%
                </p>
              </div>
            )}
            {leadEfficiency && leadEfficiency.pct > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Lead Efficiency</p>
                <p className={`font-semibold ${gradeColor(leadEfficiency.grade)}`}>
                  {leadEfficiency.pct.toFixed(1)}%
                </p>
              </div>
            )}
            {stealProfile.timeToBase != null && (
              <div>
                <p className="text-xs text-muted-foreground">Time to Base</p>
                <p className="font-semibold">{stealProfile.timeToBase.toFixed(2)}s</p>
              </div>
            )}
            {stealProfile.stealWindowAvg != null && (
              <div>
                <p className="text-xs text-muted-foreground">Steal Window</p>
                <p className={`font-semibold ${getWindowColor(stealProfile.stealWindowAvg)}`}>
                  {stealProfile.stealWindowAvg >= 0 ? '+' : ''}{stealProfile.stealWindowAvg.toFixed(2)}s
                </p>
              </div>
            )}
            {stealProfile.projectedSuccessAvg != null && (
              <div>
                <p className="text-xs text-muted-foreground">Success vs Avg</p>
                <p className={`font-semibold ${getSuccessColor(stealProfile.projectedSuccessAvg)}`}>
                  {stealProfile.projectedSuccessAvg}%
                </p>
              </div>
            )}
            {stealProfile.feetStolen != null && stealProfile.feetStolen > 0 && (
              <div className="col-span-2 pt-2 border-t border-border flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Feet Stolen: </span>
                  <span className="font-semibold">{stealProfile.feetStolen}ft</span>
                  {stealProfile.actualRunDistance && (
                    <span className="text-muted-foreground"> (actual run: {stealProfile.actualRunDistance}ft)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Button className="w-full gap-2" size="lg" onClick={onDone}>
        Done <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
