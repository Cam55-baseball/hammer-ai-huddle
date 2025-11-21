import { useEffect, RefObject } from 'react';

interface UseVideoSyncProps {
  video1Ref: RefObject<HTMLVideoElement>;
  video2Ref: RefObject<HTMLVideoElement>;
  syncEnabled: boolean;
  timeOffset: number;
  playbackSpeed: number;
}

export function useVideoSync({
  video1Ref,
  video2Ref,
  syncEnabled,
  timeOffset,
  playbackSpeed
}: UseVideoSyncProps) {
  // Sync play event
  useEffect(() => {
    if (!syncEnabled || !video1Ref.current || !video2Ref.current) return;

    const video1 = video1Ref.current;
    const video2 = video2Ref.current;

    const handlePlay = () => {
      if (video2.paused) {
        video2.currentTime = video1.currentTime + timeOffset;
        video2.play().catch(console.error);
      }
    };

    video1.addEventListener('play', handlePlay);
    return () => video1.removeEventListener('play', handlePlay);
  }, [syncEnabled, timeOffset, video1Ref, video2Ref]);

  // Sync pause event
  useEffect(() => {
    if (!syncEnabled || !video1Ref.current || !video2Ref.current) return;

    const video1 = video1Ref.current;
    const video2 = video2Ref.current;

    const handlePause = () => {
      if (!video2.paused) {
        video2.pause();
      }
    };

    video1.addEventListener('pause', handlePause);
    return () => video1.removeEventListener('pause', handlePause);
  }, [syncEnabled, video1Ref, video2Ref]);

  // Sync seeking
  useEffect(() => {
    if (!syncEnabled || !video1Ref.current || !video2Ref.current) return;

    const video1 = video1Ref.current;
    const video2 = video2Ref.current;

    const handleSeeking = () => {
      video2.currentTime = video1.currentTime + timeOffset;
    };

    video1.addEventListener('seeking', handleSeeking);
    return () => video1.removeEventListener('seeking', handleSeeking);
  }, [syncEnabled, timeOffset, video1Ref, video2Ref]);

  // Sync playback rate
  useEffect(() => {
    if (!video1Ref.current || !video2Ref.current) return;

    video1Ref.current.playbackRate = playbackSpeed;
    video2Ref.current.playbackRate = playbackSpeed;
  }, [playbackSpeed, video1Ref, video2Ref]);

  // Maintain time offset during playback
  useEffect(() => {
    if (!syncEnabled || !video1Ref.current || !video2Ref.current) return;

    const video1 = video1Ref.current;
    const video2 = video2Ref.current;

    const interval = setInterval(() => {
      if (!video1.paused && !video2.paused) {
        const expectedTime = video1.currentTime + timeOffset;
        const timeDiff = Math.abs(video2.currentTime - expectedTime);
        
        // Re-sync if drift exceeds 0.1 seconds
        if (timeDiff > 0.1) {
          video2.currentTime = expectedTime;
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [syncEnabled, timeOffset, video1Ref, video2Ref]);
}
