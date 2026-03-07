import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, ArrowRight, Loader2, GripVertical } from 'lucide-react';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { baseballLeagueDistances } from '@/data/baseball/leagueDistances';
import { softballLeagueDistances } from '@/data/softball/leagueDistances';
import { getCompetitionLevelsByCategory, findKnownSummerLeague } from '@/data/competitionWeighting';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { GameSetup, LineupPlayer } from '@/hooks/useGameScoring';
import { useCoachPlayerPool } from '@/hooks/useCoachPlayerPool';
import { useOrganization } from '@/hooks/useOrganization';
import { usePlayerOrganization } from '@/hooks/usePlayerOrganization';
import { PlayerSearchCombobox } from './PlayerSearchCombobox';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const POSITIONS_BASEBALL = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const POSITIONS_SOFTBALL = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DP', 'FLEX'];
const GAME_TYPES = [
  { value: 'regular_season', label: 'Regular Season' },
  { value: 'intrasquad', label: 'Intrasquad' },
  { value: 'scrimmage', label: 'Scrimmage' },
  { value: 'showcase_tournament', label: 'Showcase / Tournament' },
];

interface GameSetupFormProps {
  onSubmit: (setup: GameSetup) => void;
  saving?: boolean;
}

function SortableLineupRow({
  player,
  index,
  positions,
  onUpdate,
  onRemove,
  canRemove,
}: {
  player: LineupPlayer;
  index: number;
  positions: string[];
  onUpdate: (id: string, field: keyof LineupPlayer, value: string | number) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button type="button" className="cursor-grab touch-none text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-xs font-bold text-muted-foreground w-6 text-center">{index + 1}</span>
      <Input
        className="flex-1"
        placeholder="Player name"
        value={player.name}
        onChange={e => onUpdate(player.id, 'name', e.target.value)}
        readOnly={!!player.player_user_id}
      />
      <Select value={player.position} onValueChange={v => onUpdate(player.id, 'position', v)}>
        <SelectTrigger className="w-20"><SelectValue placeholder="Pos" /></SelectTrigger>
        <SelectContent>
          {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>
      {canRemove && (
        <Button variant="ghost" size="icon" onClick={() => onRemove(player.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );
}

export function GameSetupForm({ onSubmit, saving }: GameSetupFormProps) {
  const { sport, isSoftball } = useSportTheme();
  const { toast } = useToast();
  const distances = isSoftball ? softballLeagueDistances : baseballLeagueDistances;
  const positions = isSoftball ? POSITIONS_SOFTBALL : POSITIONS_BASEBALL;
  const defaultInnings = isSoftball ? 7 : 9;
  const competitionCategories = useMemo(() => getCompetitionLevelsByCategory(sport as 'baseball' | 'softball'), [sport]);
  const { data: poolPlayers = [], isLoading: poolLoading } = useCoachPlayerPool();
  const { myOrgs } = useOrganization();
  const { orgName } = usePlayerOrganization();

  const [teamName, setTeamName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [gameType, setGameType] = useState<string>('regular_season');
  const [leagueLevel, setLeagueLevel] = useState<string>('');
  const [baseDist, setBaseDist] = useState<number>(90);
  const [moundDist, setMoundDist] = useState<number>(60.5);
  const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]);
  const [venue, setVenue] = useState('');
  const [totalInnings, setTotalInnings] = useState(defaultInnings);
  const [lineup, setLineup] = useState<LineupPlayer[]>([]);
  const [startingPitcher, setStartingPitcher] = useState('');
  const [competitionLevel, setCompetitionLevel] = useState<string>('');
  const [summerLeagueName, setSummerLeagueName] = useState('');
  const [classifyingLeague, setClassifyingLeague] = useState(false);
  const [gameMode, setGameMode] = useState<'team' | 'single_player'>('team');
  const [singlePlayerName, setSinglePlayerName] = useState('');
  const [singlePlayerPosition, setSinglePlayerPosition] = useState('');
  const [isPracticeGame, setIsPracticeGame] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Auto-populate player name from profile
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase.from('profiles').select('full_name').eq('id', authUser.id).single();
      if (data?.full_name) {
        setSinglePlayerName(data.full_name);
        setProfileLoaded(true);
      }
    };
    fetchProfile();
  }, []);

  // Auto-populate team name from organization
  useEffect(() => {
    const autoName = myOrgs.data?.[0]?.name || orgName;
    if (autoName && !teamName) {
      setTeamName(autoName);
    }
  }, [myOrgs.data, orgName]); // intentionally omit teamName to avoid overriding user edits

  const selectedPlayerIds = useMemo(() => new Set(lineup.filter(p => p.player_user_id).map(p => p.player_user_id!)), [lineup]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleLeagueChange = (level: string) => {
    setLeagueLevel(level);
    const found = distances.find(d => d.level === level);
    if (found) {
      setBaseDist(found.bases_ft);
      setMoundDist(found.mound_ft);
    }
  };

  const addCustomPlayer = () => {
    if (lineup.length >= 15) return;
    setLineup(prev => [...prev, {
      id: crypto.randomUUID(),
      name: '',
      position: '',
      batting_order: prev.length + 1,
    }]);
  };

  const addPoolPlayer = (poolPlayer: { id: string; name: string; position: string | null }) => {
    if (lineup.length >= 15) return;
    setLineup(prev => [...prev, {
      id: crypto.randomUUID(),
      name: poolPlayer.name,
      position: poolPlayer.position ?? '',
      batting_order: prev.length + 1,
      player_user_id: poolPlayer.id,
    }]);
  };

  const removePlayer = (id: string) => {
    setLineup(prev => prev.filter(p => p.id !== id).map((p, i) => ({ ...p, batting_order: i + 1 })));
  };

  const updatePlayer = (id: string, field: keyof LineupPlayer, value: string | number) => {
    setLineup(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLineup(prev => {
      const oldIdx = prev.findIndex(p => p.id === active.id);
      const newIdx = prev.findIndex(p => p.id === over.id);
      return arrayMove(prev, oldIdx, newIdx).map((p, i) => ({ ...p, batting_order: i + 1 }));
    });
  };

  const isValid = useMemo(() => {
    if (gameMode === 'single_player') {
      return teamName.trim() && opponentName.trim() && gameType && leagueLevel;
    }
    return teamName.trim() && opponentName.trim() && gameType && leagueLevel
      && lineup.filter(p => p.name.trim()).length >= 1;
  }, [teamName, opponentName, gameType, leagueLevel, lineup, gameMode, singlePlayerName]);

  const classifySummerLeague = async () => {
    if (!summerLeagueName.trim()) return;
    const known = findKnownSummerLeague(sport as 'baseball' | 'softball', summerLeagueName);
    if (known) {
      toast({ title: 'League found', description: `${known.name} recognized` });
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
        description: `${summerLeagueName} classified (${data.confidence} confidence)`,
      });
    } catch {
      toast({ title: 'Classification failed', variant: 'destructive' });
    } finally {
      setClassifyingLeague(false);
    }
  };

  const handleSubmit = () => {
    if (!isValid) return;
    const finalLineup = gameMode === 'single_player'
      ? [{
          id: crypto.randomUUID(),
          name: singlePlayerName.trim(),
          position: singlePlayerPosition || 'DH',
          batting_order: 1,
        }]
      : lineup.filter(p => p.name.trim());
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
      lineup: finalLineup,
      starting_pitcher_id: gameMode === 'single_player' ? '' : startingPitcher,
      game_mode: gameMode,
      is_practice_game: isPracticeGame,
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

      {/* Game Mode selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Game Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setGameMode('team')}
              className={cn(
                'rounded-lg border-2 p-4 text-center transition-all',
                gameMode === 'team' ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'
              )}
            >
              <div className="text-sm font-bold">Team Game</div>
              <div className="text-[10px] text-muted-foreground mt-1">Full roster lineup</div>
            </button>
            <button
              type="button"
              onClick={() => setGameMode('single_player')}
              className={cn(
                'rounded-lg border-2 p-4 text-center transition-all',
                gameMode === 'single_player' ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground'
              )}
            >
              <div className="text-sm font-bold">Single Player</div>
              <div className="text-[10px] text-muted-foreground mt-1">Log your own game</div>
            </button>
          </div>

          {gameMode === 'single_player' && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsPracticeGame(false)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-xs font-medium transition-all',
                    !isPracticeGame ? 'bg-primary text-primary-foreground ring-1 ring-primary' : 'bg-muted/30 hover:bg-muted/50'
                  )}
                >Real Game</button>
                <button
                  type="button"
                  onClick={() => setIsPracticeGame(true)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-xs font-medium transition-all',
                    isPracticeGame ? 'bg-primary text-primary-foreground ring-1 ring-primary' : 'bg-muted/30 hover:bg-muted/50'
                  )}
                >Practice Game</button>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Logging Game For</Label>
                <div className="mt-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm font-medium">
                  {singlePlayerName || 'You'}
                </div>
              </div>
                <div>
                  <Label>Position</Label>
                  <Select value={singlePlayerPosition} onValueChange={setSinglePlayerPosition}>
                    <SelectTrigger><SelectValue placeholder="Pos" /></SelectTrigger>
                    <SelectContent>
                      {positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team lineup — only for team mode */}
      {gameMode === 'team' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Starting Lineup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Add from roster */}
            <PlayerSearchCombobox
              players={poolPlayers}
              selectedIds={selectedPlayerIds}
              onSelect={addPoolPlayer}
              isLoading={poolLoading}
            />

            {/* Sortable lineup */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={lineup.map(p => p.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {lineup.map((player, idx) => (
                    <SortableLineupRow
                      key={player.id}
                      player={player}
                      index={idx}
                      positions={positions}
                      onUpdate={updatePlayer}
                      onRemove={removePlayer}
                      canRemove={lineup.length > 0}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <Button variant="outline" size="sm" onClick={addCustomPlayer} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Add Custom Player
            </Button>

            {lineup.filter(p => p.name.trim()).length > 0 && (
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
            )}
          </CardContent>
        </Card>
      )}

      <Button onClick={handleSubmit} disabled={!isValid || saving} className="w-full" size="lg">
        {saving ? 'Creating...' : 'Start Scoring'} <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
