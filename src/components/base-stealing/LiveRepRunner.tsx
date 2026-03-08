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
  // post-rep entries
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

type Phase = 'idle' | 'countdown' | 'waiting_signal' | 'signal_active' | 'rep_done';

export function LiveRepRunner({ config, repNumber, onRepComplete, onEndSession }: LiveRepRunnerProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(10);
  const [randomDelay, setRandomDelay] = useState(0);
  const signalFiredRef = useRef<{ type: 'go' | 'return'; value: string; firedAt: number } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: config.cameraFacing || 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      // Start recording
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
    } catch {
      console.warn('Camera not available');
    }
  }, []);

  const stopCamera = useCallback(() => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  // Countdown effect
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('waiting_signal');
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Start rep
  const handleStartRep = async () => {
    const maxDelay = DIFFICULTY_MAX_DELAY[config.difficulty] || 3000;
    setRandomDelay(Math.random() * maxDelay);
    setCountdown(10);
    signalFiredRef.current = null;
    await startCamera();
    setPhase('countdown');
  };

  const handleSignalFired = useCallback((signal: { type: 'go' | 'return'; value: string; firedAt: number }) => {
    signalFiredRef.current = signal;
    // Auto-dismiss signal after 2s and transition to rep_done
    setTimeout(() => {
      setPhase('rep_done');
      stopCamera();
    }, 2000);
  }, [stopCamera]);

  const handleReactionConfirm = (userDecision: 'go' | 'return') => {
    const now = Date.now();
    const sig = signalFiredRef.current;
    if (!sig) return;

    const decisionTimeSec = (now - sig.firedAt) / 1000;
    const decisionCorrect = userDecision === sig.type;
    const eliteJump = sig.type === 'go' && decisionTimeSec < 0.2;

    const videoBlob = chunksRef.current.length > 0
      ? new Blob(chunksRef.current, { type: 'video/webm' })
      : null;

    onRepComplete({
      repNumber,
      signalType: sig.type,
      signalValue: sig.value,
      delayBeforeSignalMs: randomDelay,
      signalFiredAt: sig.firedAt,
      reactionConfirmedAt: now,
      decisionTimeSec: Math.round(decisionTimeSec * 100) / 100,
      decisionCorrect,
      eliteJump,
      videoBlob,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      {/* Hidden camera preview */}
      <video ref={videoRef} autoPlay muted playsInline className={phase === 'idle' && config.cameraFacing === 'user' && streamRef.current ? 'w-full max-w-sm rounded-lg border border-border mx-auto mb-4' : 'opacity-0 absolute w-0 h-0'} />

      {phase === 'idle' && (
        <div className="text-center space-y-6">
          <p className="text-lg font-medium">Rep #{repNumber}</p>
          <p className="text-sm text-muted-foreground">Press start when ready. A 10-second countdown will begin.</p>
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
          />
        </>
      )}

      {phase === 'signal_active' && (
        <p className="text-muted-foreground text-sm">Signal displayed...</p>
      )}

      {phase === 'rep_done' && (
        <div className="text-center space-y-6">
          <p className="text-lg font-semibold">What did you do?</p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              className="px-10 py-6 text-lg bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleReactionConfirm('go')}
            >
              GO (Stole)
            </Button>
            <Button
              size="lg"
              className="px-10 py-6 text-lg bg-red-600 hover:bg-red-700 text-white"
              onClick={() => handleReactionConfirm('return')}
            >
              BACK (Returned)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
