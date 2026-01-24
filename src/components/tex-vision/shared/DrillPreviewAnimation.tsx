import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DRILL_PREVIEWS } from './drillPreviews';

interface DrillPreviewAnimationProps {
  drillId: string;
  className?: string;
}

export default function DrillPreviewAnimation({ drillId, className = '' }: DrillPreviewAnimationProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  
  // Auto-play the preview animation
  useEffect(() => {
    setIsPlaying(true);
    return () => setIsPlaying(false);
  }, [drillId]);

  const PreviewComponent = DRILL_PREVIEWS[drillId];

  if (!PreviewComponent) {
    // Fallback for drills without specific preview
    return (
      <motion.div 
        className={`w-full h-full flex items-center justify-center ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="w-16 h-16 rounded-full border-4 border-[hsl(var(--tex-vision-feedback))]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={`w-full h-full rounded-xl bg-[hsl(var(--tex-vision-primary))]/30 overflow-hidden ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <PreviewComponent isPlaying={isPlaying} />
    </motion.div>
  );
}
