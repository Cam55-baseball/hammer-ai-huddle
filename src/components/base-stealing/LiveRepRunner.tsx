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
const FRAME_COUNT = 8;

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
}

interface LiveRepRunnerProps {
  config: LeadConfig;
  repNumber: number;
  onRepComplete: (result: RepResult) => void;
  onEndSession: () => void;
}

type Phase = 'idle' | 'countdown' | 'waiting_signal' | 'signal_active' | 'post_signal_buffer' | 'analyzing' | 'finishing';

/** Extract frames from a video blob between startSec and endSec */
async function extractFrames(videoBlob: Blob, startSec: number, endSec: number, count: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) { reject(new Error('No canvas context')); return; }

    const timeout = setTimeout(() => { cleanup(); reject(new Error('Frame extraction timeout')); }, 20000);

    const cleanup = () => {
      clearTimeout(timeout);
      if (video.src) URL.revokeObjectURL(video.src);
    };

    video.addEventListener('loadedmetadata', async () => {
      canvas.width = Math.min(video.videoWidth, 640);
      canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));

      const duration = video.duration;
      const clampedStart = Math.max(0, Math.min(startSec, duration));
      const clampedEnd = Math.min(endSec, duration);
      const interval = (clampedEnd - clampedStart) / (count - 1);
      const frames: string[] = [];

      try {
        for (let i = 0; i < count; i++) {
          const t = clampedStart + i * interval;
          video.currentTime = t;
          await new Promise<void>((res) => {
            video.addEventListener('seeked', () => res(), { once: true });
          });
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          if (dataUrl && dataUrl.length > 100) frames.push(dataUrl);
        }
        cleanup();
        resolve(frames);
      } catch (e) {
        cleanup();
        reject(e);
      }
    }, { once: true });

    video.addEventListener('error', () => { cleanup(); reject(new Error('Video load error')); }, { once: true });
    video.preload = 'metadata';
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

  // Countdown effect — start recording at countdown=3
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown === 3) {
      startRecording();
    }
    if (countdown <= 0) {
      setPhase('waiting_signal');
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, startRecording]);

  const handleStartRep = () => {
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
        const extractStart = Math.max(0, signalOffsetSec - 0.2);
        const extractEnd = signalOffsetSec + SIGNAL_DISPLAY_MS / 1000 + 1;

        const frames = await extractFrames(videoBlob, extractStart, extractEnd, FRAME_COUNT);

        if (frames.length < 3) throw new Error('Too few frames extracted');

        // Signal frame is approximately index 1 (we start 0.2s before signal)
        const signalFrameIndex = Math.min(1, frames.length - 1);

        setAnalyzingMsg('AI analyzing movement...');
        const { data, error } = await supabase.functions.invoke('analyze-base-stealing-rep', {
          body: {
            frames,
            signalFrameIndex,
            signalType: sig.type,
            signalValue: sig.value,
            totalFrames: frames.length,
          },
        });

        if (error) throw error;

        const aiDirection: 'go' | 'return' = data.direction;
        const movementFrame: number = data.movementStartFrameIndex;
        const confidence: 'high' | 'medium' | 'low' = data.confidence || 'medium';
        const reasoning: string = data.reasoning || '';

        // Calculate reaction time from frame indices
        const frameDurationSec = (extractEnd - extractStart) / (FRAME_COUNT - 1);
        const framesDelta = Math.max(0, movementFrame - signalFrameIndex);
        const decisionTimeSec = Math.round(framesDelta * frameDurationSec * 100) / 100;
        const decisionCorrect = aiDirection === sig.type;
        const eliteJump = sig.type === 'go' && decisionTimeSec < 0.2;

        onRepComplete({
          repNumber, signalType: sig.type, signalValue: sig.value,
          delayBeforeSignalMs: randomDelay, signalFiredAt: sig.firedAt,
          reactionConfirmedAt: sig.firedAt + decisionTimeSec * 1000,
          decisionTimeSec, decisionCorrect, eliteJump, videoBlob,
          aiConfidence: confidence, aiReasoning: reasoning,
        });
      } catch (err) {
        console.error('AI analysis failed:', err);
        setAnalyzingMsg('Analysis failed — saving rep without AI data');
        setTimeout(() => {
          onRepComplete({
            repNumber, signalType: sig.type, signalValue: sig.value,
            delayBeforeSignalMs: randomDelay, signalFiredAt: sig.firedAt,
            reactionConfirmedAt: null, decisionTimeSec: null, decisionCorrect: null,
            eliteJump: false, videoBlob, aiConfidence: 'low',
            aiReasoning: 'AI analysis failed. Review video manually.',
          });
        }, 1500);
      }
    }, POST_SIGNAL_BUFFER_MS);
  }, [stopRecording, onRepComplete, repNumber, randomDelay]);

  const showPreview = phase === 'idle';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
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
          <p className="text-sm text-muted-foreground">
            Confirm you're visible in the preview above, then press Start.
          </p>
          <div className="flex gap-3 justify-center">
            <Button size="lg" onClick={handleStartRep} className="gap-2 px-8">
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
