import { cn } from '@/lib/utils';

interface LinescoreBarProps {
  totalInnings: number;
  currentInning: number;
  inningRuns: Record<string, number>;
  teamName: string;
  opponentName: string;
  teamHits: number;
  opponentHits: number;
  teamErrors: number;
  opponentErrors: number;
}

export function LinescoreBar({
  totalInnings, currentInning, inningRuns,
  teamName, opponentName,
  teamHits, opponentHits,
  teamErrors, opponentErrors,
}: LinescoreBarProps) {
  const innings = Array.from({ length: totalInnings }, (_, i) => i + 1);

  const totalTeamRuns = innings.reduce((sum, i) => sum + (inningRuns[`B${i}`] ?? 0), 0);
  const totalOppRuns = innings.reduce((sum, i) => sum + (inningRuns[`T${i}`] ?? 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left p-1.5 font-semibold min-w-[100px] border-r border-border">&nbsp;</th>
            {innings.map(i => (
              <th key={i} className={cn(
                'p-1.5 font-semibold min-w-[28px] text-center border-r border-border',
                i === currentInning && 'bg-primary/15 text-primary'
              )}>{i}</th>
            ))}
            <th className="p-1.5 font-bold min-w-[32px] text-center border-r border-border bg-muted/80">R</th>
            <th className="p-1.5 font-bold min-w-[32px] text-center border-r border-border bg-muted/80">H</th>
            <th className="p-1.5 font-bold min-w-[32px] text-center bg-muted/80">E</th>
          </tr>
        </thead>
        <tbody>
          {/* Opponent (visitors — top of inning) */}
          <tr className="border-b border-border">
            <td className="p-1.5 font-medium border-r border-border truncate max-w-[100px]">{opponentName}</td>
            {innings.map(i => (
              <td key={i} className={cn(
                'p-1.5 text-center tabular-nums border-r border-border',
                i === currentInning && 'bg-primary/5'
              )}>
                {inningRuns[`T${i}`] !== undefined ? inningRuns[`T${i}`] : (i < currentInning ? '0' : '—')}
              </td>
            ))}
            <td className="p-1.5 text-center font-bold tabular-nums border-r border-border">{totalOppRuns}</td>
            <td className="p-1.5 text-center tabular-nums border-r border-border">{opponentHits}</td>
            <td className="p-1.5 text-center tabular-nums">{opponentErrors}</td>
          </tr>
          {/* Team (home — bottom of inning) */}
          <tr>
            <td className="p-1.5 font-medium border-r border-border truncate max-w-[100px]">{teamName}</td>
            {innings.map(i => (
              <td key={i} className={cn(
                'p-1.5 text-center tabular-nums border-r border-border',
                i === currentInning && 'bg-primary/5'
              )}>
                {inningRuns[`B${i}`] !== undefined ? inningRuns[`B${i}`] : (i < currentInning ? '0' : '—')}
              </td>
            ))}
            <td className="p-1.5 text-center font-bold tabular-nums border-r border-border">{totalTeamRuns}</td>
            <td className="p-1.5 text-center tabular-nums border-r border-border">{teamHits}</td>
            <td className="p-1.5 text-center tabular-nums">{teamErrors}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
