import { useState, useRef, useCallback, useEffect, RefObject } from 'react';

interface UseRoyalTimingTimerReturn {
  elapsed: number;
  isRunning: boolean;
  isSynced: boolean;
  autoStartStop: boolean;
  setAutoStartStop: (val: boolean) => void;
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
  const [autoStartStop, setAutoStartStop] = useState(false);

  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const videoRef = useRef<RefObject<HTMLVideoElement> | null>(null);
  const syncOffsetRef = useRef<number>(0);
  const hasStartedRef = useRef<boolean>(false);

  const tick = useCallback(() => {
    if (isSynced && videoRef.current?.current) {
      const videoMs = videoRef.current.current.currentTime * 1000;
      setElapsed(Math.max(0, videoMs - syncOffsetRef.current));
    } else {
      const now = performance.now();
      setElapsed(accumulatedRef.current + (now - startTimeRef.current));
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [isSynced]);

  const start = useCallback(() => {
    if (isRunning) return;
    if (isSynced && videoRef.current?.current) {
      if (!hasStartedRef.current) {
        syncOffsetRef.current = videoRef.current.current.currentTime * 1000;
        hasStartedRef.current = true;
      }
    } else {
      startTimeRef.current = performance.now();
    }
    setIsRunning(true);
  }, [isRunning, isSynced]);

  const stop = useCallback(() => {
    if (!isRunning) return;
    if (!isSynced) {
      accumulatedRef.current += performance.now() - startTimeRef.current;
    }
    setIsRunning(false);
  }, [isRunning, isSynced]);

  const reset = useCallback(() => {
    accumulatedRef.current = 0;
    syncOffsetRef.current = 0;
    hasStartedRef.current = false;
    startTimeRef.current = performance.now();
    setElapsed(0);
  }, []);

  const clear = useCallback(() => {
    setIsRunning(false);
    accumulatedRef.current = 0;
    syncOffsetRef.current = 0;
    hasStartedRef.current = false;
    setElapsed(0);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const syncToVideo = useCallback((ref: RefObject<HTMLVideoElement>) => {
    videoRef.current = ref;
    setIsSynced(true);
  }, []);

  const unsync = useCallback(() => {
    videoRef.current = null;
    setIsSynced(false);
    syncOffsetRef.current = 0;
    accumulatedRef.current = elapsed;
    startTimeRef.current = performance.now();
  }, [elapsed]);

  useEffect(() => {
    if (isRunning) {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning, tick]);

  // Auto start/stop: listen to video play/pause events
  useEffect(() => {
    const video = videoRef.current?.current;
    if (!isSynced || !autoStartStop || !video) return;

    const onPlay = () => { if (!isRunning) start(); };
    const onPause = () => { if (isRunning) stop(); };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onPause);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onPause);
    };
  }, [isSynced, autoStartStop, isRunning, start, stop]);

  const formatTime = useCallback((ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
  }, []);

  return { elapsed, isRunning, isSynced, autoStartStop, setAutoStartStop, start, stop, reset, clear, syncToVideo, unsync, formatTime };
}
