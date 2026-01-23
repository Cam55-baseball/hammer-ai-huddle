import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Star, Crown } from 'lucide-react';

export type CelebrationType = 'perfect' | 'newPB' | 'streak' | 'excellent';

interface CelebrationBadgeProps {
  type: CelebrationType;
  value?: number | string;
  show: boolean;
  onAnimationComplete?: () => void;
}

export function CelebrationBadge({
  type,
  value,
  show,
  onAnimationComplete,
}: CelebrationBadgeProps) {
  const getConfig = () => {
    switch (type) {
      case 'perfect':
        return {
          icon: Crown,
          text: 'PERFECT!',
          subtext: '100% Accuracy',
          bgClass: 'bg-gradient-to-r from-amber-400 to-yellow-300',
          textClass: 'text-amber-900',
          iconClass: 'text-amber-600',
        };
      case 'newPB':
        return {
          icon: Trophy,
          text: 'NEW PB!',
          subtext: value ? `${value}` : 'Personal Best',
          bgClass: 'bg-gradient-to-r from-purple-500 to-violet-500',
          textClass: 'text-white',
          iconClass: 'text-amber-300',
        };
      case 'streak':
        return {
          icon: Zap,
          text: `${value} STREAK!`,
          subtext: "You're on fire!",
          bgClass: 'bg-gradient-to-r from-orange-500 to-red-500',
          textClass: 'text-white',
          iconClass: 'text-yellow-300',
        };
      case 'excellent':
        return {
          icon: Star,
          text: 'EXCELLENT!',
          subtext: value ? `${value}% Accuracy` : 'Great performance',
          bgClass: 'bg-gradient-to-r from-emerald-500 to-teal-500',
          textClass: 'text-white',
          iconClass: 'text-emerald-200',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.3, y: 50 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
            transition: { type: 'spring', bounce: 0.5, duration: 0.6 }
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.8, 
            y: -20,
            transition: { duration: 0.3 }
          }}
          onAnimationComplete={() => {
            // Auto-hide after display
            setTimeout(() => {
              onAnimationComplete?.();
            }, 2000);
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
        >
          {/* Background pulse */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ 
              scale: [0, 2, 2.5],
              opacity: [0.5, 0.2, 0],
            }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`absolute w-48 h-48 rounded-full ${config.bgClass} opacity-50`}
          />

          {/* Main badge */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 0.5,
              repeat: 2,
              repeatType: 'reverse',
            }}
            className={`relative px-8 py-6 rounded-2xl shadow-2xl ${config.bgClass}`}
          >
            {/* Sparkles around badge */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                  x: [0, (i % 2 ? 1 : -1) * (30 + Math.random() * 30)],
                  y: [0, (i < 3 ? -1 : 1) * (30 + Math.random() * 30)],
                }}
                transition={{
                  duration: 1,
                  delay: i * 0.1,
                }}
                className="absolute top-1/2 left-1/2 w-3 h-3"
              >
                <Star className="w-3 h-3 text-white fill-white" />
              </motion.div>
            ))}

            {/* Icon */}
            <motion.div
              initial={{ rotate: -20 }}
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: 1 }}
              className="flex justify-center mb-2"
            >
              <Icon className={`h-10 w-10 ${config.iconClass}`} />
            </motion.div>

            {/* Text */}
            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`text-2xl font-black text-center tracking-wider ${config.textClass}`}
            >
              {config.text}
            </motion.h3>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className={`text-sm text-center mt-1 ${config.textClass} opacity-80`}
            >
              {config.subtext}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
