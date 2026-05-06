import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';
import type { PrescribedVideo } from '@/demo/prescriptions/videoPrescription';
import { logDemoEvent } from '@/demo/guard';

const PREVIEW_MS = 10_000;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: PrescribedVideo;
  fromSlug: string;
  simId?: string;
}

export function VideoPreviewModal({ open, onOpenChange, video, fromSlug, simId }: Props) {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setElapsed(0);
      startedRef.current = null;
      completedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = (ts: number) => {
      if (startedRef.current == null) startedRef.current = ts;
      const e = ts - startedRef.current;
      setElapsed(e);
      if (e >= PREVIEW_MS) {
        if (!completedRef.current) {
          completedRef.current = true;
          logDemoEvent('preview_completed', { videoId: video.id, fromSlug, simId });
          onOpenChange(false);
          navigate(`/demo/upgrade?from=${fromSlug}&video=${video.id}&reason=preview${simId ? `&sim=${simId}` : ''}`);
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [open, video.id, fromSlug, simId, navigate, onOpenChange]);

  const handleClose = (next: boolean) => {
    if (!next && !completedRef.current && open) {
      logDemoEvent('preview_dismissed', { videoId: video.id, fromSlug, elapsedMs: Math.round(elapsed) });
    }
    onOpenChange(next);
  };

  const handleUnlockNow = () => {
    completedRef.current = true;
    onOpenChange(false);
    navigate(`/demo/upgrade?from=${fromSlug}&video=${video.id}&reason=preview${simId ? `&sim=${simId}` : ''}`);
  };

  const pct = Math.min(100, (elapsed / PREVIEW_MS) * 100);
  const seconds = Math.max(0, Math.ceil((PREVIEW_MS - elapsed) / 1000));
  const phase = elapsed < PREVIEW_MS / 3 ? 0 : elapsed < (PREVIEW_MS * 2) / 3 ? 1 : 2;

  const hue = video.thumbnailHue;
  const bg = `linear-gradient(135deg, hsl(${hue} 70% 22%), hsl(${(hue + 40) % 360} 60% 12%))`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-primary/40 p-0">
        <div className="relative aspect-video w-full overflow-hidden" style={{ background: bg }}>
          {/* Animated motion lines backdrop */}
          <svg className="absolute inset-0 h-full w-full opacity-50 mix-blend-screen" viewBox="0 0 100 56" preserveAspectRatio="none">
            <motion.path
              d="M-10 40 Q 30 10 60 30 T 110 20"
              stroke="white" strokeWidth="0.6" fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
            />
            <motion.path
              d="M-10 50 Q 40 25 70 38 T 110 30"
              stroke="white" strokeWidth="0.4" fill="none" opacity={0.6}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 0.4 }}
            />
          </svg>

          {/* Live badge + countdown */}
          <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> Preview
          </div>
          <div className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white backdrop-blur">
            {seconds}s
          </div>
          <button
            onClick={() => handleClose(false)}
            className="absolute right-2 top-9 rounded-full bg-black/60 p-1 text-white/80 transition hover:bg-black/80 hover:text-white"
            aria-label="Close preview"
          >
            <X className="h-3 w-3" />
          </button>

          {/* Storyboard frames */}
          <div className="relative flex h-full w-full items-center justify-center px-6 text-center">
            <AnimatePresence mode="wait">
              {phase === 0 && (
                <motion.div
                  key="setup"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-1"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Drill</p>
                  <h3 className="text-lg font-black leading-tight text-white drop-shadow">{video.title}</h3>
                </motion.div>
              )}
              {phase === 1 && (
                <motion.div
                  key="cue"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.06 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-1"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Coaching cue</p>
                  <p className="text-base font-bold leading-snug text-white drop-shadow">{video.purpose}</p>
                </motion.div>
              )}
              {phase === 2 && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-2"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Expected result</p>
                  <motion.div
                    initial={{ scale: 0.85 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                    className="inline-block rounded-full bg-white/15 px-4 py-1.5 text-base font-black text-white backdrop-blur"
                  >
                    {video.expectedImprovement}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 h-1 bg-primary" style={{ width: `${pct}%` }} />
        </div>

        <div className="space-y-2 p-3">
          <p className="text-[11px] text-muted-foreground">
            This is a 10-second preview. The full drill — video, reps, progressions — unlocks with your plan.
          </p>
          <Button size="sm" className="w-full gap-1.5" onClick={handleUnlockNow}>
            <Sparkles className="h-4 w-4" /> Unlock full drill
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
