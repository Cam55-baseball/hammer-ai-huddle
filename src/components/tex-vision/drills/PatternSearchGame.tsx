import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DrillContainer } from '../shared/DrillContainer';
import { DrillTimer } from '../shared/DrillTimer';
import { DrillMetricsDisplay } from '../shared/DrillMetricsDisplay';
import { StreakIndicator } from '../shared/StreakIndicator';
import { Search } from 'lucide-react';
import { DrillResult } from '@/hooks/useTexVisionSession';

interface PatternSearchGameProps {
  tier: string;
  onComplete: (result: Omit<DrillResult, 'drillType' | 'tier'>) => void;
  onExit: () => void;
}

interface Target {
  id: number;
  row: number;
  col: number;
  isTarget: boolean;
  shape: 'circle' | 'square' | 'triangle';
  found?: boolean;
}

export default function PatternSearchGame({ tier, onComplete, onExit }: PatternSearchGameProps) {
  const { t } = useTranslation();
  const gridSize = tier === 'beginner' ? 4 : tier === 'advanced' ? 5 : 6;
  const targetCount = tier === 'beginner' ? 2 : tier === 'advanced' ? 3 : 4;
  
  const [grid, setGrid] = useState<Target[]>([]);
  const [targetShape, setTargetShape] = useState<'circle' | 'square' | 'triangle'>('circle');
  const [foundCount, setFoundCount] = useState(0);
  const [totalFoundCount, setTotalFoundCount] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [lastClickTime, setLastClickTime] = useState(Date.now());
  const [isComplete, setIsComplete] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showRoundComplete, setShowRoundComplete] = useState(false);

  const totalRounds = tier === 'beginner' ? 5 : tier === 'advanced' ? 7 : 10;
  const shapes: ('circle' | 'square' | 'triangle')[] = ['circle', 'square', 'triangle'];

  const generateGrid = useCallback(() => {
    const newTargetShape = shapes[Math.floor(Math.random() * shapes.length)];
    setTargetShape(newTargetShape);

    const cells: Target[] = [];
    const totalCells = gridSize * gridSize;
    const targetIndices = new Set<number>();

    // Select random positions for targets
    while (targetIndices.size < targetCount) {
      targetIndices.add(Math.floor(Math.random() * totalCells));
    }

    for (let i = 0; i < totalCells; i++) {
      const isTarget = targetIndices.has(i);
      const distractorShapes = shapes.filter(s => s !== newTargetShape);
      
      cells.push({
        id: i,
        row: Math.floor(i / gridSize),
        col: i % gridSize,
        isTarget,
        shape: isTarget ? newTargetShape : distractorShapes[Math.floor(Math.random() * distractorShapes.length)],
        found: false,
      });
    }

    setGrid(cells);
    setFoundCount(0);
    setLastClickTime(Date.now());
    setGameStarted(true);
    // Only reset hasInteracted on the first round
  }, [gridSize, targetCount]);

  useEffect(() => {
    generateGrid();
  }, [generateGrid]);

  // Check if round is complete
  useEffect(() => {
    // Guard: Only check completion if game has started, grid exists, and user has interacted (for first round)
    if (!gameStarted || grid.length === 0 || isComplete || showRoundComplete) return;
    
    // For the first round only, require user interaction before allowing completion
    if (roundsCompleted === 0 && !hasInteracted) return;
    
    if (foundCount === targetCount) {
      const newRounds = roundsCompleted + 1;
      setRoundsCompleted(newRounds);
      
      if (newRounds >= totalRounds) {
        setIsComplete(true);
        const avgReaction = reactionTimes.length > 0 
          ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
          : 0;
        
        const finalBestStreak = Math.max(bestStreak, streak);
        
        onComplete({
          accuracyPercent: Math.round((totalFoundCount / Math.max(totalFoundCount + mistakes, 1)) * 100) || 100,
          reactionTimeMs: avgReaction,
          difficultyLevel: tier === 'beginner' ? 2 : tier === 'advanced' ? 5 : 8,
          falsePositives: mistakes,
          drillMetrics: {
            roundsCompleted: newRounds,
            gridSize,
            avgReactionTime: avgReaction,
            bestStreak: finalBestStreak,
          },
        });
      } else {
        // Show round complete celebration before next round
        setShowRoundComplete(true);
        setTimeout(() => {
          setShowRoundComplete(false);
          generateGrid();
        }, 1200);
      }
    }
  }, [foundCount, targetCount, roundsCompleted, totalRounds, mistakes, reactionTimes, tier, onComplete, generateGrid, gridSize, isComplete, streak, bestStreak, showRoundComplete, totalFoundCount, hasInteracted]);

  const handleCellClick = (target: Target) => {
    if (isComplete || target.found) return;

    // Mark that user has interacted (prevents premature first-round completion)
    setHasInteracted(true);

    const now = Date.now();
    const reaction = now - lastClickTime;

    if (target.isTarget) {
      setGrid(prev => prev.map(t => t.id === target.id ? { ...t, found: true } : t));
      setFoundCount(prev => prev + 1);
      setTotalFoundCount(prev => prev + 1);
      setReactionTimes(prev => [...prev, reaction]);
      // Increase streak
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
      }
    } else {
      setMistakes(prev => prev + 1);
      setBestStreak(bs => Math.max(bs, streak));
      setStreak(0);
    }
    setLastClickTime(now);
  };

  const renderShape = (shape: 'circle' | 'square' | 'triangle', found: boolean) => {
    const baseClass = `w-full h-full transition-all duration-150 ${
      found ? 'opacity-30 scale-75' : 'hover:scale-110'
    }`;
    
    switch (shape) {
      case 'circle':
        return <div className={`${baseClass} rounded-full bg-[hsl(var(--tex-vision-feedback))]`} />;
      case 'square':
        return <div className={`${baseClass} rounded-sm bg-[hsl(var(--tex-vision-success))]`} />;
      case 'triangle':
        return (
          <div className={`${baseClass} flex items-center justify-center`}>
            <div 
              className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[20px] border-l-transparent border-r-transparent border-b-[hsl(var(--tex-vision-timing))]"
            />
          </div>
        );
    }
  };

  const handleTimerComplete = () => {
    if (!isComplete) {
      setIsComplete(true);
      const avgReaction = reactionTimes.length > 0 
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : 0;
      
      const finalBestStreak = Math.max(bestStreak, streak);
      
      onComplete({
        accuracyPercent: Math.round((foundCount / Math.max(foundCount + mistakes, 1)) * 100),
        reactionTimeMs: avgReaction,
        difficultyLevel: tier === 'beginner' ? 2 : tier === 'advanced' ? 5 : 8,
        falsePositives: mistakes,
        drillMetrics: {
          roundsCompleted,
          gridSize,
          bestStreak: finalBestStreak,
        },
      });
    }
  };

  return (
    <DrillContainer
      title={t('texVision.drills.patternSearch.title', 'Pattern Search')}
      description={t('texVision.drills.patternSearch.description', 'Find all matching shapes')}
      icon={Search}
      onExit={onExit}
      timer={
        <DrillTimer
          initialSeconds={tier === 'beginner' ? 120 : tier === 'advanced' ? 150 : 180}
          mode="countdown"
          autoStart={!showRoundComplete}
          onComplete={handleTimerComplete}
        />
      }
      metrics={
        <div className="flex items-center gap-4">
          <DrillMetricsDisplay
            accuracy={Math.round((foundCount / Math.max(foundCount + mistakes, 1)) * 100)}
            reactionTimeMs={reactionTimes.length > 0 ? reactionTimes[reactionTimes.length - 1] : undefined}
          />
          <StreakIndicator currentStreak={streak} bestStreak={bestStreak} />
        </div>
      }
    >
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] relative">
        {/* Round Complete Celebration Overlay */}
        {showRoundComplete && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[hsl(var(--tex-vision-primary))]/90 z-20 animate-fade-in rounded-lg">
            <p className="text-3xl font-bold text-[hsl(var(--tex-vision-success))] mb-2">
              {t('texVision.drills.patternSearch.roundComplete', 'ROUND COMPLETE!')}
            </p>
            <p className="text-lg text-[hsl(var(--tex-vision-text))]">
              {t('texVision.drills.patternSearch.nextRound', 'Next round starting...')}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-[hsl(var(--tex-vision-text-muted))]">
                {t('texVision.drills.round', 'Round')} {roundsCompleted}/{totalRounds}
              </span>
            </div>
          </div>
        )}

        {/* Target indicator */}
        <div className="mb-6 flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--tex-vision-primary))]/50">
          <span className="text-sm text-[hsl(var(--tex-vision-text-muted))]">
            {t('texVision.drills.patternSearch.find', 'Find all')}:
          </span>
          <div className="w-8 h-8">
            {renderShape(targetShape, false)}
          </div>
          <span className="text-sm text-[hsl(var(--tex-vision-text))]">
            ({foundCount}/{targetCount})
          </span>
        </div>

        {/* Grid */}
        <div 
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
        >
          {grid.map((cell) => (
            <button
              key={cell.id}
              onClick={() => handleCellClick(cell)}
              disabled={cell.found || isComplete}
              className={`w-12 h-12 rounded-lg p-2 transition-all duration-150 ${
                cell.found
                  ? 'bg-[hsl(var(--tex-vision-success))]/20 cursor-default'
                  : 'bg-[hsl(var(--tex-vision-primary))]/50 hover:bg-[hsl(var(--tex-vision-primary))]/70 cursor-pointer'
              }`}
            >
              {renderShape(cell.shape, cell.found || false)}
            </button>
          ))}
        </div>

        {/* Round progress */}
        <div className="mt-6 text-sm text-[hsl(var(--tex-vision-text-muted))]">
          {t('texVision.drills.round', 'Round')} {roundsCompleted + 1}/{totalRounds}
        </div>
      </div>
    </DrillContainer>
  );
}
