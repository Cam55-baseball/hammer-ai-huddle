import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ReactionSignal } from './ReactionSignal';
import { Play, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { LeadConfig } from './SessionSetup';

const DIFFICULTY_MAX_DELAY: Record<string, number> = {
  easy: 2000,
  medium: 3000,
  hard: 5000,
};

const SIGNAL_DISPLAY_MS = 3000;
const POST_SIGNAL_BUFFER_MS = 2000;
const FRAME_COUNT = 20;

export interface RepResult {
  repNumber: number;
  signalType: 'go' | 'return';
  signalValue: string;
  delayBeforeSignalMs: number;
  signalFiredAt: number;
  reactionConfirmedAt: number | null;
  decisionTimeSec: number | null;
  decisionCorrect: boolean | null;
  eliteJump: boolean;
  videoBlob: Blob | null;
  stepsTaken?: number;
  timeToBaseSec?: number;
  baseDistanceFt?: number;
  aiConfidence?: 'high' | 'medium' | 'low';
  aiReasoning?: string;
  firstTwoStepsSec?: number;
}

interface LiveRepRunnerProps {
  config: LeadConfig;
  repNumber: number;
  onRepComplete: (result: RepResult) => void;
  onEndSession: () => void;
}

type Phase = 'idle' | 'countdown' | 'waiting_signal' | 'signal_active' | 'post_signal_buffer' | 'analyzing' | 'finishing';

/** Resolve duration via brief play/pause — more reliable than seek-to-1e10 for WebM blobs */
async function resolveVideoDuration(video: HTMLVideoElement): Promise<number | null> {
  if (isFinite(video.duration) && video.duration > 0) return video.duration;

  console.log('[FRAME EXTRACTION] Duration is Infinity, trying play/pause workaround');
  try {
    video.muted = true;
    await video.play();
    video.pause();
    // After play/pause, some browsers resolve the duration
    if (isFinite(video.duration) && video.duration > 0) {
      console.log('[FRAME EXTRACTION] play/pause resolved duration:', video.duration);
      return video.duration;
    }
  } catch (e) {
    console.warn('[FRAME EXTRACTION] play/pause workaround failed:', e);
  }
  // Return null — caller should proceed without duration
  return null;
}

/** Seek with a per-frame timeout to avoid hanging */
function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      reject(new Error(`Seek to ${time.toFixed(2)}s timed out`));
    }, 3000);
    const onSeeked = () => {
      clearTimeout(timer);
      resolve();
    };
    video.addEventListener('seeked', onSeeked, { once: true });
    video.currentTime = time;
  });
}

/** Extract frames from a video blob between startSec and endSec — no duration clamping */
async function extractFrames(videoBlob: Blob, startSec: number, endSec: number, count: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('No canvas context')); return; }

    const timeout = setTimeout(() => { cleanup(); reject(new Error('Frame extraction timeout')); }, 25000);

    const cleanup = () => {
      clearTimeout(timeout);
      if (video.src) URL.revokeObjectURL(video.src);
    };

    video.addEventListener('loadedmetadata', async () => {
      canvas.width = Math.min(video.videoWidth, 640);
      canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));

      // Try to resolve duration (for logging only), but don't clamp against it
      const resolvedDuration = await resolveVideoDuration(video);
      console.log('[FRAME EXTRACTION] Resolved duration:', resolvedDuration, '| Requested range:', startSec.toFixed(2), '-', endSec.toFixed(2));

      // Seek directly to calculated timestamps — no clamping against duration
      const interval = count > 1 ? (endSec - startSec) / (count - 1) : 0;
      const frames: string[] = [];

      try {
        for (let i = 0; i < count; i++) {
          const t = startSec + i * interval;
          try {
            await seekTo(video, t);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            if (dataUrl && dataUrl.length > 100) {
              frames.push(dataUrl);
              console.log(`[FRAME EXTRACTION] Frame ${i + 1}/${count} captured at ${t.toFixed(2)}s`);
            }
          } catch (seekErr) {
            console.warn(`[FRAME EXTRACTION] Skipping frame at ${t.toFixed(2)}s:`, seekErr);
          }
        }
        cleanup();
        resolve(frames);
      } catch (e) {
        cleanup();
        reject(e);
      }
    }, { once: true });

    video.addEventListener('error', () => { cleanup(); reject(new Error('Video load error')); }, { once: true });
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(videoBlob);
  });
}

export function LiveRepRunner({ config, repNumber, onRepComplete, onEndSession }: LiveRepRunnerProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(10);
  const [randomDelay, setRandomDelay] = useState(0);
  const [analyzingMsg, setAnalyzingMsg] = useState('Analyzing your reaction...');
  const signalFiredRef = useRef<{ type: 'go' | 'return'; value: string; firedAt: number } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const blobResolveRef = useRef<((blob: Blob | null) => void) | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Start camera on mount
  useEffect(() => {
    let cancelled = false;
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraReady(true);
      } catch (err: any) {
        console.warn('Camera not available:', err);
        const msg = err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access to use Base Stealing Lab.'
          : 'Camera not available. Please check your device.';
        setCameraError(msg);
      }
    };
    initCamera();
    return () => { cancelled = true; streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; };
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) {
      console.error('Cannot start recording — no camera stream');
      return false;
    }
    chunksRef.current = [];
    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: 'video/webm' }) : null;
        blobResolveRef.current?.(blob);
        blobResolveRef.current = null;
        setIsRecording(false);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      return true;
    } catch (err) {
      console.warn('MediaRecorder not supported:', err);
      return false;
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: 'video/webm' }) : null);
        return;
      }
      blobResolveRef.current = resolve;
      recorder.stop();
    });
  }, []);

  // Countdown effect — start recording at countdown=3 with safeguard
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown === 3) {
      const success = startRecording();
      if (!success) {
        // Recording failed — abort rep
        setCameraError('Recording failed to start. Please check camera permissions and try again.');
        setPhase('idle');
        return;
      }
    }
    if (countdown <= 0) {
      setPhase('waiting_signal');
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, startRecording]);

  const handleStartRep = () => {
    if (!cameraReady) return;
    setCameraError(null);
    const maxDelay = DIFFICULTY_MAX_DELAY[config.difficulty] || 3000;
    setRandomDelay(Math.random() * maxDelay);
    setCountdown(10);
    signalFiredRef.current = null;
    setPhase('countdown');
  };

  const handleSignalFired = useCallback((signal: { type: 'go' | 'return'; value: string; firedAt: number }) => {
    signalFiredRef.current = signal;
    setPhase('signal_active');
  }, []);

  const handleSignalDismissed = useCallback(() => {
    // Signal auto-dismissed after 3s, wait 2s more buffer then stop
    setPhase('post_signal_buffer');
    setTimeout(async () => {
      const sig = signalFiredRef.current;
      if (!sig) return;

      const videoBlob = await stopRecording();
      setPhase('analyzing');

      if (!videoBlob) {
        // No video — can't analyze, create result with nulls
        onRepComplete({
          repNumber, signalType: sig.type, signalValue: sig.value,
          delayBeforeSignalMs: randomDelay, signalFiredAt: sig.firedAt,
          reactionConfirmedAt: null, decisionTimeSec: null, decisionCorrect: null,
          eliteJump: false, videoBlob: null, aiConfidence: 'low',
          aiReasoning: 'No video captured for analysis.',
        });
        return;
      }

      try {
        setAnalyzingMsg('Extracting frames...');
        // Calculate where signal appeared relative to recording start
        const recStart = recordingStartTimeRef.current;
        const signalOffsetSec = (sig.firedAt - recStart) / 1000;
        // Tight 3s window: 0.5s before signal to 2.5s after
        const extractStart = Math.max(0, signalOffsetSec - 0.5);
        const extractEnd = signalOffsetSec + 2.5;

        const frames = await extractFrames(videoBlob, extractStart, extractEnd, FRAME_COUNT);

        if (frames.length < 3) throw new Error('Too few frames extracted');

        // Compute exact timestamps for each extracted frame (ms relative to signal)
        const interval = frames.length > 1 ? (extractEnd - extractStart) / (frames.length - 1) : 0;
        const frameTimestampsMs = frames.map((_, i) => {
          const frameSec = extractStart + i * interval;
          return Math.round((frameSec - signalOffsetSec) * 1000); // ms relative to signal (negative = before)
        });

        // Signal frame is the one closest to 0ms
        const signalFrameIndex = frameTimestampsMs.reduce((best, ms, i) =>
          Math.abs(ms) < Math.abs(frameTimestampsMs[best]) ? i : best, 0);

        console.log('[FRAME EXTRACTION] Frame timestamps (ms from signal):', frameTimestampsMs);
        console.log('[FRAME EXTRACTION] Signal frame index:', signalFrameIndex);

        setAnalyzingMsg('Hammer analyzing movement...');
        const { data, error } = await supabase.functions.invoke('analyze-base-stealing-rep', {
          body: {
            frames,
            signalFrameIndex,
            signalType: sig.type,
            signalValue: sig.value,
            totalFrames: frames.length,
            frameTimestampsMs,
          },
        });

        if (error) throw error;

        const movementDetected: boolean = data.movementDetected !== false;
        const aiDirection: 'go' | 'return' = data.direction;
        const confidence: 'high' | 'medium' | 'low' = data.confidence || 'medium';
        const reasoning: string = data.reasoning || '';

        // If no movement detected, treat as unanalyzable
        if (!movementDetected || (confidence === 'low' && !movementDetected)) {
          onRepComplete({
            repNumber, signalType: sig.type, signalValue: sig.value,
            delayBeforeSignalMs: randomDelay, signalFiredAt: sig.firedAt,
            reactionConfirmedAt: null, decisionTimeSec: null, decisionCorrect: null,
            eliteJump: false, videoBlob, aiConfidence: confidence,
            aiReasoning: reasoning || 'No movement detected in video. Unable to analyze reaction.',
          });
          return;
        }

        // Use AI's ms-precision estimate if available, fall back to frame-based calc
        let decisionTimeSec: number;
        if (data.estimatedReactionMs != null && data.estimatedReactionMs > 0) {
          decisionTimeSec = Math.round(data.estimatedReactionMs) / 1000;
        } else {
          // Fallback: frame-based calculation
          const movementFrame: number = data.movementStartFrameIndex;
          const framesDelta = Math.max(0, movementFrame - signalFrameIndex);
          decisionTimeSec = Math.round(framesDelta * interval * 100) / 100;
        }
        decisionTimeSec = Math.round(decisionTimeSec * 100) / 100; // 0.01s precision

        const decisionCorrect = aiDirection === sig.type;
        const eliteJump = sig.type === 'go' && decisionTimeSec < 0.2;

        // First two steps time (go/steal reps only)
        let firstTwoStepsSec: number | undefined;
        if (sig.type === 'go' && data.firstTwoStepsCompleteFrameIndex != null) {
          const stepsFrameIdx = data.firstTwoStepsCompleteFrameIndex;
          if (stepsFrameIdx >= 0 && stepsFrameIdx < frameTimestampsMs.length) {
            const stepsMs = frameTimestampsMs[stepsFrameIdx];
            if (stepsMs > 0) {
              firstTwoStepsSec = Math.round(stepsMs) / 1000;
              firstTwoStepsSec = Math.round(firstTwoStepsSec * 100) / 100;
            }
          }
        }

        onRepComplete({
          repNumber, signalType: sig.type, signalValue: sig.value,
          delayBeforeSignalMs: randomDelay, signalFiredAt: sig.firedAt,
          reactionConfirmedAt: sig.firedAt + decisionTimeSec * 1000,
          decisionTimeSec, decisionCorrect, eliteJump, videoBlob,
          aiConfidence: confidence, aiReasoning: reasoning,
          firstTwoStepsSec,
        });
      } catch (err) {
        console.error('AI analysis failed:', err);
        setAnalyzingMsg('Analysis failed — saving rep without Hammer data');
        setTimeout(() => {
          onRepComplete({
            repNumber, signalType: sig.type, signalValue: sig.value,
            delayBeforeSignalMs: randomDelay, signalFiredAt: sig.firedAt,
            reactionConfirmedAt: null, decisionTimeSec: null, decisionCorrect: null,
            eliteJump: false, videoBlob, aiConfidence: 'low',
            aiReasoning: 'Hammer analysis failed. Review video manually.',
          });
        }, 1500);
      }
    }, POST_SIGNAL_BUFFER_MS);
  }, [stopRecording, onRepComplete, repNumber, randomDelay]);

  const showPreview = phase === 'idle';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 relative">
      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full z-10">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-medium text-red-500">REC</span>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={showPreview
          ? 'w-full max-w-sm rounded-lg border border-border mx-auto'
          : 'opacity-0 absolute w-0 h-0 pointer-events-none'
        }
      />

      {phase === 'idle' && (
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Rep #{repNumber}</p>
          {cameraError && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {cameraError}
            </div>
          )}
          {!cameraReady && !cameraError && (
            <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Initializing camera...
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Confirm you're visible in the preview above, then press Start.
          </p>
          <div className="flex gap-3 justify-center">
            <Button size="lg" onClick={handleStartRep} className="gap-2 px-8" disabled={!cameraReady}>
              <Play className="h-5 w-5" />
              Start Rep
            </Button>
            {repNumber > 1 && (
              <Button variant="outline" size="lg" onClick={onEndSession}>
                Save & End
              </Button>
            )}
          </div>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="text-center space-y-4">
          <div className="text-8xl font-black tabular-nums text-primary">
            {countdown}
          </div>
          {countdown <= 3 && countdown > 0 && (
            <p className="text-2xl font-bold text-primary animate-pulse">TAKE LEAD</p>
          )}
          {countdown <= 0 && (
            <p className="text-lg text-muted-foreground">Get ready...</p>
          )}
        </div>
      )}

      {(phase === 'waiting_signal' || phase === 'signal_active') && (
        <>
          <div className="text-center space-y-2">
            <div className="h-16 w-16 rounded-full border-4 border-primary/30 animate-pulse mx-auto" />
            <p className="text-sm text-muted-foreground">
              {phase === 'signal_active' ? 'React!' : 'Hold your lead...'}
            </p>
          </div>
          <ReactionSignal
            mode={config.signalMode}
            delay={randomDelay}
            active={phase === 'waiting_signal'}
            onSignalFired={handleSignalFired}
            onSignalDismissed={handleSignalDismissed}
          />
        </>
      )}

      {(phase === 'post_signal_buffer' || phase === 'analyzing' || phase === 'finishing') && (
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">{analyzingMsg}</p>
        </div>
      )}
    </div>
  );
}
