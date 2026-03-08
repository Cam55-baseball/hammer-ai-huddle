import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ReactionSignal } from './ReactionSignal';
import { Play } from 'lucide-react';
import type { LeadConfig } from './SessionSetup';

const DIFFICULTY_MAX_DELAY: Record<string, number> = {
  easy: 2000,
  medium: 3000,
  hard: 5000,
};

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
}

interface LiveRepRunnerProps {
  config: LeadConfig;
  repNumber: number;
  onRepComplete: (result: RepResult) => void;
  onEndSession: () => void;
}

type Phase = 'idle' | 'countdown' | 'waiting_signal' | 'signal_active' | 'finishing';

export function LiveRepRunner({ config, repNumber, onRepComplete, onEndSession }: LiveRepRunnerProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(10);
  const [randomDelay, setRandomDelay] = useState(0);
  const signalFiredRef = useRef<{ type: 'go' | 'return'; value: string; firedAt: number } | null>(null);
  const reactionRef = useRef<{ decision: 'go' | 'return'; timestamp: number } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const blobResolveRef = useRef<((blob: Blob | null) => void) | null>(null);

  // Start camera on mount for preview
  useEffect(() => {
    let cancelled = false;
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        console.warn('Camera not available');
      }
    };
    initCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Start recording (called when countdown finishes)
  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    try {
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = chunksRef.current.length > 0
          ? new Blob(chunksRef.current, { type: 'video/webm' })
          : null;
        blobResolveRef.current?.(blob);
        blobResolveRef.current = null;
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
    } catch {
      console.warn('MediaRecorder not supported');
    }
  }, []);

  // Stop recording and return blob via promise
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

  // Countdown effect
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      startRecording();
      setPhase('waiting_signal');
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown, startRecording]);

  // Start rep
  const handleStartRep = () => {
    const maxDelay = DIFFICULTY_MAX_DELAY[config.difficulty] || 3000;
    setRandomDelay(Math.random() * maxDelay);
    setCountdown(10);
    signalFiredRef.current = null;
    reactionRef.current = null;
    setPhase('countdown');
  };

  const handleSignalFired = useCallback((signal: { type: 'go' | 'return'; value: string; firedAt: number }) => {
    signalFiredRef.current = signal;
  }, []);

  const handleUserReact = useCallback(async (decision: 'go' | 'return') => {
    const now = Date.now();
    const sig = signalFiredRef.current;
    if (!sig) return;

    reactionRef.current = { decision, timestamp: now };
    setPhase('finishing');

    const videoBlob = await stopRecording();

    const decisionTimeSec = Math.round(((now - sig.firedAt) / 1000) * 100) / 100;
    const decisionCorrect = decision === sig.type;
    const eliteJump = sig.type === 'go' && decisionTimeSec < 0.2;

    onRepComplete({
      repNumber,
      signalType: sig.type,
      signalValue: sig.value,
      delayBeforeSignalMs: randomDelay,
      signalFiredAt: sig.firedAt,
      reactionConfirmedAt: now,
      decisionTimeSec,
      decisionCorrect,
      eliteJump,
      videoBlob,
    });
  }, [stopRecording, onRepComplete, repNumber, randomDelay]);

  const showPreview = phase === 'idle';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      {/* Camera preview — visible only during idle for framing */}
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

      {phase === 'waiting_signal' && (
        <>
          <div className="text-center space-y-2">
            <div className="h-16 w-16 rounded-full border-4 border-primary/30 animate-pulse mx-auto" />
            <p className="text-sm text-muted-foreground">Hold your lead...</p>
          </div>
          <ReactionSignal
            mode={config.signalMode}
            delay={randomDelay}
            active
            onSignalFired={handleSignalFired}
            onUserReact={handleUserReact}
          />
        </>
      )}

      {phase === 'finishing' && (
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Processing rep...</p>
        </div>
      )}
    </div>
  );
}
