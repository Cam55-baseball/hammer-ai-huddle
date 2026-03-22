import { useState, useRef, useCallback, useEffect, RefObject } from 'react';

interface UseRoyalTimingTimerReturn {
  elapsed: number;
  isRunning: boolean;
  isSynced: boolean;
  pauseWithVideo: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  clear: () => void;
  syncToVideo: (videoRef: RefObject<HTMLVideoElement>) => void;
  unsync: () => void;
  setPauseWithVideo: (val: boolean) => void;
  formatTime: (ms: number) => string;
}

export function useRoyalTimingTimer(): UseRoyalTimingTimerReturn {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [pauseWithVideo, setPauseWithVideo] = useState(true);

  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const videoRef = useRef<RefObject<HTMLVideoElement> | null>(null);
  const syncAnchorMs = useRef<number>(0);
  const frozenElapsed = useRef<number>(0);

  const tick = useCallback(() => {
    if (isSynced) {
      if (isRunning) {
        const vid = videoRef.current?.current;
        if (vid) {
          // If video is paused and pauseWithVideo is true, freeze
          if (vid.paused && pauseWithVideo) {
            // Don't advance — keep last value
          } else {
            const videoMs = vid.currentTime * 1000;
            setElapsed(Math.max(0, videoMs - syncAnchorMs.current));
          }
        }
      }
      // If synced but not running, don't update (frozen)
    } else {
      if (isRunning) {
        const now = performance.now();
        setElapsed(accumulatedRef.current + (now - startTimeRef.current));
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [isSynced, isRunning, pauseWithVideo]);

  const start = useCallback(() => {
    if (isRunning) return;
    if (isSynced) {
      const vid = videoRef.current?.current;
      if (vid) {
        syncAnchorMs.current = vid.currentTime * 1000;
      }
    } else {
      startTimeRef.current = performance.now();
    }
    setIsRunning(true);
  }, [isRunning, isSynced]);

  const stop = useCallback(() => {
    if (!isRunning) return;
    if (isSynced) {
      // Freeze at current elapsed
      const vid = videoRef.current?.current;
      if (vid) {
        frozenElapsed.current = Math.max(0, vid.currentTime * 1000 - syncAnchorMs.current);
        setElapsed(frozenElapsed.current);
      }
    } else {
      accumulatedRef.current += performance.now() - startTimeRef.current;
    }
    setIsRunning(false);
  }, [isRunning, isSynced]);

  const reset = useCallback(() => {
    accumulatedRef.current = 0;
    startTimeRef.current = performance.now();
    syncAnchorMs.current = videoRef.current?.current ? videoRef.current.current.currentTime * 1000 : 0;
    frozenElapsed.current = 0;
    setElapsed(0);
  }, []);

  const clear = useCallback(() => {
    setIsRunning(false);
    accumulatedRef.current = 0;
    syncAnchorMs.current = 0;
    frozenElapsed.current = 0;
    setElapsed(0);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const syncToVideo = useCallback((ref: RefObject<HTMLVideoElement>) => {
    videoRef.current = ref;
    setIsSynced(true);
    if (ref.current) {
      syncAnchorMs.current = ref.current.currentTime * 1000;
      setElapsed(0);
    }
  }, []);

  const unsync = useCallback(() => {
    videoRef.current = null;
    setIsSynced(false);
    // Preserve current elapsed as accumulated for independent mode
    accumulatedRef.current = elapsed;
    startTimeRef.current = performance.now();
  }, [elapsed]);

  useEffect(() => {
    if (isRunning || isSynced) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning, isSynced, tick]);

  const formatTime = useCallback((ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  }, []);

  return { elapsed, isRunning, isSynced, pauseWithVideo, start, stop, reset, clear, syncToVideo, unsync, setPauseWithVideo, formatTime };
}
