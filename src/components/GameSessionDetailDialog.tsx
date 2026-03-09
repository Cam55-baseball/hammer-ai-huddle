import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trophy, MapPin, Calendar, Users } from 'lucide-react';

interface GameSession {
  id: string;
  sport: string;
  team_name: string;
  opponent_name: string;
  game_type: string;
  league_level: string;
  game_date: string;
  venue: string | null;
  total_innings: number;
  lineup: any;
  game_summary: any;
  game_mode: string | null;
  is_practice_game: boolean | null;
  status: string;
}

interface Props {
  session: GameSession | null;
  open: boolean;
  onClose: () => void;
}

export function GameSessionDetailDialog({ session, open, onClose }: Props) {
  if (!session) return null;

  const summary = session.game_summary as any;
  const lineup = Array.isArray(session.lineup) ? session.lineup : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            {session.team_name} vs {session.opponent_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meta */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">{session.sport}</Badge>
            <Badge variant="outline" className="capitalize">{session.game_type.replace(/_/g, ' ')}</Badge>
            <Badge variant="secondary">{session.league_level}</Badge>
            {session.is_practice_game && <Badge variant="secondary">Practice</Badge>}
          </div>

          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(session.game_date).toLocaleDateString()}
            </span>
            {session.venue && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {session.venue}
              </span>
            )}
            <span>{session.total_innings} innings</span>
          </div>

          {/* Score Summary */}
          {summary && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2">Game Summary</h4>
                {summary.team_runs !== undefined && (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 rounded bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground">{session.team_name}</p>
                      <p className="text-lg font-bold">{summary.team_runs ?? '-'}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50 text-center">
                      <p className="text-xs text-muted-foreground">{session.opponent_name}</p>
                      <p className="text-lg font-bold">{summary.opponent_runs ?? '-'}</p>
                    </div>
                  </div>
                )}
                {typeof summary === 'object' && !summary.team_runs && (
                  <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(summary, null, 2)}
                  </pre>
                )}
              </div>
            </>
          )}

          {/* Lineup */}
          {lineup.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Users className="h-4 w-4" /> Lineup
                </h4>
                <div className="space-y-1">
                  {lineup.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm p-1.5 rounded bg-muted/30">
                      <span className="font-medium">#{p.batting_order} {p.name}</span>
                      <Badge variant="outline" className="text-xs">{p.position}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
