import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Heart, Camera, Pencil, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';

type Phase = 'idle' | 'measuring' | 'result' | 'manual';

interface Props {
  value: string;
  onResult: (bpm: number | null) => void;
}

const MEASURE_DURATION = 30; // seconds
const SAMPLE_INTERVAL_MS = 100;

function analyzeSignal(samples: number[]): number | null {
  if (samples.length < 50) return null;

  // Smooth with a simple moving average (window = 5)
  const windowSize = 5;
  const smoothed: number[] = [];
  for (let i = 0; i < samples.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(samples.length, start + windowSize);
    const slice = samples.slice(start, end);
    smoothed.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }

  // Compute mean and std for adaptive threshold
  const mean = smoothed.reduce((a, b) => a + b, 0) / smoothed.length;
  const std = Math.sqrt(
    smoothed.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / smoothed.length
  );
  const threshold = mean + std * 0.3;

  // Find peaks: local maxima above threshold with minimum distance
  const minPeakDistance = Math.round(0.4 / (SAMPLE_INTERVAL_MS / 1000)); // 0.4s min interval
  const peaks: number[] = [];
  for (let i = 1; i < smoothed.length - 1; i++) {
    if (
      smoothed[i] > threshold &&
      smoothed[i] > smoothed[i - 1] &&
      smoothed[i] > smoothed[i + 1]
    ) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minPeakDistance) {
        peaks.push(i);
      }
    }
  }

  if (peaks.length < 3) return null;

  // Compute average inter-peak interval → BPM
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push((peaks[i] - peaks[i - 1]) * SAMPLE_INTERVAL_MS);
  }
  const avgIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const bpm = Math.round(60000 / avgIntervalMs);

  // Sanity check
  if (bpm < 30 || bpm > 200) return null;
  return bpm;
}

export function RestingHeartRateCapture({ value, onResult }: Props) {
  const isMobile = useIsMobile();
  const [phase, setPhase] = useState<Phase>(() => {
    // If there's already a value, show it as result
    if (value && Number(value) > 0) return 'result';
    // Desktop → straight to manual
    return 'idle';
  });
  const [countdown, setCountdown] = useState(MEASURE_DURATION);
  const [bpm, setBpm] = useState<number | null>(value ? Number(value) : null);
  const [manualValue, setManualValue] = useState(value || '');
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const samplesRef = useRef<number[]>([]);
  const sampleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCamera = useCallback(() => {
    if (sampleTimerRef.current) clearInterval(sampleTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const finalizeMeasurement = useCallback(() => {
    stopCamera();
    const result = analyzeSignal(samplesRef.current);
    setBpm(result);
    if (result !== null) {
      onResult(result);
      setPhase('result');
    } else {
      setErrorMsg('Could not detect a clear pulse. Please try again or enter manually.');
      setPhase('idle');
    }
  }, [stopCamera, onResult]);

  const startMeasurement = useCallback(async () => {
    setErrorMsg('');
    samplesRef.current = [];
    setCountdown(MEASURE_DURATION);

    // Create hidden video + canvas if needed
    if (!videoRef.current) {
      const v = document.createElement('video');
      v.playsInline = true;
      v.muted = true;
      v.style.position = 'absolute';
      v.style.opacity = '0';
      v.style.pointerEvents = 'none';
      document.body.appendChild(v);
      videoRef.current = v;
    }
    if (!canvasRef.current) {
      const c = document.createElement('canvas');
      c.width = 32;
      c.height = 32;
      c.style.display = 'none';
      document.body.appendChild(c);
      canvasRef.current = c;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 32, height: 32 },
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      setPhase('measuring');

      // Sample red channel every 100ms
      sampleTimerRef.current = setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let redSum = 0;
        for (let i = 0; i < data.length; i += 4) {
          redSum += data[i];
        }
        const avgRed = redSum / (canvas.width * canvas.height);
        samplesRef.current.push(avgRed);
      }, SAMPLE_INTERVAL_MS);

      // Countdown
      let remaining = MEASURE_DURATION;
      countdownTimerRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(countdownTimerRef.current!);
          clearInterval(sampleTimerRef.current!);
          finalizeMeasurement();
        }
      }, 1000);
    } catch {
      setErrorMsg('Camera unavailable. Please enter your heart rate manually.');
      setPhase('manual');
    }
  }, [finalizeMeasurement]);

  const handleManualSubmit = () => {
    const v = Number(manualValue);
    if (!manualValue || isNaN(v) || v < 30 || v > 200) {
      setErrorMsg('Please enter a value between 30 and 200 bpm.');
      return;
    }
    setErrorMsg('');
    setBpm(v);
    onResult(v);
    setPhase('result');
  };

  const handleRetake = () => {
    stopCamera();
    setBpm(null);
    onResult(null);
    setManualValue('');
    setErrorMsg('');
    setPhase('idle');
  };

  // ── Desktop: always manual ──────────────────────────────────────────────────
  if (!isMobile) {
    return (
      <div className="space-y-3">
        {phase !== 'result' ? (
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Heart className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500 pointer-events-none" />
              <Input
                type="number"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                placeholder="e.g. 58"
                className="pl-9 max-w-[140px]"
                min={30}
                max={200}
              />
            </div>
            <Button type="button" size="sm" onClick={handleManualSubmit} variant="secondary">
              Save
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
              <span className="text-xl font-bold text-rose-500">{bpm}</span>
              <span className="text-sm text-muted-foreground">bpm</span>
            </div>
            <button
              type="button"
              onClick={handleRetake}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>
        )}
        {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
      </div>
    );
  }

  // ── Mobile ──────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-red-500/10 p-4 space-y-3">

      {/* ── IDLE ── */}
      {phase === 'idle' && (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Heart className="h-4 w-4 text-rose-500 shrink-0" />
            <span>Measure using your camera or enter manually.</span>
          </div>
          {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              size="sm"
              onClick={startMeasurement}
              className="gap-2 bg-rose-500 hover:bg-rose-600 text-white border-0"
            >
              <Camera className="h-4 w-4" />
              Measure with Camera
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => { setErrorMsg(''); setPhase('manual'); }}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" />
              Enter Manually
            </Button>
          </div>
        </>
      )}

      {/* ── MEASURING ── */}
      {phase === 'measuring' && (
        <div className="flex flex-col items-center gap-3 py-2">
          {/* Pulsing heart */}
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-16 w-16 rounded-full bg-rose-500/20 animate-ping" />
            <span className="relative inline-flex h-12 w-12 rounded-full bg-rose-500/30 items-center justify-center">
              <Heart className="h-6 w-6 text-rose-500 fill-rose-500" />
            </span>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Hold your fingertip firmly over the rear camera lens
          </p>
          <div className="text-3xl font-bold tabular-nums text-rose-500">{countdown}s</div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => { stopCamera(); setPhase('idle'); setErrorMsg(''); }}
            className="text-xs gap-1"
          >
            <RotateCcw className="h-3 w-3" /> Cancel
          </Button>
        </div>
      )}

      {/* ── RESULT ── */}
      {phase === 'result' && (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex items-end gap-1">
            <span className="text-5xl font-bold text-rose-500">{bpm}</span>
            <span className="text-lg text-muted-foreground mb-1">bpm</span>
          </div>
          <p className="text-xs text-muted-foreground">Resting Heart Rate</p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => { if (bpm) { onResult(bpm); } }}
              className="gap-2 bg-rose-500 hover:bg-rose-600 text-white border-0"
            >
              <Check className="h-4 w-4" /> Accept
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleRetake}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" /> Retake
            </Button>
          </div>
        </div>
      )}

      {/* ── MANUAL ── */}
      {phase === 'manual' && (
        <div className="space-y-3">
          {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Heart className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rose-500 pointer-events-none" />
              <Input
                type="number"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                placeholder="e.g. 58"
                className="pl-9 max-w-[140px]"
                min={30}
                max={200}
              />
            </div>
            <Button type="button" size="sm" onClick={handleManualSubmit} variant="secondary">
              Save
            </Button>
            <button
              type="button"
              onClick={() => { setErrorMsg(''); setPhase('idle'); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ← Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
