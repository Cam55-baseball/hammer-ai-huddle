import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { useSeasonStatus } from '@/hooks/useSeasonStatus';
import { usePerformanceSession } from '@/hooks/usePerformanceSession';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PickoffSetup, type SignalType } from '@/components/pickoff-trainer/PickoffSetup';
import { PickoffRepRunner, type PickoffRep } from '@/components/pickoff-trainer/PickoffRepRunner';
import { PickoffSummary } from '@/components/pickoff-trainer/PickoffSummary';
import { PickoffAnalysis } from '@/components/pickoff-trainer/PickoffAnalysis';

type Phase = 'setup' | 'live' | 'summary' | 'analysis';

const PickoffTrainer = () => {
  const { user, loading } = useAuth();
  const { sport } = useSportTheme();
  const { createSession, saving } = usePerformanceSession();
  const { seasonStatus } = useSeasonStatus();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('setup');
  const [base, setBase] = useState('');
  const [covering, setCovering] = useState('');
  const [signalType, setSignalType] = useState<SignalType>('color');
  const [reps, setReps] = useState<PickoffRep[]>([]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (sport !== 'baseball') return <Navigate to="/dashboard" replace />;

  const handleStart = (b: string, c: string, st: SignalType) => {
    setBase(b);
    setCovering(c);
    setSignalType(st);
    setReps([]);
    setPhase('live');
  };

  const handleRepComplete = (rep: PickoffRep) => {
    setReps(prev => [...prev, rep]);
  };

  const handleDeleteRep = (index: number) => {
    setReps(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinish = () => {
    setPhase('summary');
  };

  const handleSave = async () => {
    const total = reps.length;
    const correct = reps.filter(r => r.decisionCorrect).length;
    const accuracyGrade = total > 0 ? Math.round((correct / total) * 80) : 40;

    await createSession({
      sport: 'baseball',
      session_type: 'pickoff_training',
      session_date: new Date().toISOString().split('T')[0],
      season_context: 'in_season',
      module: 'pitching',
      drill_blocks: [{
        id: crypto.randomUUID(),
        drill_type: 'pickoff_training',
        intent: 'decision',
        volume: total,
        execution_grade: accuracyGrade,
        outcome_tags: ['pickoff_decision'],
      }],
      player_grade: accuracyGrade,
      notes: `Pick-off trainer: ${base} base, covering ${covering}, signal: ${signalType}. ${correct}/${total} correct.`,
      micro_layer_data: reps.map(r => ({
        base_target: r.baseTarget,
        covering_position: r.coveringPosition,
        final_signal: r.finalSignal,
        decision_correct: r.decisionCorrect,
        rep_timestamp: r.timestamp,
        signal_type: r.signalType,
        displayed_value: r.displayedValue,
        balk: r.balk,
        throw_clean: r.throwClean,
      })),
    });

    setPhase('analysis');
  };

  const handleBackToSetup = () => {
    setPhase('setup');
    setReps([]);
  };

  return (
    <DashboardLayout>
      {phase === 'setup' && <PickoffSetup onStart={handleStart} onBack={() => navigate('/dashboard')} />}
      {phase === 'live' && (
        <PickoffRepRunner
          base={base}
          covering={covering}
          signalType={signalType}
          reps={reps}
          onRepComplete={handleRepComplete}
          onDeleteRep={handleDeleteRep}
          onFinish={handleFinish}
          onBackToSetup={handleBackToSetup}
        />
      )}
      {phase === 'summary' && (
        <PickoffSummary reps={reps} onSave={handleSave} saving={saving} />
      )}
      {phase === 'analysis' && <PickoffAnalysis reps={reps} />}
    </DashboardLayout>
  );
};

export default PickoffTrainer;
