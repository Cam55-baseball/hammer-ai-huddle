import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Zap, Plus, Save, Trash2, HelpCircle } from 'lucide-react';
import { RepReviewPlayer } from './RepReviewPlayer';
import type { RepResult } from './LiveRepRunner';
import type { LeadConfig } from './SessionSetup';

interface PostRepInputProps {
  result: RepResult;
  config: LeadConfig;
  onNextRep: (updated: RepResult) => void;
  onEndSession: (updated: RepResult) => void;
  onDeleteRep: () => void;
}

const CONFIDENCE_STYLES: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
  high: { variant: 'default', label: 'High Confidence' },
  medium: { variant: 'secondary', label: 'Medium Confidence' },
  low: { variant: 'destructive', label: 'Low Confidence' },
};

export function PostRepInput({ result, config, onNextRep, onEndSession, onDeleteRep }: PostRepInputProps) {
  const [stepsTaken, setStepsTaken] = useState('');
  const [timeToBase, setTimeToBase] = useState('');
  const [baseDist, setBaseDist] = useState(config.baseDistanceFt || '');

  const enriched: RepResult = {
    ...result,
    stepsTaken: stepsTaken ? Number(stepsTaken) : undefined,
    timeToBaseSec: timeToBase ? Number(timeToBase) : undefined,
    baseDistanceFt: baseDist ? Number(baseDist) : undefined,
  };

  const confidenceInfo = CONFIDENCE_STYLES[result.aiConfidence || 'medium'];
  const hasAiResult = result.decisionCorrect !== null;

  return (
    <div className="max-w-md mx-auto space-y-5">
      {/* Result summary */}
      <Card className={hasAiResult ? (result.decisionCorrect ? 'border-green-500/50' : 'border-red-500/50') : 'border-muted'}>
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasAiResult ? (
                result.decisionCorrect ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )
              ) : (
                <HelpCircle className="h-6 w-6 text-muted-foreground" />
              )}
              <span className="text-lg font-bold">
                {hasAiResult
                  ? result.decisionCorrect ? 'Correct Decision!' : 'Wrong Decision'
                  : 'Analysis Unavailable'}
              </span>
            </div>
            {result.aiConfidence && (
              <Badge variant={confidenceInfo.variant} className="text-xs">
                {confidenceInfo.label}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Signal:</span>{' '}
              <span className="font-medium">{result.signalValue}</span>
            </div>
            {result.decisionTimeSec !== null && (
              <div>
                <span className="text-muted-foreground">Reaction Time:</span>{' '}
                <span className="font-medium">{result.decisionTimeSec.toFixed(2)}s</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Expected:</span>{' '}
              <span className="font-medium uppercase">{result.signalType}</span>
            </div>
            {result.signalType === 'go' && result.firstTwoStepsSec != null && (
              <div>
                <span className="text-muted-foreground">First 2 Steps:</span>{' '}
                <span className="font-medium">{result.firstTwoStepsSec.toFixed(2)}s</span>
              </div>
            )}
            {result.eliteJump && (
              <div className="flex items-center gap-1 text-amber-500 font-bold">
                <Zap className="h-4 w-4" /> Elite Jump!
              </div>
            )}
          </div>

          {result.aiReasoning && (
            <p className="text-xs text-muted-foreground italic border-t border-border pt-2">
              Hammer: {result.aiReasoning}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Video review */}
      {result.videoBlob && (
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground font-medium mb-2">Rep Video Review</p>
            <RepReviewPlayer videoBlob={result.videoBlob} />
          </CardContent>
        </Card>
      )}

      {/* Optional data */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <p className="text-xs text-muted-foreground font-medium">Optional — add rep details</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Steps Taken</Label>
              <Input type="number" placeholder="—" value={stepsTaken} onChange={e => setStepsTaken(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Time to Base (s)</Label>
              <Input type="number" step="0.01" placeholder="—" value={timeToBase} onChange={e => setTimeToBase(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Base Dist (ft)</Label>
              <Input type="number" placeholder="—" value={baseDist} onChange={e => setBaseDist(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button className="flex-1 gap-2" onClick={() => onNextRep(enriched)}>
          <Plus className="h-4 w-4" /> Next Rep
        </Button>
        <Button variant="outline" className="flex-1 gap-2" onClick={() => onEndSession(enriched)}>
          <Save className="h-4 w-4" /> Save & End
        </Button>
      </div>
      <Button variant="ghost" className="w-full gap-2 text-destructive hover:text-destructive" onClick={onDeleteRep}>
        <Trash2 className="h-4 w-4" /> Delete Rep
      </Button>
    </div>
  );
}
