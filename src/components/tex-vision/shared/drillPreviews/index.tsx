import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
interface PreviewProps {
  isPlaying: boolean;
}

// Whack-a-Mole Preview - Grid with moles popping up
export const WhackAMolePreview = ({ isPlaying }: PreviewProps) => {
  const gridPositions = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  
  return (
    <div className="grid grid-cols-3 gap-2 w-full h-full p-4">
      {gridPositions.map((pos) => (
        <motion.div
          key={pos}
          className="rounded-lg bg-[hsl(var(--tex-vision-primary))]/50 flex items-center justify-center"
          initial={{ scale: 0.9 }}
          animate={isPlaying ? {
            scale: [0.9, 1, 0.9],
            backgroundColor: pos === 4 ? ['hsl(var(--tex-vision-success) / 0.5)', 'hsl(var(--tex-vision-success) / 0.8)', 'hsl(var(--tex-vision-success) / 0.5)'] : undefined
          } : {}}
          transition={{ 
            duration: 1.5, 
            delay: pos * 0.2, 
            repeat: Infinity, 
            repeatDelay: 2 
          }}
        >
          {pos === 4 && isPlaying && (
            <motion.div
              className="w-6 h-6 rounded-full bg-[hsl(var(--tex-vision-success))] flex items-center justify-center text-white text-xs font-bold"
              animate={{ scale: [0, 1.2, 1, 0], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
            >
              ✓
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

// Color Flash Preview - Flashing colors
export const ColorFlashPreview = ({ isPlaying }: PreviewProps) => {
  const colors = ['hsl(var(--tex-vision-feedback))', 'hsl(var(--tex-vision-success))', 'hsl(var(--tex-vision-warning))', 'hsl(var(--tex-vision-timing))'];
  
  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 gap-4">
      <div className="text-xs text-[hsl(var(--tex-vision-text-muted))]">TARGET COLOR</div>
      <div className="w-8 h-8 rounded-full bg-[hsl(var(--tex-vision-success))]" />
      <motion.div
        className="w-24 h-24 rounded-full"
        animate={isPlaying ? {
          backgroundColor: colors,
          scale: [1, 1.1, 1]
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.div
        className="text-2xl"
        animate={isPlaying ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 0.5, delay: 0.5, repeat: Infinity, repeatDelay: 1.5 }}
      >
        👆
      </motion.div>
    </div>
  );
};

// Pattern Search Preview - Grid with shapes
export const PatternSearchPreview = ({ isPlaying }: PreviewProps) => {
  const shapes = ['●', '■', '▲', '●', '▲', '●', '■', '▲', '●'];
  
  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[hsl(var(--tex-vision-text-muted))]">FIND:</span>
        <span className="text-xl text-[hsl(var(--tex-vision-feedback))]">●</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {shapes.map((shape, i) => (
          <motion.div
            key={i}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
              shape === '●' ? 'text-[hsl(var(--tex-vision-feedback))]' : 
              shape === '■' ? 'text-[hsl(var(--tex-vision-success))]' : 'text-[hsl(var(--tex-vision-warning))]'
            }`}
            animate={isPlaying && shape === '●' ? { 
              opacity: [1, 0.3, 1],
              scale: [1, 0.8, 1]
            } : {}}
            transition={{ duration: 1, delay: i * 0.3, repeat: Infinity, repeatDelay: 1 }}
          >
            {shape}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Peripheral Vision Preview - Center dot with targets
export const PeripheralVisionPreview = ({ isPlaying }: PreviewProps) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="w-4 h-4 rounded-full bg-[hsl(var(--tex-vision-text))]" />
      {['left', 'right', 'top', 'bottom'].map((dir, i) => (
        <motion.div
          key={dir}
          className={`absolute w-8 h-8 rounded-full bg-[hsl(var(--tex-vision-feedback))] flex items-center justify-center ${
            dir === 'left' ? 'left-4' : 
            dir === 'right' ? 'right-4' : 
            dir === 'top' ? 'top-4' : 'bottom-4'
          }`}
          animate={isPlaying ? { 
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0.5]
          } : { opacity: 0 }}
          transition={{ duration: 2, delay: i * 0.8, repeat: Infinity }}
        >
          ▶
        </motion.div>
      ))}
    </div>
  );
};

// Soft Focus Preview - Expanding circles
export const SoftFocusPreview = ({ isPlaying }: PreviewProps) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {[1, 2, 3].map((ring) => (
        <motion.div
          key={ring}
          className="absolute border-2 border-[hsl(var(--tex-vision-feedback))]/30 rounded-full"
          style={{ width: ring * 40, height: ring * 40 }}
          animate={isPlaying ? { 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3]
          } : {}}
          transition={{ duration: 3, delay: ring * 0.2, repeat: Infinity }}
        />
      ))}
      <motion.div
        className="w-4 h-4 rounded-full bg-[hsl(var(--tex-vision-feedback))]"
        animate={isPlaying ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </div>
  );
};

// Near-Far Preview - Vertically stacked depth targets matching actual game
export const NearFarPreview = ({ isPlaying }: PreviewProps) => {
  const [activeDepth, setActiveDepth] = useState<'far' | 'mid' | 'near'>('mid');
  
  useEffect(() => {
    if (!isPlaying) {
      setActiveDepth('mid');
      return;
    }
    
    const depths: ('far' | 'mid' | 'near')[] = ['far', 'mid', 'near'];
    let index = 1; // Start at mid
    const interval = setInterval(() => {
      index = (index + 1) % depths.length;
      setActiveDepth(depths[index]);
    }, 1200);
    
    return () => clearInterval(interval);
  }, [isPlaying]);
  
  return (
    <div className="flex flex-col items-center justify-between w-full h-full py-3">
      {/* Far - top, smallest */}
      <motion.div
        className="rounded-full"
        style={{ width: 16, height: 16 }}
        animate={{
          backgroundColor: activeDepth === 'far' 
            ? 'hsl(var(--tex-vision-feedback))' 
            : 'hsl(var(--tex-vision-primary-light) / 0.3)',
          boxShadow: activeDepth === 'far' 
            ? '0 0 12px hsl(var(--tex-vision-feedback) / 0.6)' 
            : 'none',
          scale: activeDepth === 'far' ? 1.2 : 1,
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Mid - center, medium */}
      <motion.div
        className="rounded-full"
        style={{ width: 28, height: 28 }}
        animate={{
          backgroundColor: activeDepth === 'mid' 
            ? 'hsl(var(--tex-vision-feedback))' 
            : 'hsl(var(--tex-vision-primary-light) / 0.4)',
          boxShadow: activeDepth === 'mid' 
            ? '0 0 15px hsl(var(--tex-vision-feedback) / 0.5)' 
            : 'none',
          scale: activeDepth === 'mid' ? 1.15 : 1,
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Near - bottom, largest */}
      <motion.div
        className="rounded-full"
        style={{ width: 44, height: 44 }}
        animate={{
          backgroundColor: activeDepth === 'near' 
            ? 'hsl(var(--tex-vision-feedback))' 
            : 'hsl(var(--tex-vision-primary-light) / 0.5)',
          boxShadow: activeDepth === 'near' 
            ? '0 0 20px hsl(var(--tex-vision-feedback) / 0.7)' 
            : 'none',
          scale: activeDepth === 'near' ? 1.1 : 1,
        }}
        transition={{ duration: 0.3 }}
      />
    </div>
  );
};

// Convergence Preview - Two dots moving together
export const ConvergencePreview = ({ isPlaying }: PreviewProps) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <motion.div
        className="w-4 h-4 rounded-full bg-[hsl(var(--tex-vision-feedback))]"
        animate={isPlaying ? { x: [-30, 0, -30] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.div
        className="w-4 h-4 rounded-full bg-[hsl(var(--tex-vision-feedback))]"
        animate={isPlaying ? { x: [30, 0, 30] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
};

// Smooth Pursuit Preview - Following dot
export const SmoothPursuitPreview = ({ isPlaying }: PreviewProps) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <motion.div
        className="w-6 h-6 rounded-full bg-[hsl(var(--tex-vision-feedback))]"
        animate={isPlaying ? { 
          x: [-40, 40, -40],
          y: [-20, 20, -20]
        } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute w-full h-px bg-[hsl(var(--tex-vision-primary-light))]/30" />
    </div>
  );
};

// Meter Timing Preview - Moving bar
export const MeterTimingPreview = ({ isPlaying }: PreviewProps) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-4 px-4">
      <div className="relative w-full h-8 bg-[hsl(var(--tex-vision-primary))]/50 rounded-full overflow-hidden">
        <div className="absolute left-1/3 w-1/4 h-full bg-[hsl(var(--tex-vision-success))]/40" />
        <motion.div
          className="absolute w-2 h-full bg-[hsl(var(--tex-vision-text))]"
          animate={isPlaying ? { left: ['0%', '100%', '0%'] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <motion.div
        className="text-lg"
        animate={isPlaying ? { scale: [1, 1.5, 1] } : {}}
        transition={{ duration: 0.3, delay: 1, repeat: Infinity, repeatDelay: 1.7 }}
      >
        👆
      </motion.div>
    </div>
  );
};

// Brock String Preview - String with beads
export const BrockStringPreview = ({ isPlaying }: PreviewProps) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="relative w-full h-20 flex items-center justify-center">
        <div className="absolute w-4/5 h-px bg-[hsl(var(--tex-vision-text))]/50" />
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute w-4 h-4 rounded-full"
            style={{ 
              left: `${25 + i * 25}%`,
              backgroundColor: i === 1 ? 'hsl(var(--tex-vision-feedback))' : 'hsl(var(--tex-vision-text))'
            }}
            animate={isPlaying && i === 1 ? { scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
        ))}
      </div>
    </div>
  );
};

// Eye Relaxation Preview - Shows all 5 exercise steps
export const EyeRelaxationPreview = ({ isPlaying }: PreviewProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const steps = [
    { icon: '🫲', name: 'Palm your eyes' },
    { icon: '✨', name: 'Deep breathing' },
    { icon: '🔄', name: 'Eye circles' },
    { icon: '👁️', name: 'Gentle blinking' },
    { icon: '🌙', name: 'Final rest' },
  ];

  useEffect(() => {
    if (!isPlaying) {
      setStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStepIndex(prev => (prev + 1) % steps.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-3">
      <motion.div 
        className="text-3xl"
        key={stepIndex}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {steps[stepIndex].icon}
      </motion.div>
      <motion.p 
        className="text-xs font-medium text-center text-[hsl(var(--tex-vision-text))]"
        key={`name-${stepIndex}`}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {steps[stepIndex].name}
      </motion.p>
      <div className="flex gap-1 mt-1">
        {steps.map((_, i) => (
          <div 
            key={i} 
            className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
              i === stepIndex 
                ? 'bg-[hsl(var(--tex-vision-feedback))] scale-125' 
                : 'bg-[hsl(var(--tex-vision-text-muted))]/30'
            }`} 
          />
        ))}
      </div>
    </div>
  );
};

// Stroop Challenge Preview - Color word mismatch
export const StroopChallengePreview = ({ isPlaying }: PreviewProps) => {
  const colors = [
    { bg: 'bg-[hsl(var(--tex-vision-feedback))]', name: 'R' },
    { bg: 'bg-[hsl(var(--tex-vision-timing))]', name: 'B' },
    { bg: 'bg-[hsl(var(--tex-vision-success))]', name: 'G' },
    { bg: 'bg-[hsl(var(--tex-vision-warning))]', name: 'Y' },
  ];
  
  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-4">
      <div className="text-xs text-[hsl(var(--tex-vision-text-muted))]">IDENTIFY THE COLOR</div>
      <motion.div
        className="text-3xl font-bold text-[hsl(var(--tex-vision-feedback))]"
        animate={isPlaying ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      >
        BLUE
      </motion.div>
      <div className="flex gap-2">
        {colors.map((color, i) => (
          <motion.div
            key={i}
            className={`w-8 h-8 rounded-lg ${color.bg} flex items-center justify-center text-white text-xs font-bold`}
            animate={isPlaying && i === 0 ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.5, delay: 0.8, repeat: Infinity, repeatDelay: 1.5 }}
          >
            {color.name}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Multi-Target Track Preview - Shows memorize, track, select phases
export const MultiTargetTrackPreview = ({ isPlaying }: PreviewProps) => {
  const [phase, setPhase] = useState<'memorize' | 'track' | 'select'>('memorize');
  
  useEffect(() => {
    if (!isPlaying) {
      setPhase('memorize');
      return;
    }
    
    // Cycle through phases
    const phases: ('memorize' | 'track' | 'select')[] = ['memorize', 'track', 'select'];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % phases.length;
      setPhase(phases[index]);
    }, 1500);
    
    return () => clearInterval(interval);
  }, [isPlaying]);
  
  // Dots with their states
  const dots = [
    { x: 25, y: 25, isTarget: true },
    { x: 65, y: 30, isTarget: true },
    { x: 45, y: 60, isTarget: false },
    { x: 75, y: 55, isTarget: false },
    { x: 30, y: 50, isTarget: false },
  ];
  
  return (
    <div className="relative w-full h-full bg-[hsl(var(--tex-vision-primary))]/20 rounded-lg overflow-hidden">
      {/* Phase label */}
      <motion.div
        className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold z-10"
        animate={{
          color: phase === 'memorize' 
            ? 'hsl(var(--tex-vision-feedback))' 
            : phase === 'track' 
            ? 'hsl(var(--tex-vision-timing))' 
            : 'hsl(var(--tex-vision-success))'
        }}
      >
        {phase === 'memorize' ? 'MEMORIZE' : phase === 'track' ? 'TRACK...' : 'SELECT!'}
      </motion.div>
      
      {/* Dots */}
      {dots.map((dot, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-full"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
          }}
          animate={{
            x: phase === 'track' ? [0, 8, -4, 6, 0] : 0,
            y: phase === 'track' ? [0, -6, 4, -2, 0] : 0,
            backgroundColor: 
              phase === 'memorize' && dot.isTarget 
                ? 'hsl(var(--tex-vision-feedback))'
                : phase === 'select' && dot.isTarget
                ? 'hsl(var(--tex-vision-success))'
                : 'hsl(var(--tex-vision-text-muted))',
            scale: phase === 'memorize' && dot.isTarget ? 1.3 : 1,
            boxShadow: phase === 'memorize' && dot.isTarget 
              ? '0 0 10px hsl(var(--tex-vision-feedback) / 0.6)' 
              : phase === 'select' && dot.isTarget
              ? '0 0 6px hsl(var(--tex-vision-success) / 0.5)'
              : 'none',
          }}
          transition={{ 
            duration: phase === 'track' ? 1.5 : 0.3,
            repeat: phase === 'track' ? Infinity : 0,
          }}
        />
      ))}
    </div>
  );
};

// Rapid Switch Preview - Changing tasks
export const RapidSwitchPreview = ({ isPlaying }: PreviewProps) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-3">
      <motion.div
        className="text-xs text-[hsl(var(--tex-vision-text-muted))]"
        animate={isPlaying ? { opacity: [1, 0, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        IDENTIFY COLOR → IDENTIFY SHAPE
      </motion.div>
      <motion.div
        className="w-12 h-12 rounded-lg bg-[hsl(var(--tex-vision-feedback))]"
        animate={isPlaying ? { 
          borderRadius: ['25%', '50%', '25%'],
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
};

// Dual-Task Vision Preview - Center + peripheral
export const DualTaskVisionPreview = ({ isPlaying }: PreviewProps) => {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <motion.div
        className="text-2xl font-bold text-[hsl(var(--tex-vision-text))]"
        animate={isPlaying ? { opacity: [1, 1, 1] } : {}}
      >
        <motion.span
          animate={isPlaying ? {  } : {}}
        >
          7
        </motion.span>
      </motion.div>
      <motion.div
        className="absolute right-4 w-6 h-6 rounded-full bg-[hsl(var(--tex-vision-warning))]"
        animate={isPlaying ? { opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.5] } : { opacity: 0 }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
};

// Chaos Grid Preview - Flashing grid
export const ChaosGridPreview = ({ isPlaying }: PreviewProps) => {
  return (
    <div className="grid grid-cols-4 gap-1 w-full h-full p-2">
      {Array.from({ length: 16 }).map((_, i) => (
        <motion.div
          key={i}
          className="rounded bg-[hsl(var(--tex-vision-primary))]/50"
          animate={isPlaying ? {
            backgroundColor: i % 5 === 0 
              ? ['hsl(var(--tex-vision-primary) / 0.5)', 'hsl(var(--tex-vision-feedback) / 0.8)', 'hsl(var(--tex-vision-primary) / 0.5)']
              : ['hsl(var(--tex-vision-primary) / 0.5)', 'hsl(var(--tex-vision-warning) / 0.3)', 'hsl(var(--tex-vision-primary) / 0.5)']
          } : {}}
          transition={{ duration: 1.5, delay: i * 0.05, repeat: Infinity, repeatDelay: 1 }}
        />
      ))}
    </div>
  );
};

// Export all previews mapped by drill ID
export const DRILL_PREVIEWS: Record<string, React.FC<PreviewProps>> = {
  whack_a_mole: WhackAMolePreview,
  color_flash: ColorFlashPreview,
  pattern_search: PatternSearchPreview,
  peripheral_vision: PeripheralVisionPreview,
  soft_focus: SoftFocusPreview,
  near_far: NearFarPreview,
  convergence: ConvergencePreview,
  smooth_pursuit: SmoothPursuitPreview,
  meter_timing: MeterTimingPreview,
  brock_string: BrockStringPreview,
  eye_relaxation: EyeRelaxationPreview,
  stroop_challenge: StroopChallengePreview,
  multi_target_track: MultiTargetTrackPreview,
  rapid_switch: RapidSwitchPreview,
  dual_task_vision: DualTaskVisionPreview,
  chaos_grid: ChaosGridPreview,
};
