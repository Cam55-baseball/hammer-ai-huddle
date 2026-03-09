import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SoftballStealSetup, type StealSetupConfig } from '@/components/softball-stealing/SoftballStealSetup';
import { SoftballStealRepRunner, type RepData } from '@/components/softball-stealing/SoftballStealRepRunner';
import { SoftballStealSummary } from '@/components/softball-stealing/SoftballStealSummary';
import { SoftballStealAnalysis } from '@/components/softball-stealing/SoftballStealAnalysis';
import { useAuth } from '@/hooks/useAuth';
import { usePerformanceSession } from '@/hooks/usePerformanceSession';
import { buildStealProfile, type SoftballStealProfile } from '@/lib/softballStealAnalytics';

type Phase = 'setup' | 'live_rep' | 'summary' | 'analysis';

export default function SoftballStealingTrainer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createSession, saving } = usePerformanceSession();
  const [phase, setPhase] = useState<Phase>('setup');
  const [config, setConfig] = useState<StealSetupConfig | null>(null);
  const [reps, setReps] = useState<RepData[]>([]);
  const [currentRepNum, setCurrentRepNum] = useState(1);
  const [profile, setProfile] = useState<SoftballStealProfile | null>(null);

  // Sport guard
  useEffect(() => {
    const sport = localStorage.getItem('selectedSport');
    if (sport && sport !== 'softball') {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Auth guard
  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  const handleSetupComplete = (cfg: StealSetupConfig) => {
    setConfig(cfg);
    setPhase('live_rep');
  };

  const handleRepComplete = (rep: RepData) => {
    setReps(prev => [...prev, rep]);
    setCurrentRepNum(n => n + 1);
    // Stay in live_rep phase for next rep (auto-starts idle)
  };

  const handleDeleteRep = () => {
    // Just stay in idle state for same rep number
  };

  const handleEndSession = () => {
    if (reps.length === 0) return;
    setPhase('summary');
  };

  const handleSave = async () => {
    if (!config || reps.length === 0) return;

    const goReps = reps.filter(r => r.signalResult === 'go' && r.timeToBase);
    const drillBlocks = [{
      id: crypto.randomUUID(),
      drill_type: 'softball_stealing',
      intent: 'reaction',
      volume: reps.length,
      execution_grade: 50,
      outcome_tags: [],
      notes: `${config.baseTarget} base, ${config.baseDistance}ft`,
    }];

    const microLayerData = reps.map(r => ({
      signal_type: config.signalType,
      signal_value: r.signalValue,
      signal_result: r.signalResult,
      two_step_time_sec: r.twoStepTime,
      time_to_base_sec: r.timeToBase,
      steps_to_base: r.stepsToBase,
      base_distance_ft: config.baseDistance,
      base_target: config.baseTarget,
      decision_correct: r.decisionCorrect,
      rep_timestamp: r.timestamp,
    }));

    try {
      await createSession({
        sport: 'softball',
        session_type: 'softball_stealing',
        session_date: new Date().toISOString().split('T')[0],
        module: 'baserunning',
        drill_blocks: drillBlocks,
        micro_layer_data: microLayerData,
        notes: `Softball steal training: ${config.baseTarget} base at ${config.baseDistance}ft, ${reps.length} reps`,
      });

      // Build analytics profile
      if (goReps.length > 0) {
        const avgTwoStep = goReps.reduce((s, r) => s + (r.twoStepTime || 0), 0) / goReps.length;
        const avgTime = goReps.reduce((s, r) => s + (r.timeToBase || 0), 0) / goReps.length;
        const avgSteps = Math.round(goReps.reduce((s, r) => s + (r.stepsToBase || 0), 0) / goReps.length);
        const correctCount = reps.filter(r => r.decisionCorrect).length;
        const accuracyPct = Math.round((correctCount / reps.length) * 100);

        const p = buildStealProfile(avgTwoStep, avgTime, avgSteps, config.baseDistance, accuracyPct);
        setProfile(p);
      }

      setPhase('analysis');
    } catch (e) {
      // Toast handled by hook
    }
  };

  const goReps = reps.filter(r => r.signalResult === 'go' && r.timeToBase);
  const avgTime = goReps.length > 0 ? goReps.reduce((s, r) => s + (r.timeToBase || 0), 0) / goReps.length : 0;
  const bestTime = goReps.length > 0 ? Math.min(...goReps.map(r => r.timeToBase || 99)) : 0;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-4 px-2">
        {phase === 'setup' && <SoftballStealSetup onStart={handleSetupComplete} />}

        {phase === 'live_rep' && config && (
          <SoftballStealRepRunner
            repNumber={currentRepNum}
            signalType={config.signalType}
            onRepComplete={handleRepComplete}
            onDeleteRep={handleDeleteRep}
            onEndSession={handleEndSession}
            canEnd={reps.length > 0}
          />
        )}

        {phase === 'summary' && config && (
          <SoftballStealSummary
            reps={reps}
            baseDistance={config.baseDistance}
            baseTarget={config.baseTarget}
            onSave={handleSave}
            saving={saving}
          />
        )}

        {phase === 'analysis' && profile && config && (
          <SoftballStealAnalysis
            profile={profile}
            avgTime={avgTime}
            bestTime={bestTime}
            baseDist={config.baseDistance}
            repsCount={goReps.length}
          />
        )}

        {phase === 'analysis' && !profile && (
          <div className="text-center py-12 space-y-4">
            <p className="text-lg font-semibold">Session Saved!</p>
            <p className="text-sm text-muted-foreground">No GO reps with timing data to analyze.</p>
            <button className="text-primary underline" onClick={() => navigate('/practice')}>
              Back to Practice Hub
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
