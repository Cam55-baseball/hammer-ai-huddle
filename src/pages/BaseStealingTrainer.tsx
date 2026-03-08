import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SessionSetup, type LeadConfig } from '@/components/base-stealing/SessionSetup';
import { LiveRepRunner, type RepResult } from '@/components/base-stealing/LiveRepRunner';
import { PostRepInput } from '@/components/base-stealing/PostRepInput';
import { SessionSummary } from '@/components/base-stealing/SessionSummary';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { usePerformanceSession, type DrillBlock } from '@/hooks/usePerformanceSession';
import { useToast } from '@/hooks/use-toast';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { useEffect } from 'react';

type Phase = 'setup' | 'live_rep' | 'post_rep' | 'summary';

export default function BaseStealingTrainer() {
  const navigate = useNavigate();
  const { sport } = useSportTheme();
  const { createSession, saving } = usePerformanceSession();
  const { toast } = useToast();

  useEffect(() => {
    if (sport && sport !== 'baseball') {
      navigate('/practice');
    }
  }, [sport, navigate]);

  const [phase, setPhase] = useState<Phase>('setup');
  const [config, setConfig] = useState<LeadConfig | null>(null);
  const [reps, setReps] = useState<RepResult[]>([]);
  const [currentResult, setCurrentResult] = useState<RepResult | null>(null);
  const [repCounter, setRepCounter] = useState(1);

  const handleStart = (cfg: LeadConfig) => {
    setConfig(cfg);
    setReps([]);
    setRepCounter(1);
    setPhase('live_rep');
  };

  const handleRepComplete = useCallback((result: RepResult) => {
    setCurrentResult(result);
    setPhase('post_rep');
  }, []);

  const handleNextRep = (enriched: RepResult) => {
    setReps(prev => [...prev, enriched]);
    setCurrentResult(null);
    setRepCounter(c => c + 1);
    setPhase('live_rep');
  };

  const handleEndFromRep = () => {
    if (reps.length > 0) {
      setPhase('summary');
    }
  };

  const handleEndSession = (enriched: RepResult) => {
    setReps(prev => [...prev, enriched]);
    setCurrentResult(null);
    setPhase('summary');
  };

  const handleDeleteRep = () => {
    // Discard current result, go back to live_rep without incrementing
    setCurrentResult(null);
    setPhase('live_rep');
  };

  const handleSave = async () => {
    if (!config || reps.length === 0) return;

    const drillBlocks: DrillBlock[] = [{
      id: crypto.randomUUID(),
      drill_type: 'base_stealing',
      intent: 'reaction',
      volume: reps.length,
      execution_grade: Math.round((reps.filter(r => r.decisionCorrect).length / reps.length) * 100),
      outcome_tags: [
        `${reps.filter(r => r.decisionCorrect).length}/${reps.length} correct`,
        ...(reps.some(r => r.eliteJump) ? ['elite_jump'] : []),
      ],
    }];

    const microLayerData = reps.map(r => ({
      signal_type: r.signalType,
      signal_value: r.signalValue,
      decision_time_sec: r.decisionTimeSec,
      decision_correct: r.decisionCorrect,
      elite_jump: r.eliteJump,
      delay_before_signal_sec: r.delayBeforeSignalMs / 1000,
      steps_taken: r.stepsTaken,
      time_to_base_sec: r.timeToBaseSec,
      base_distance_ft: r.baseDistanceFt,
    }));

    const sessionId = await createSession({
      sport: sport || 'baseball',
      session_type: 'base_stealing',
      session_date: new Date().toISOString().split('T')[0],
      module: 'baserunning',
      notes: `Base Stealing: ${config.targetBase}, Difficulty: ${config.difficulty}, Signal: ${config.signalMode}, Base: ${config.baseDistanceFt}ft, Lead: ${config.leadDistanceFt || 'N/A'}ft`,
      drill_blocks: drillBlocks,
      micro_layer_data: microLayerData,
    });

    if (sessionId) {
      toast({ title: 'Session saved!', description: `${reps.length} reps logged.` });
      navigate('/practice?module=baserunning');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-4 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => phase === 'setup' ? navigate(-1) : setPhase('setup')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Base Stealing</h1>
            <p className="text-sm text-muted-foreground">Reaction training — Baseball only</p>
          </div>
        </div>

        {phase === 'setup' && <SessionSetup onStart={handleStart} />}

        {phase === 'live_rep' && config && (
          <LiveRepRunner
            config={config}
            repNumber={repCounter}
            onRepComplete={handleRepComplete}
            onEndSession={handleEndFromRep}
          />
        )}

        {phase === 'post_rep' && currentResult && (
          <PostRepInput
            result={currentResult}
            onNextRep={handleNextRep}
            onEndSession={handleEndSession}
            onDeleteRep={handleDeleteRep}
          />
        )}

        {phase === 'summary' && config && (
          <SessionSummary reps={reps} config={config} onSave={handleSave} saving={saving} />
        )}
      </div>
    </DashboardLayout>
  );
}
