import { useState, useRef, useCallback, useEffect, RefObject } from 'react';

interface UseRoyalTimingTimerReturn {
  elapsed: number;
  isRunning: boolean;
  isSynced: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  clear: () => void;
  syncToVideo: (videoRef: RefObject<HTMLVideoElement>) => void;
  unsync: () => void;
  formatTime: (ms: number) => string;
}

export function useRoyalTimingTimer(): UseRoyalTimingTimerReturn {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const videoRef = useRef<RefObject<HTMLVideoElement> | null>(null);

  const tick = useCallback(() => {
    if (isSynced && videoRef.current?.current) {
      setElapsed(videoRef.current.current.currentTime * 1000);
    } else {
      const now = performance.now();
      setElapsed(accumulatedRef.current + (now - startTimeRef.current));
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [isSynced]);

  const start = useCallback(() => {
    if (isRunning) return;
    startTimeRef.current = performance.now();
    setIsRunning(true);
  }, [isRunning]);

  const stop = useCallback(() => {
    if (!isRunning) return;
    if (!isSynced) {
      accumulatedRef.current += performance.now() - startTimeRef.current;
    }
    setIsRunning(false);
  }, [isRunning, isSynced]);

  const reset = useCallback(() => {
    accumulatedRef.current = 0;
    startTimeRef.current = performance.now();
    setElapsed(0);
  }, []);

  const clear = useCallback(() => {
    setIsRunning(false);
    accumulatedRef.current = 0;
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
      setElapsed(ref.current.currentTime * 1000);
    }
  }, []);

  const unsync = useCallback(() => {
    videoRef.current = null;
    setIsSynced(false);
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

  return { elapsed, isRunning, isSynced, start, stop, reset, clear, syncToVideo, unsync, formatTime };
}
