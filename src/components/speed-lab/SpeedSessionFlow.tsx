import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check } from 'lucide-react';
import { ConfettiEffect } from '@/components/bounce-back-bay/ConfettiEffect';
import { SpeedCheckIn } from './SpeedCheckIn';
import { SpeedFocusCard } from './SpeedFocusCard';
import { SpeedDrillCard } from './SpeedDrillCard';
import { SpeedSprintStep } from './SpeedSprintStep';
import { SpeedTimeEntry } from './SpeedTimeEntry';
import { SpeedRPESlider } from './SpeedRPESlider';
import { BreakDayContent } from './BreakDayContent';
import {
  SessionTemplate,
  SessionFocus,
  DistanceConfig,
  DrillData,
  SportType,
  calculateReadiness,
  getSprintRepsForSession,
  isBarefootSprintAllowed,
} from '@/data/speedLabProgram';

type FlowStep = 'checkin' | 'focus' | 'break_day' | 'drills' | 'sprint_efforts' | 'log_results' | 'complete';

interface SpeedSessionFlowProps {
  sessionNumber: number;
  sessionFocus: SessionFocus;
  sessionDrills: SessionTemplate;
  distances: DistanceConfig[];
  isBreakDay: boolean;
  personalBests: Record<string, number>;
  sport: SportType;
  onComplete: (data: {
    sleepRating: number;
    bodyFeelBefore: string;
    bodyFeelAfter: string;
    painAreas: string[];
    drillLog: string[];
    distances: Record<string, number[]>;
    rpe: number;
    isBreakDay: boolean;
    notes?: string;
    timingMethods?: Record<string, 'self' | 'partner'>;
  }) => Promise<void>;
  onExit: () => void;
}

export function SpeedSessionFlow({
  sessionNumber,
  sessionFocus,
  sessionDrills,
  distances,
  isBreakDay: systemBreakDay,
  personalBests,
  sport,
  onComplete,
  onExit,
}: SpeedSessionFlowProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<FlowStep>('checkin');
  const [isBreakDay, setIsBreakDay] = useState(systemBreakDay);
  const [checkInData, setCheckInData] = useState<{ sleepRating: number; bodyFeel: string; painAreas: string[] } | null>(null);
  const [completedDrills, setCompletedDrills] = useState<Record<string, boolean>>({});
  const [distanceTimes, setDistanceTimes] = useState<Record<string, number[]>>({});
  const [timingMethods, setTimingMethods] = useState<Record<string, 'self' | 'partner'>>({});
  const [rpe, setRpe] = useState(5);
  const [bodyFeelAfter, setBodyFeelAfter] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPBs, setNewPBs] = useState<string[]>([]);

  // ─── Readiness & Sprint Config ──────────────────────────────────────

  const readinessScore = useMemo(() => {
    if (!checkInData) return 70;
    return calculateReadiness(checkInData.sleepRating, checkInData.bodyFeel, checkInData.painAreas);
  }, [checkInData]);

  const sprintReps = useMemo(
    () => getSprintRepsForSession(sessionNumber, readinessScore, distances),
    [sessionNumber, readinessScore, distances]
  );

  const readinessAdjusted = readinessScore < 60;

  const barefootDistances = useMemo(
    () => distances.filter(d => isBarefootSprintAllowed(sessionNumber, readinessScore, d.key)).map(d => d.key),
    [distances, sessionNumber, readinessScore]
  );

  // Flatten drills for the session
  const allDrills = useMemo((): DrillData[] => {
    return [
      ...sessionDrills.activationDrills,
      ...sessionDrills.isometricDrills,
      ...sessionDrills.sprintDrills,
      ...sessionDrills.plyoDrills,
      ...sessionDrills.resistedDrills,
      ...sessionDrills.coolDownDrills,
    ];
  }, [sessionDrills]);

  // ─── Step Handlers ──────────────────────────────────────────────────

  const handleCheckInComplete = (data: { sleepRating: number; bodyFeel: string; painAreas: string[] }) => {
    setCheckInData(data);
    if (isBreakDay) {
      setStep('break_day');
    } else {
      setStep('focus');
    }
  };

  const handleBreakDayComplete = async (drillLog: string[]) => {
    if (!checkInData) return;
    setSaving(true);
    await onComplete({
      sleepRating: checkInData.sleepRating,
      bodyFeelBefore: checkInData.bodyFeel,
      bodyFeelAfter: 'good',
      painAreas: checkInData.painAreas,
      drillLog,
      distances: {},
      rpe: 3,
      isBreakDay: true,
    });
    setShowConfetti(true);
    setStep('complete');
    setSaving(false);
  };

  const handleBreakDayOverride = () => {
    setIsBreakDay(false);
    setStep('focus');
  };

  const handleDrillToggle = (drillId: string, completed: boolean) => {
    setCompletedDrills(prev => ({ ...prev, [drillId]: completed }));
  };

  const handleDistanceTimeChange = (key: string, repIndex: number, val: number) => {
    setDistanceTimes(prev => {
      const current = [...(prev[key] || [])];
      current[repIndex] = val;
      return { ...prev, [key]: current };
    });
  };

  const handleTimingMethod = (key: string, method: 'self' | 'partner') => {
    setTimingMethods(prev => ({ ...prev, [key]: method }));
  };

  const handleFinishSession = async () => {
    if (!checkInData) return;
    setSaving(true);

    // Detect new PBs from arrays
    const pbs: string[] = [];
    for (const [key, times] of Object.entries(distanceTimes)) {
      const validTimes = (times || []).filter(t => t > 0);
      if (validTimes.length > 0) {
        const bestTime = Math.min(...validTimes);
        if (!personalBests[key] || bestTime < personalBests[key]) {
          const dist = distances.find(d => d.key === key);
          pbs.push(dist?.label || key);
        }
      }
    }
    setNewPBs(pbs);

    const drillLog = Object.entries(completedDrills)
      .filter(([, v]) => v)
      .map(([k]) => k);

    await onComplete({
      sleepRating: checkInData.sleepRating,
      bodyFeelBefore: checkInData.bodyFeel,
      bodyFeelAfter,
      painAreas: checkInData.painAreas,
      drillLog,
      distances: distanceTimes,
      rpe,
      isBreakDay: false,
      timingMethods: Object.keys(timingMethods).length > 0 ? timingMethods : undefined,
    });

    setShowConfetti(true);
    setStep('complete');
    setSaving(false);
  };

  const BODY_FEEL_OPTIONS = [
    { key: 'good', emoji: '💪', label: 'Good' },
    { key: 'okay', emoji: '👍', label: 'Okay' },
    { key: 'tight', emoji: '😬', label: 'Tight' },
  ] as const;

  // ─── Step Indicator ─────────────────────────────────────────────────

  const steps = isBreakDay
    ? ['checkin', 'break_day', 'complete']
    : ['checkin', 'focus', 'drills', 'sprint_efforts', 'log_results', 'complete'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button variant="ghost" size="sm" onClick={onExit} disabled={saving}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('speedLab.session.exit', 'Exit')}
          </Button>
          <span className="text-sm font-semibold">
            {t('speedLab.session.number', 'Session')} #{sessionNumber}
          </span>
          <div className="flex gap-1">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i <= currentStepIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4">
        {step === 'checkin' && (
          <SpeedCheckIn onComplete={handleCheckInComplete} />
        )}

        {step === 'break_day' && (
          <BreakDayContent
            onComplete={handleBreakDayComplete}
            onOverride={handleBreakDayOverride}
          />
        )}

        {step === 'focus' && (
          <SpeedFocusCard
            focus={sessionFocus}
            onContinue={() => setStep('drills')}
          />
        )}

        {step === 'drills' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold">{t('speedLab.drills.title', 'Do The Work')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('speedLab.drills.subtitle', 'Complete each drill below')}
              </p>
            </div>
            <div className="space-y-2">
              {allDrills.map((drill) => (
                <SpeedDrillCard
                  key={drill.id}
                  drill={drill}
                  completed={completedDrills[drill.id] || false}
                  onToggle={(completed) => handleDrillToggle(drill.id, completed)}
                  sessionNumber={sessionNumber}
                  readinessScore={readinessScore}
                />
              ))}
            </div>
            <Button
              className="w-full h-14 text-lg font-bold mt-4"
              size="lg"
              onClick={() => setStep('sprint_efforts')}
            >
              {t('speedLab.drills.nextSprints', 'Go Sprint! →')}
            </Button>
          </div>
        )}

        {step === 'sprint_efforts' && (
          <SpeedSprintStep
            distances={distances}
            sprintReps={sprintReps}
            readinessAdjusted={readinessAdjusted}
            readinessScore={readinessScore}
            sessionNumber={sessionNumber}
            sport={sport}
            barefootDistances={barefootDistances}
            onContinue={() => setStep('log_results')}
          />
        )}

        {step === 'log_results' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <SpeedTimeEntry
              distances={distances}
              sprintReps={sprintReps}
              values={distanceTimes}
              personalBests={personalBests}
              onChange={handleDistanceTimeChange}
              onTimingMethod={handleTimingMethod}
            />

            <SpeedRPESlider value={rpe} onChange={setRpe} />

            {/* Body Feel After */}
            <div>
              <span className="font-medium text-sm mb-3 block">
                {t('speedLab.logResults.bodyFeelAfter', 'How does your body feel now?')}
              </span>
              <div className="flex gap-3 justify-center">
                {BODY_FEEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setBodyFeelAfter(opt.key)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 min-w-[80px] min-h-[72px] ${
                      bodyFeelAfter === opt.key
                        ? 'bg-primary/20 ring-2 ring-primary scale-105'
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-xs font-medium">
                      {t(`speedLab.checkIn.${opt.key}`, opt.label)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full h-14 text-lg font-bold"
              size="lg"
              disabled={!bodyFeelAfter || saving}
              onClick={handleFinishSession}
            >
              {saving
                ? t('speedLab.logResults.saving', 'Saving...')
                : t('speedLab.logResults.finish', 'Complete Session ✓')}
            </Button>

            {/* Barefoot Disclaimer */}
            {barefootDistances.length > 0 && (
              <p className="text-[10px] text-muted-foreground text-center italic px-2">
                {t('speedLab.barefoot.disclaimer', 'Barefoot training is introduced gradually to strengthen feet and connective tissue. Always train on safe, clean surfaces. If you experience pain, stop immediately and return to shoes. Consult a qualified professional before beginning any barefoot training program.')}
              </p>
            )}
          </div>
        )}

        {step === 'complete' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in zoom-in duration-500">
            {showConfetti && <ConfettiEffect particleCount={120} duration={3000} />}

            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">
              {t('speedLab.complete.title', 'Session Complete!')}
            </h2>

            {newPBs.length > 0 && (
              <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-xl p-4 mb-4 w-full max-w-sm">
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">🏆 {t('speedLab.complete.newPB', 'New Personal Best!')}</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {newPBs.map((pb) => (
                    <span key={pb} className="bg-amber-500/30 text-amber-800 dark:text-amber-300 px-2 py-1 rounded-full text-xs font-semibold">
                      {pb}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-muted/30 rounded-xl p-4 w-full max-w-sm mb-4">
              <p className="text-sm text-muted-foreground mb-1">
                {t('speedLab.complete.lockMessage', 'Next speed session unlocks in 12:00:00')}
              </p>
              <p className="text-xs text-primary font-medium">
                {t('speedLab.complete.recoveryMessage', 'Recovery builds speed.')}
              </p>
            </div>

            <p className="text-xs text-muted-foreground italic mb-6">
              {t('speedLab.complete.fasciaInsight', 'Fast bodies are springy bodies.')}
            </p>

            <Button onClick={onExit} className="w-full max-w-sm h-12 font-bold">
              <Check className="h-4 w-4 mr-2" />
              {t('speedLab.complete.done', 'Done')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
