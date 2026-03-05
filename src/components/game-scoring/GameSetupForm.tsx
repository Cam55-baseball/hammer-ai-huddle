import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { baseballLeagueDistances } from '@/data/baseball/leagueDistances';
import { softballLeagueDistances } from '@/data/softball/leagueDistances';
import { getCompetitionLevelsByCategory, findKnownSummerLeague } from '@/data/competitionWeighting';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { GameSetup, LineupPlayer } from '@/hooks/useGameScoring';

const POSITIONS_BASEBALL = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const POSITIONS_SOFTBALL = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DP', 'FLEX'];
const GAME_TYPES = [
  { value: 'league', label: 'League' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'scrimmage', label: 'Scrimmage' },
];

interface GameSetupFormProps {
  onSubmit: (setup: GameSetup) => void;
  saving?: boolean;
}

export function GameSetupForm({ onSubmit, saving }: GameSetupFormProps) {
  const { sport, isSoftball } = useSportTheme();
  const { toast } = useToast();
  const distances = isSoftball ? softballLeagueDistances : baseballLeagueDistances;
  const positions = isSoftball ? POSITIONS_SOFTBALL : POSITIONS_BASEBALL;
  const defaultInnings = isSoftball ? 7 : 9;
  const competitionCategories = useMemo(() => getCompetitionLevelsByCategory(sport as 'baseball' | 'softball'), [sport]);

  const [teamName, setTeamName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [gameType, setGameType] = useState<string>('league');
  const [leagueLevel, setLeagueLevel] = useState<string>('');
  const [baseDist, setBaseDist] = useState<number>(90);
  const [moundDist, setMoundDist] = useState<number>(60.5);
  const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]);
  const [venue, setVenue] = useState('');
  const [totalInnings, setTotalInnings] = useState(defaultInnings);
  const [lineup, setLineup] = useState<LineupPlayer[]>([
    { id: crypto.randomUUID(), name: '', position: '', batting_order: 1 },
  ]);
  const [startingPitcher, setStartingPitcher] = useState('');
  const [competitionLevel, setCompetitionLevel] = useState<string>('');
  const [summerLeagueName, setSummerLeagueName] = useState('');
  const [classifyingLeague, setClassifyingLeague] = useState(false);

  const handleLeagueChange = (level: string) => {
    setLeagueLevel(level);
    const found = distances.find(d => d.level === level);
    if (found) {
      setBaseDist(found.bases_ft);
      setMoundDist(found.mound_ft);
    }
  };

  const addPlayer = () => {
    if (lineup.length >= 15) return;
    setLineup(prev => [...prev, {
      id: crypto.randomUUID(),
      name: '',
      position: '',
      batting_order: prev.length + 1,
    }]);
  };

  const removePlayer = (id: string) => {
    setLineup(prev => prev.filter(p => p.id !== id).map((p, i) => ({ ...p, batting_order: i + 1 })));
  };

  const updatePlayer = (id: string, field: keyof LineupPlayer, value: string | number) => {
    setLineup(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const isValid = useMemo(() => {
    return teamName.trim() && opponentName.trim() && gameType && leagueLevel
      && lineup.filter(p => p.name.trim()).length >= 1;
  }, [teamName, opponentName, gameType, leagueLevel, lineup]);

  const classifySummerLeague = async () => {
    if (!summerLeagueName.trim()) return;
    // Check known leagues first
    const known = findKnownSummerLeague(sport as 'baseball' | 'softball', summerLeagueName);
    if (known) {
      toast({ title: 'League found', description: `${known.name}: ${known.difficulty_multiplier}x multiplier` });
      return;
    }
    setClassifyingLeague(true);
    try {
      const { data, error } = await supabase.functions.invoke('classify-league', {
        body: { league_name: summerLeagueName, sport, country: '' },
      });
      if (error) throw error;
      toast({
        title: 'League classified',
        description: `${summerLeagueName}: ${data.difficulty_multiplier}x (${data.confidence} confidence)`,
      });
    } catch {
      toast({ title: 'Classification failed', variant: 'destructive' });
    } finally {
      setClassifyingLeague(false);
    }
  };

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      sport: sport as 'baseball' | 'softball',
      team_name: teamName,
      opponent_name: opponentName,
      game_type: gameType as any,
      league_level: leagueLevel,
      base_distance_ft: baseDist,
      mound_distance_ft: moundDist,
      game_date: gameDate,
      venue,
      total_innings: totalInnings,
      lineup: lineup.filter(p => p.name.trim()),
      starting_pitcher_id: startingPitcher,
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Game Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Team Playing For <span className="text-destructive">*</span></Label>
              <Input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Your team name" />
            </div>
            <div>
              <Label>Opponent <span className="text-destructive">*</span></Label>
              <Input value={opponentName} onChange={e => setOpponentName(e.target.value)} placeholder="Opponent name" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Game Type <span className="text-destructive">*</span></Label>
              <Select value={gameType} onValueChange={setGameType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GAME_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>League Level <span className="text-destructive">*</span></Label>
              <Select value={leagueLevel} onValueChange={handleLeagueChange}>
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  {distances.map(d => <SelectItem key={d.level} value={d.level}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Base Distance (ft)</Label>
              <Input type="number" value={baseDist} onChange={e => setBaseDist(Number(e.target.value))} />
            </div>
            <div>
              <Label>Mound Distance (ft)</Label>
              <Input type="number" value={moundDist} onChange={e => setMoundDist(Number(e.target.value))} step="0.5" />
            </div>
            <div>
              <Label>Total Innings</Label>
              <Input type="number" value={totalInnings} onChange={e => setTotalInnings(Number(e.target.value))} min={1} max={15} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Game Date</Label>
              <Input type="date" value={gameDate} onChange={e => setGameDate(e.target.value)} />
            </div>
            <div>
              <Label>Venue</Label>
              <Input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Field / Stadium" />
            </div>
          </div>

          {/* Competition Level */}
          <div>
            <Label>Competition Level</Label>
            <div className="space-y-2 mt-1.5">
              {competitionCategories.map(cat => (
                <div key={cat.category}>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{cat.label}</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {cat.levels.map(l => (
                      <button
                        key={l.key}
                        type="button"
                        onClick={() => setCompetitionLevel(l.key)}
                        className={cn(
                          'rounded-md border px-2 py-1 text-xs font-medium transition-all',
                          competitionLevel === l.key
                            ? 'bg-primary/20 border-primary text-primary ring-1 ring-primary'
                            : 'bg-muted/30 border-border hover:bg-muted text-muted-foreground'
                        )}
                      >
                        {l.label}
                        <span className="ml-1 text-[9px] opacity-60">{l.competition_weight_multiplier}x</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summer League Classification */}
          {competitionLevel === 'summer_generic' && (
            <div>
              <Label>Summer League Name</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={summerLeagueName}
                  onChange={e => setSummerLeagueName(e.target.value)}
                  placeholder="e.g. Cape Cod League"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={classifySummerLeague}
                  disabled={classifyingLeague || !summerLeagueName.trim()}
                >
                  {classifyingLeague ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Classify'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Starting Lineup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {lineup.map((player, idx) => (
            <div key={player.id} className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground w-6 text-center">{idx + 1}</span>
              <Input
                className="flex-1"
                placeholder="Player name"
                value={player.name}
                onChange={e => updatePlayer(player.id, 'name', e.target.value)}
              />
              <Select value={player.position} onValueChange={v => updatePlayer(player.id, 'position', v)}>
                <SelectTrigger className="w-20"><SelectValue placeholder="Pos" /></SelectTrigger>
                <SelectContent>
                  {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              {lineup.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removePlayer(player.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addPlayer} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Add Player
          </Button>

          <div className="pt-2">
            <Label>Starting Pitcher</Label>
            <Select value={startingPitcher} onValueChange={setStartingPitcher}>
              <SelectTrigger><SelectValue placeholder="Select pitcher" /></SelectTrigger>
              <SelectContent>
                {lineup.filter(p => p.name.trim()).map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={!isValid || saving} className="w-full" size="lg">
        {saving ? 'Creating...' : 'Start Scoring'} <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
