import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSportTerminology } from '@/hooks/useSportTerminology';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { usePerformanceSession, type DrillBlock } from '@/hooks/usePerformanceSession';
import { SessionTypeSelector } from '@/components/practice/SessionTypeSelector';
import { GameSessionFields } from '@/components/practice/GameSessionFields';
import { RepScorer, type ScoredRep } from '@/components/practice/RepScorer';
import { GameScorecard, type AtBat } from '@/components/practice/GameScorecard';
import { FeelingsPrompt, type FeelingState } from '@/components/practice/FeelingsPrompt';
import { CoachSelector, type CoachSelection } from '@/components/practice/CoachSelector';
import { SeasonContextToggle } from '@/components/practice/SeasonContextToggle';
import { RecentSessionsList } from '@/components/practice/RecentSessionsList';
import { VoiceNoteInput } from '@/components/practice/VoiceNoteInput';
import { Target, Flame, Wind, Shield, Zap, Brain, ArrowLeft, Save, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const modules = [
  { id: 'hitting', icon: Target, label: 'Hitting' },
  { id: 'pitching', icon: Flame, label: 'Pitching' },
  { id: 'throwing', icon: Wind, label: 'Throwing' },
  { id: 'fielding', icon: Shield, label: 'Fielding' },
  { id: 'baserunning', icon: Zap, label: 'Baserunning' },
  { id: 'mental', icon: Brain, label: 'Mental' },
];

type FlowStep = 'select_type' | 'build_session';

export default function PracticeHub() {
  const { t } = useTranslation();
  const { term, sport } = useSportTerminology();
  const { sport: sportKey } = useSportTheme();
  const { createSession, saving } = usePerformanceSession();
  const { toast } = useToast();

  const [activeModule, setActiveModule] = useState('hitting');
  const [step, setStep] = useState<FlowStep>('select_type');
  const [sessionType, setSessionType] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [opponentLevel, setOpponentLevel] = useState('');
  const [seasonContext, setSeasonContext] = useState('in_season');
  const [coachSelection, setCoachSelection] = useState<CoachSelection>({ type: 'none' });
  const [feelings, setFeelings] = useState<FeelingState>({ body: 3, mind: 3 });
  const [showExtras, setShowExtras] = useState(false);

  // Rep-based scoring
  const [reps, setReps] = useState<ScoredRep[]>([]);
  // Game scoring
  const [atBats, setAtBats] = useState<AtBat[]>([]);

  const isGameType = sessionType === 'game' || sessionType === 'live_scrimmage';
  const isHittingOrPitching = activeModule === 'hitting' || activeModule === 'pitching';

  const handleSelectType = (type: string) => {
    setSessionType(type);
    setStep('build_session');
    setReps([]);
    setAtBats([]);
    setNotes('');
    setOpponentName('');
    setOpponentLevel('');
    setFeelings({ body: 3, mind: 3 });
  };

  const handleBack = () => {
    setStep('select_type');
    setSessionType(null);
  };

  // Convert reps/atBats into drill blocks for the backend
  const buildDrillBlocks = (): DrillBlock[] => {
    if (isGameType && atBats.length > 0) {
      // Each at-bat becomes a drill block
      return atBats.map((ab, i) => ({
        id: crypto.randomUUID(),
        drill_type: 'game_ab',
        intent: 'competitive',
        volume: ab.pitches.length,
        execution_grade: ['1B', '2B', '3B', 'HR'].includes(ab.outcome) ? 65 : ab.outcome === 'BB' ? 55 : 35,
        outcome_tags: [ab.outcome],
        notes: `AB${i + 1}: ${ab.outcome} (${ab.pitches.length} pitches)`,
      }));
    }

    if (reps.length > 0) {
      // Group reps into a single drill block
      const qualityMap: Record<string, number> = { barrel: 70, hard: 60, weak: 40, foul: 30, miss: 20 };
      const resultMap: Record<string, number> = { strike: 60, out: 55, ball: 35, hit: 70 };
      
      let totalGrade = 0;
      const outcomeTags: string[] = [];
      
      for (const rep of reps) {
        if (rep.contact_quality) {
          totalGrade += qualityMap[rep.contact_quality] ?? 50;
          if (!outcomeTags.includes(rep.contact_quality)) outcomeTags.push(rep.contact_quality);
        } else if (rep.pitch_result) {
          totalGrade += resultMap[rep.pitch_result] ?? 50;
          if (!outcomeTags.includes(rep.pitch_result)) outcomeTags.push(rep.pitch_result);
        } else {
          totalGrade += 50;
        }
      }

      return [{
        id: crypto.randomUUID(),
        drill_type: activeModule === 'pitching' ? 'pitch_session' : 'hitting_session',
        intent: 'mechanics',
        volume: reps.length,
        execution_grade: Math.round(totalGrade / reps.length),
        outcome_tags: outcomeTags,
      }];
    }

    return [];
  };

  const handleSave = async () => {
    if (!sessionType) return;
    if (isGameType && (!opponentName || !opponentLevel)) {
      toast({ title: 'Missing fields', description: 'Game sessions require opponent name and level.', variant: 'destructive' });
      return;
    }

    const drillBlocks = buildDrillBlocks();
    if (drillBlocks.length === 0 && reps.length === 0 && atBats.length === 0) {
      toast({ title: 'No data', description: 'Score at least one rep or at-bat.', variant: 'destructive' });
      return;
    }

    try {
      await createSession({
        sport: sportKey,
        session_type: sessionType,
        session_date: new Date().toISOString().split('T')[0],
        season_context: seasonContext,
        drill_blocks: drillBlocks,
        notes: notes || undefined,
        opponent_name: isGameType ? opponentName : undefined,
        opponent_level: isGameType ? opponentLevel : undefined,
        module: activeModule,
        coach_id: coachSelection.type === 'assigned' ? coachSelection.coach_id : undefined,
        fatigue_state: {
          body: feelings.body,
          mind: feelings.mind,
          note: feelings.note,
          coach_type: coachSelection.type,
          external_coach_name: coachSelection.type === 'external' ? coachSelection.external_name : undefined,
        },
        micro_layer_data: reps.length > 0 ? reps : isGameType ? atBats.flatMap(ab => ab.pitches) : undefined,
      });
      // Reset
      setStep('select_type');
      setSessionType(null);
      setReps([]);
      setAtBats([]);
      setNotes('');
    } catch {
      // Error toast handled by hook
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Practice Intelligence</h1>
          <p className="text-muted-foreground">Log sessions, track progress, and build your MPI score</p>
        </div>

        <Tabs value={activeModule} onValueChange={setActiveModule} className="space-y-4">
          <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
            {modules.map(mod => (
              <TabsTrigger key={mod.id} value={mod.id} className="flex items-center gap-1.5 text-xs md:text-sm">
                <mod.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{mod.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {modules.map(mod => (
            <TabsContent key={mod.id} value={mod.id} className="space-y-4">
              {step === 'select_type' && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <mod.icon className="h-5 w-5 text-primary" />
                        Start {mod.label} Session
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SessionTypeSelector value={sessionType} onChange={handleSelectType} />
                    </CardContent>
                  </Card>

                  <RecentSessionsList sport={sportKey} moduleLabel={mod.label} />
                </>
              )}

              {step === 'build_session' && sessionType && (
                <>
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                    <h2 className="text-lg font-semibold capitalize">{sessionType.replace(/_/g, ' ')}</h2>
                  </div>

                  {/* Feelings prompt - always first */}
                  <FeelingsPrompt value={feelings} onChange={setFeelings} />

                  {/* Game fields */}
                  {isGameType && (
                    <Card>
                      <CardContent className="pt-4">
                        <GameSessionFields
                          opponentName={opponentName}
                          opponentLevel={opponentLevel}
                          onNameChange={setOpponentName}
                          onLevelChange={setOpponentLevel}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Main scoring area */}
                  {isGameType && isHittingOrPitching ? (
                    <GameScorecard
                      module={activeModule}
                      atBats={atBats}
                      onAtBatsChange={setAtBats}
                    />
                  ) : isHittingOrPitching ? (
                    <RepScorer
                      module={activeModule}
                      reps={reps}
                      onRepsChange={setReps}
                    />
                  ) : (
                    <RepScorer
                      module={activeModule}
                      reps={reps}
                      onRepsChange={setReps}
                    />
                  )}

                  {/* Expandable extras */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => setShowExtras(!showExtras)}
                  >
                    {showExtras ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                    {showExtras ? 'Less Options' : 'More Options'}
                  </Button>

                  {showExtras && (
                    <div className="space-y-4">
                      <CoachSelector value={coachSelection} onChange={setCoachSelection} />
                      <SeasonContextToggle value={seasonContext} onChange={setSeasonContext} />
                      <VoiceNoteInput value={notes} onChange={setNotes} />
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSave}
                    disabled={saving || (reps.length === 0 && atBats.length === 0)}
                  >
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Session ({isGameType ? `${atBats.length} ABs` : `${reps.length} reps`})
                  </Button>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
