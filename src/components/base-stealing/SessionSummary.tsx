import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Zap, TrendingUp, Timer, Footprints } from 'lucide-react';
import type { RepResult } from './LiveRepRunner';
import { RepReviewPlayer } from './RepReviewPlayer';
import { useState } from 'react';
import type { LeadConfig } from './SessionSetup';

const MLB_BENCHMARKS = {
  eliteReactionSec: 0.25,
  goodReactionSec: 0.40,
  eliteStealTime90ft: 3.3,
  goodStealTime90ft: 3.6,
  avgStealTime90ft: 3.9,
};

function generateInsight(
  avgDecisionTime: number | null,
  avgRunTime: number | null,
  baseDistanceFt: number,
  eliteJumpRate: number,
  correctRate: number,
): string {
  const parts: string[] = [];

  // Reaction assessment
  if (avgDecisionTime != null) {
    if (avgDecisionTime <= MLB_BENCHMARKS.eliteReactionSec) {
      parts.push('Elite reaction speed');
    } else if (avgDecisionTime <= MLB_BENCHMARKS.goodReactionSec) {
      parts.push('Good reaction timing');
    } else {
      parts.push('Reaction timing is slightly delayed');
    }
  }

  // Elite jump assessment
  if (eliteJumpRate > 0.5) {
    parts.push('elite jump timing');
  }

  // Run time assessment (normalize to 90ft equivalent)
  if (avgRunTime != null && baseDistanceFt > 0) {
    const normalized = (avgRunTime / baseDistanceFt) * 90;
    if (normalized <= MLB_BENCHMARKS.eliteStealTime90ft) {
      parts.push('elite acceleration to the base');
    } else if (normalized <= MLB_BENCHMARKS.goodStealTime90ft) {
      parts.push('strong acceleration');
    } else if (normalized <= MLB_BENCHMARKS.avgStealTime90ft) {
      parts.push('average acceleration — room for improvement');
    } else {
      parts.push('acceleration needs work');
    }
  }

  // Decision correctness
  if (correctRate < 0.7) {
    parts.push('Decision accuracy needs attention — focus on reading signals before reacting.');
  }

  if (parts.length === 0) return 'Keep training to build your baseline data.';

  // Build coaching sentence
  const sentence = parts[0].charAt(0).toUpperCase() + parts[0].slice(1) +
    (parts.length > 1 ? ' with ' + parts.slice(1).join(', ') + '.' : '.');

  // Add actionable tip
  if (avgDecisionTime != null && avgDecisionTime > MLB_BENCHMARKS.goodReactionSec) {
    return sentence + ' Improving decision speed will significantly improve steal success.';
  }
  if (avgRunTime != null && baseDistanceFt > 0) {
    const normalized = (avgRunTime / baseDistanceFt) * 90;
    if (normalized > MLB_BENCHMARKS.goodStealTime90ft) {
      return sentence + ' Focus on explosive first steps to shave time off your steal.';
    }
  }
  return sentence;
}

interface SessionSummaryProps {
  reps: RepResult[];
  config: LeadConfig;
  onSave: () => void;
  saving?: boolean;
}

export function SessionSummary({ reps, config, onSave, saving }: SessionSummaryProps) {
  const [expandedRep, setExpandedRep] = useState<number | null>(null);

  const correctCount = reps.filter(r => r.decisionCorrect).length;
  const incorrectCount = reps.length - correctCount;
  const correctRate = reps.length > 0 ? correctCount / reps.length : 0;

  // Avg decision time
  const decisionTimes = reps.filter(r => r.decisionTimeSec != null).map(r => r.decisionTimeSec!);
  const avgDecisionTime = decisionTimes.length > 0
    ? decisionTimes.reduce((s, v) => s + v, 0) / decisionTimes.length
    : null;

  // Avg run time to base
  const runTimes = reps.filter(r => r.timeToBaseSec != null && r.timeToBaseSec > 0).map(r => r.timeToBaseSec!);
  const avgRunTime = runTimes.length > 0
    ? runTimes.reduce((s, v) => s + v, 0) / runTimes.length
    : null;

  // Elite jumps
  const goReps = reps.filter(r => r.signalType === 'go');
  const eliteJumps = reps.filter(r => r.eliteJump).length;
  const eliteJumpRate = goReps.length > 0 ? eliteJumps / goReps.length : 0;

  const baseDistanceFt = parseFloat(config.baseDistanceFt) || 90;

  const insight = generateInsight(avgDecisionTime, avgRunTime, baseDistanceFt, eliteJumpRate, correctRate);

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h2 className="text-xl font-bold text-center">Session Complete</h2>

      {/* 1. Session Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Session Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold">{reps.length}</p>
              <p className="text-xs text-muted-foreground">Total Reps</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-500">{correctCount}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{incorrectCount}</p>
              <p className="text-xs text-muted-foreground">Incorrect</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Performance Metrics */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4" /> Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <p className="text-lg font-bold">{avgDecisionTime != null ? `${avgDecisionTime.toFixed(2)}s` : '—'}</p>
              <p className="text-xs text-muted-foreground">Avg Decision Time</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-lg font-bold">{avgRunTime != null ? `${avgRunTime.toFixed(2)}s` : '—'}</p>
              <p className="text-xs text-muted-foreground">Avg Run Time to Base</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-lg font-bold">{baseDistanceFt} ft</p>
              <p className="text-xs text-muted-foreground">Base Distance</p>
            </div>
            <div className="space-y-0.5 flex items-start gap-1.5">
              <div>
                <p className="text-lg font-bold flex items-center gap-1">
                  {eliteJumps}
                  {eliteJumps > 0 && <Zap className="h-4 w-4 text-amber-500" />}
                </p>
                <p className="text-xs text-muted-foreground">Elite Jumps</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Performance Insight */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Performance Insight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{insight}</p>
        </CardContent>
      </Card>

      {/* Rep list */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Rep Details</h3>
        {reps.map((rep, i) => {
          const isManualRep = rep.videoBlob === null && rep.decisionTimeSec === null;
          return (
            <Card 
              key={i} 
              className={rep.videoBlob ? 'cursor-pointer' : ''} 
              onClick={() => rep.videoBlob && setExpandedRep(expandedRep === i ? null : i)}
            >
              <CardContent className="py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Rep {rep.repNumber}</span>
                    {rep.decisionCorrect ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : rep.decisionCorrect === false ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : null}
                    {rep.eliteJump && <Zap className="h-4 w-4 text-amber-500" />}
                    {isManualRep && (
                      <span className="text-xs text-muted-foreground">(manual)</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {rep.signalValue}
                    {rep.decisionTimeSec != null && ` · ${rep.decisionTimeSec.toFixed(2)}s`}
                    {isManualRep && rep.timeToBaseSec != null && ` · ${rep.timeToBaseSec.toFixed(2)}s to base`}
                  </div>
                </div>
                {expandedRep === i && rep.videoBlob && (
                  <RepReviewPlayer videoBlob={rep.videoBlob} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button className="w-full" onClick={onSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Session'}
      </Button>
    </div>
  );
}
