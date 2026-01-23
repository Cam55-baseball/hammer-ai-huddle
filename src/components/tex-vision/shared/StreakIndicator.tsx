import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StreakIndicatorProps {
  currentStreak: number;
  bestStreak?: number;
  milestones?: number[];
  className?: string;
}

export function StreakIndicator({
  currentStreak,
  bestStreak = 0,
  milestones = [5, 10, 15, 20, 25],
  className = '',
}: StreakIndicatorProps) {
  const [showMilestone, setShowMilestone] = useState(false);
  const [lastMilestone, setLastMilestone] = useState(0);

  // Check for milestone hit
  useEffect(() => {
    const milestone = milestones.find(m => m === currentStreak);
    if (milestone && milestone > lastMilestone) {
      setShowMilestone(true);
      setLastMilestone(milestone);
      setTimeout(() => setShowMilestone(false), 1500);
    }
  }, [currentStreak, milestones, lastMilestone]);

  // Determine fire intensity based on streak
  const getFireIntensity = () => {
    if (currentStreak >= 20) return 'text-purple-400';
    if (currentStreak >= 15) return 'text-red-500';
    if (currentStreak >= 10) return 'text-orange-500';
    if (currentStreak >= 5) return 'text-amber-500';
    return 'text-[hsl(var(--tex-vision-text-muted))]';
  };

  const getFireScale = () => {
    if (currentStreak >= 20) return 1.4;
    if (currentStreak >= 15) return 1.3;
    if (currentStreak >= 10) return 1.2;
    if (currentStreak >= 5) return 1.1;
    return 1;
  };

  const isOnFire = currentStreak >= 5;
  const isNewBest = currentStreak > 0 && currentStreak >= bestStreak;

  return (
    <div className={`relative flex items-center gap-2 ${className}`}>
      {/* Flame icon with pulse animation when on fire */}
      <motion.div
        animate={{
          scale: isOnFire ? [1, getFireScale(), 1] : 1,
        }}
        transition={{
          duration: 0.5,
          repeat: isOnFire ? Infinity : 0,
          repeatType: 'reverse',
        }}
        className="relative"
      >
        <Flame className={`h-5 w-5 transition-colors duration-300 ${getFireIntensity()}`} />
        
        {/* Glow effect when on fire */}
        {isOnFire && (
          <motion.div
            className={`absolute inset-0 rounded-full blur-md opacity-50 ${
              currentStreak >= 20 ? 'bg-purple-400' :
              currentStreak >= 15 ? 'bg-red-500' :
              currentStreak >= 10 ? 'bg-orange-500' :
              'bg-amber-500'
            }`}
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
            }}
          />
        )}
      </motion.div>

      {/* Streak count */}
      <div className="flex items-baseline gap-1">
        <motion.span
          key={currentStreak}
          initial={{ scale: 1.3, y: -5 }}
          animate={{ scale: 1, y: 0 }}
          className={`font-bold text-lg ${
            isOnFire ? getFireIntensity() : 'text-[hsl(var(--tex-vision-text))]'
          }`}
        >
          {currentStreak}
        </motion.span>
        
        {bestStreak > 0 && (
          <span className="text-xs text-[hsl(var(--tex-vision-text-muted))]">
            / {bestStreak}
          </span>
        )}
      </div>

      {/* New best indicator */}
      <AnimatePresence>
        {isNewBest && currentStreak > 1 && (
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="text-[10px] font-bold text-[hsl(var(--tex-vision-success))] uppercase"
          >
            PB!
          </motion.span>
        )}
      </AnimatePresence>

      {/* Milestone celebration popup */}
      <AnimatePresence>
        {showMilestone && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.5 }}
            animate={{ opacity: 1, y: -10, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.8 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              currentStreak >= 20 ? 'bg-purple-500 text-white' :
              currentStreak >= 15 ? 'bg-red-500 text-white' :
              currentStreak >= 10 ? 'bg-orange-500 text-white' :
              'bg-amber-500 text-black'
            }`}>
              🔥 {currentStreak} Streak!
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
