import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useHIETeamSnapshot } from '@/hooks/useHIETeamSnapshot';
import { GitCompareArrows } from 'lucide-react';
import type { HIESnapshot } from '@/hooks/useHIESnapshot';

interface PlayerComparisonToolProps {
  playerNames?: Record<string, string>;
}

function CompareMetric({ label, a, b }: { label: string; a: number | null; b: number | null }) {
  const aVal = a ?? 0;
  const bVal = b ?? 0;
  const aWins = aVal > bVal;
  const bWins = bVal > aVal;
  return (
    <div className="grid grid-cols-3 gap-2 items-center py-1 border-b last:border-b-0">
      <span className={`text-sm font-medium text-right ${aWins ? 'text-green-600' : bWins ? 'text-red-600' : 'text-muted-foreground'}`}>
        {aVal.toFixed(1)}
      </span>
      <span className="text-xs text-center text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${bWins ? 'text-green-600' : aWins ? 'text-red-600' : 'text-muted-foreground'}`}>
        {bVal.toFixed(1)}
      </span>
    </div>
  );
}

export function PlayerComparisonTool({ playerNames = {} }: PlayerComparisonToolProps) {
  const { playerSnapshots } = useHIETeamSnapshot();
  const [playerA, setPlayerA] = useState<string>('');
  const [playerB, setPlayerB] = useState<string>('');

  if (playerSnapshots.length < 2) return null;

  const snapA = playerSnapshots.find(p => p.user_id === playerA);
  const snapB = playerSnapshots.find(p => p.user_id === playerB);

  const getName = (id: string) => playerNames[id] || `Player ${id.slice(0, 8)}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <GitCompareArrows className="h-5 w-5 text-primary" />
          Player Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select value={playerA} onValueChange={setPlayerA}>
            <SelectTrigger><SelectValue placeholder="Select Player A" /></SelectTrigger>
            <SelectContent>
              {playerSnapshots.filter(p => p.user_id !== playerB).map(p => (
                <SelectItem key={p.user_id} value={p.user_id}>{getName(p.user_id)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={playerB} onValueChange={setPlayerB}>
            <SelectTrigger><SelectValue placeholder="Select Player B" /></SelectTrigger>
            <SelectContent>
              {playerSnapshots.filter(p => p.user_id !== playerA).map(p => (
                <SelectItem key={p.user_id} value={p.user_id}>{getName(p.user_id)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {snapA && snapB && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 items-center pb-2 border-b">
              <span className="text-sm font-bold text-right truncate">{getName(playerA)}</span>
              <span className="text-xs text-center text-muted-foreground">Metric</span>
              <span className="text-sm font-bold truncate">{getName(playerB)}</span>
            </div>
            <CompareMetric label="MPI Score" a={snapA.mpi_score} b={snapB.mpi_score} />
            <CompareMetric label="Readiness" a={snapA.readiness_score} b={snapB.readiness_score} />
            <CompareMetric label="Confidence" a={snapA.development_confidence} b={snapB.development_confidence} />
            <CompareMetric label="Transfer" a={snapA.transfer_score} b={snapB.transfer_score} />
            <CompareMetric label="Decision" a={snapA.decision_speed_index} b={snapB.decision_speed_index} />
            <CompareMetric label="Movement" a={snapA.movement_efficiency_score} b={snapB.movement_efficiency_score} />

            <div className="grid grid-cols-3 gap-2 items-center pt-2">
              <div className="text-right">
                <Badge variant={snapA.development_status === 'improving' ? 'default' : 'secondary'} className="text-xs">
                  {snapA.development_status}
                </Badge>
              </div>
              <span className="text-xs text-center text-muted-foreground">Status</span>
              <div>
                <Badge variant={snapB.development_status === 'improving' ? 'default' : 'secondary'} className="text-xs">
                  {snapB.development_status}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 items-start pt-2">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{snapA.primary_limiter || 'None'}</p>
              </div>
              <span className="text-xs text-center text-muted-foreground">Limiter</span>
              <div>
                <p className="text-xs text-muted-foreground">{snapB.primary_limiter || 'None'}</p>
              </div>
            </div>
          </div>
        )}

        {(!snapA || !snapB) && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Select two players to compare their development analytics side-by-side
          </p>
        )}
      </CardContent>
    </Card>
  );
}
