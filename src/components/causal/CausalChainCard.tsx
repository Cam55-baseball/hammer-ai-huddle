import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CausalChain, Severity } from '@/lib/causalContract';

interface Props {
  chain: CausalChain;
  nonNegotiable?: boolean;
  severity?: Severity;
  className?: string;
}

const LINK_LABELS = [
  { key: 'trigger', label: 'When' },
  { key: 'cause', label: 'Cause' },
  { key: 'mechanism', label: 'Why it breaks down' },
  { key: 'result', label: 'What shows up' },
  { key: 'fix', label: 'Fix' },
] as const;

const SEVERITY_LABEL: Record<Exclude<Severity, null>, string> = {
  hard: 'Hard violation',
  soft: 'Soft violation',
  standard: 'Violation',
  secondary: 'Secondary',
  elite: 'Elite',
};

export function CausalChainCard({ chain, nonNegotiable, severity, className }: Props) {
  const [showCoach, setShowCoach] = useState(false);
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            Cause &rarr; Effect: {chain.phaseName}
          </CardTitle>
          <div className="flex gap-1">
            {nonNegotiable && <Badge variant="destructive">{chain.phaseId} • Non-negotiable</Badge>}
            {!nonNegotiable && <Badge variant="secondary">{chain.phaseId}</Badge>}
            {severity && severity !== 'standard' && (
              <Badge variant={severity === 'elite' ? 'default' : 'outline'}>
                {SEVERITY_LABEL[severity]}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {LINK_LABELS.map(({ key, label }) => {
          const link = chain[key];
          const isFix = key === 'fix';
          return (
            <div
              key={key}
              className={`rounded-md border p-3 ${isFix ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/30'}`}
            >
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className={`mt-1 text-sm ${isFix ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                {link.athlete}
              </div>
              {showCoach && (
                <div className="mt-2 text-xs italic text-muted-foreground">
                  Coach&apos;s note: {link.coach_note}
                </div>
              )}
            </div>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setShowCoach((v) => !v)}
        >
          {showCoach ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
          {showCoach ? "Hide Coach's notes" : "Show Coach's notes"}
        </Button>
      </CardContent>
    </Card>
  );
}
