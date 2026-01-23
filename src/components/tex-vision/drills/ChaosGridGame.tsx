import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { Grid3X3 } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface ChaosGridGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
}

interface GridCell {
  id: number;
  isTarget: boolean;
  isDistractor: boolean;
  distractorType: 'flash' | 'move' | 'pulse' | null;
  position: { row: number; col: number };
}

export default function ChaosGridGame({ tier, onComplete, onExit }: ChaosGridGameProps) {
  const { t } = useTranslation();
  const [grid, setGrid] = useState<GridCell[]>([]);
  const [targetIds, setTargetIds] = useState<Set<number>>(new Set());
  const [foundIds, setFoundIds] = useState<Set<number>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'show' | 'chaos' | 'select'>('show');
  const [isComplete, setIsComplete] = useState(false);
  const [showCountdown, setShowCountdown] = useState(3);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const roundStartTime = useRef<number>(Date.now());

  const gridSize = tier === 'beginner' ? 4 : tier === 'advanced' ? 5 : 6;
  const targetCount = tier === 'beginner' ? 3 : tier === 'advanced' ? 4 : 5;
  const totalRounds = tier === 'beginner' ? 5 : tier === 'advanced' ? 7 : 10;
  const chaosDuration = tier === 'beginner' ? 3000 : tier === 'advanced' ? 4000 : 5000;

  const initializeRound = useCallback(() => {
    const totalCells = gridSize * gridSize;
    const newGrid: GridCell[] = [];
    const newTargetIds = new Set<number>();

    // Create grid cells
    for (let i = 0; i < totalCells; i++) {
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      newGrid.push({
        id: i,
        isTarget: false,
        isDistractor: false,
        distractorType: null,
        position: { row, col },
      });
    }

    // Randomly select targets
    const shuffled = [...Array(totalCells).keys()].sort(() => Math.random() - 0.5);
    for (let i = 0; i < targetCount; i++) {
      newGrid[shuffled[i]].isTarget = true;
      newTargetIds.add(shuffled[i]);
    }

    // Add distractors (non-target cells that will animate)
    const distractorTypes: ('flash' | 'move' | 'pulse')[] = ['flash', 'move', 'pulse'];
    for (let i = targetCount; i < Math.min(targetCount + 5, totalCells); i++) {
      const cell = newGrid[shuffled[i]];
      cell.isDistractor = true;
      cell.distractorType = distractorTypes[Math.floor(Math.random() * distractorTypes.length)];
    }

    setGrid(newGrid);
    setTargetIds(newTargetIds);
    setFoundIds(new Set());
    setPhase('show');
    setShowCountdown(3);
  }, [gridSize, targetCount]);

  // Initialize first round
  useEffect(() => {
    initializeRound();
  }, [initializeRound]);

  // Show phase countdown
  useEffect(() => {
    if (phase !== 'show') return;

    if (showCountdown > 0) {
      const timer = setTimeout(() => setShowCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setPhase('chaos');
      // After chaos duration, go to select phase
      setTimeout(() => {
        setPhase('select');
        roundStartTime.current = Date.now();
      }, chaosDuration);
    }
  }, [phase, showCountdown, chaosDuration]);

  const handleCellClick = useCallback((cellId: number) => {
    if (phase !== 'select' || foundIds.has(cellId)) return;

    const cell = grid.find(c => c.id === cellId);
    if (!cell) return;

    if (cell.isTarget) {
      setFoundIds(prev => new Set([...prev, cellId]));
      const reactionTime = Date.now() - roundStartTime.current;
      setReactionTimes(prev => [...prev, reactionTime]);
    } else {
      setMistakes(prev => prev + 1);
    }
  }, [phase, foundIds, grid]);

  // Check if round complete
  useEffect(() => {
    if (phase !== 'select') return;
    
    if (foundIds.size === targetCount) {
      // Round complete
      if (round >= totalRounds) {
        setIsComplete(true);
      } else {
        setTimeout(() => {
          setRound(prev => prev + 1);
          initializeRound();
        }, 500);
      }
    }
  }, [phase, foundIds.size, targetCount, round, totalRounds, initializeRound]);

  // Completion effect
  useEffect(() => {
    if (isComplete) {
      const totalTargets = round * targetCount;
      const foundTotal = (round - 1) * targetCount + foundIds.size;
      const avgReaction = reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : undefined;

      onComplete({
        accuracyPercent: Math.round(((foundTotal - mistakes) / Math.max(totalTargets, 1)) * 100),
        reactionTimeMs: avgReaction,
        difficultyLevel: tier === 'beginner' ? 7 : tier === 'advanced' ? 9 : 10,
        drillMetrics: {
          targetsFound: foundTotal,
          mistakes,
          rounds: round,
        },
      });
    }
  }, [isComplete, round, targetCount, foundIds.size, mistakes, reactionTimes, tier, onComplete]);

  const handleTimerComplete = useCallback(() => {
    if (!isComplete) {
      setIsComplete(true);
    }
  }, [isComplete]);

  const getCellClasses = (cell: GridCell) => {
    const base = "aspect-square rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center";
    
    if (phase === 'show' && cell.isTarget) {
      return `${base} bg-[hsl(var(--tex-vision-feedback))] scale-105 shadow-lg shadow-[hsl(var(--tex-vision-feedback))]/50`;
    }
    
    if (phase === 'chaos') {
      if (cell.isDistractor) {
        switch (cell.distractorType) {
          case 'flash':
            return `${base} bg-[hsl(var(--tex-vision-timing))] animate-pulse`;
          case 'move':
            return `${base} bg-[hsl(var(--tex-vision-primary-light))] animate-bounce`;
          case 'pulse':
            return `${base} bg-purple-500 animate-ping`;
        }
      }
      return `${base} bg-[hsl(var(--tex-vision-primary))]/40`;
    }
    
    if (phase === 'select') {
      if (foundIds.has(cell.id)) {
        return `${base} bg-[hsl(var(--tex-vision-success))] ring-2 ring-white`;
      }
      return `${base} bg-[hsl(var(--tex-vision-primary))]/50 hover:bg-[hsl(var(--tex-vision-primary))]/70 active:scale-95`;
    }

    return `${base} bg-[hsl(var(--tex-vision-primary))]/40`;
  };

  return (
    <DrillContainer
      title={t('texVision.drills.chaosGrid.title', 'Chaos Grid')}
      description={t('texVision.drills.chaosGrid.description', 'Track targets through visual chaos')}
      icon={Grid3X3}
      onExit={onExit}
      timer={
        <DrillTimer
          initialSeconds={tier === 'beginner' ? 90 : tier === 'advanced' ? 120 : 180}
          mode="countdown"
          autoStart={true}
          onComplete={handleTimerComplete}
        />
      }
      metrics={
        <DrillMetricsDisplay
          accuracy={round > 1 || foundIds.size > 0
            ? Math.round((((round - 1) * targetCount + foundIds.size - mistakes) / 
                Math.max((round - 1) * targetCount + foundIds.size, 1)) * 100)
            : undefined}
          difficulty={tier === 'beginner' ? 7 : tier === 'advanced' ? 9 : 10}
          streak={(round - 1) * targetCount + foundIds.size}
        />
      }
    >
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] relative">
        {/* Phase indicator */}
        <div className="absolute top-4 text-center">
          {phase === 'show' && (
            <p className="text-lg text-[hsl(var(--tex-vision-feedback))] font-bold">
              {t('texVision.drills.chaosGrid.memorize', 'MEMORIZE!')} ({showCountdown})
            </p>
          )}
          {phase === 'chaos' && (
            <p className="text-lg text-[hsl(var(--tex-vision-timing))] font-bold animate-pulse">
              {t('texVision.drills.chaosGrid.chaos', 'CHAOS!')}
            </p>
          )}
          {phase === 'select' && (
            <p className="text-lg text-[hsl(var(--tex-vision-success))] font-bold">
              {t('texVision.drills.chaosGrid.findTargets', 'Find the targets!')} ({foundIds.size}/{targetCount})
            </p>
          )}
        </div>

        {/* Grid */}
        <div 
          className="grid gap-2 p-4"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            width: `min(100%, ${gridSize * 50 + (gridSize - 1) * 8}px)`,
          }}
        >
          {grid.map((cell) => (
            <div
              key={cell.id}
              onClick={() => handleCellClick(cell.id)}
              className={getCellClasses(cell)}
            />
          ))}
        </div>

        {/* Score */}
        <div className="absolute bottom-16 flex gap-6 text-center">
          <div>
            <p className="text-xl font-bold text-[hsl(var(--tex-vision-success))]">
              {(round - 1) * targetCount + foundIds.size}
            </p>
            <p className="text-xs text-[hsl(var(--tex-vision-text-muted))]">
              {t('texVision.drills.chaosGrid.found', 'Found')}
            </p>
          </div>
          <div>
            <p className="text-xl font-bold text-red-400">{mistakes}</p>
            <p className="text-xs text-[hsl(var(--tex-vision-text-muted))]">
              {t('texVision.drills.chaosGrid.mistakes', 'Mistakes')}
            </p>
          </div>
        </div>

        {/* Round progress */}
        <div className="absolute top-4 left-4 text-sm text-[hsl(var(--tex-vision-text-muted))]">
          {t('texVision.drills.round', 'Round')} {round}/{totalRounds}
        </div>
      </div>
    </DrillContainer>
  );
}
