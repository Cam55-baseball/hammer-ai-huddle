import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  X, Video, Play, Pause, RotateCcw, Download, BookMarked, 
  Settings, Timer, Clock, Gauge, Camera, CheckCircle2, AlertCircle,
  Sparkles, SwitchCamera, Brain, Grid3X3, Volume2, VolumeX, 
  Wifi, WifiOff, RefreshCw, Maximize, Square
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SaveToLibraryDialog } from "./SaveToLibraryDialog";
import i18n from "@/i18n";

interface RealTimePlaybackProps {
  isOpen: boolean;
  onClose: () => void;
  module: string;
  sport: string;
}

type Phase = 'setup' | 'countdown' | 'recording' | 'waiting' | 'playback' | 'complete';
type FacingMode = 'user' | 'environment';

interface Analysis {
  positives: string[];
  tips: string[];
  overallNote: string;
}

const RECORDING_DURATIONS = [10, 15, 20, 30, 40];
const PLAYBACK_DELAYS = [5, 10, 15, 20, 25, 30];
const REPEAT_DURATIONS = [30, 45, 60, 90, 120];
const PLAYBACK_SPEEDS = ['0.25', '0.5', '0.75', '1'];

export const RealTimePlayback = ({ isOpen, onClose, module, sport }: RealTimePlaybackProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Settings
  const [recordingDuration, setRecordingDuration] = useState<number>(() => 
    parseInt(localStorage.getItem('rtPlayback_recordingDuration') || '15')
  );
  const [playbackDelay, setPlaybackDelay] = useState<number>(() => 
    parseInt(localStorage.getItem('rtPlayback_playbackDelay') || '5')
  );
  const [repeatDuration, setRepeatDuration] = useState<number>(() => 
    parseInt(localStorage.getItem('rtPlayback_repeatDuration') || '60')
  );
  const [playbackSpeed, setPlaybackSpeed] = useState<string>(() => 
    localStorage.getItem('rtPlayback_playbackSpeed') || '0.5'
  );
  const [facingMode, setFacingMode] = useState<FacingMode>(() => 
    (localStorage.getItem('rtPlayback_facingMode') as FacingMode) || 'user'
  );
  const [analysisEnabled, setAnalysisEnabled] = useState<boolean>(() => 
    localStorage.getItem('rtPlayback_analysisEnabled') !== 'false'
  );
  const [gridOverlayEnabled, setGridOverlayEnabled] = useState<boolean>(() => 
    localStorage.getItem('rtPlayback_gridOverlay') === 'true'
  );
  const [audioCuesEnabled, setAudioCuesEnabled] = useState<boolean>(() => 
    localStorage.getItem('rtPlayback_audioCues') !== 'false'
  );
  const [localOnlyMode, setLocalOnlyMode] = useState<boolean>(() => 
    localStorage.getItem('rtPlayback_localOnly') === 'true'
  );
  const [autoRecordEnabled, setAutoRecordEnabled] = useState<boolean>(() => 
    localStorage.getItem('rtPlayback_autoRecord') === 'true'
  );
  
  // State
  const [phase, setPhase] = useState<Phase>('setup');
  const [countdown, setCountdown] = useState(20);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(0);
  const [waitingTimeLeft, setWaitingTimeLeft] = useState(0);
  const [playbackTimeLeft, setPlaybackTimeLeft] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [autoRecordCountdown, setAutoRecordCountdown] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Refs
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const videoPlaybackRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownCancelledRef = useRef(false);
  const cameraContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Persist settings
  useEffect(() => {
    localStorage.setItem('rtPlayback_recordingDuration', String(recordingDuration));
    localStorage.setItem('rtPlayback_playbackDelay', String(playbackDelay));
    localStorage.setItem('rtPlayback_repeatDuration', String(repeatDuration));
    localStorage.setItem('rtPlayback_playbackSpeed', playbackSpeed);
    localStorage.setItem('rtPlayback_facingMode', facingMode);
    localStorage.setItem('rtPlayback_analysisEnabled', String(analysisEnabled));
    localStorage.setItem('rtPlayback_gridOverlay', String(gridOverlayEnabled));
    localStorage.setItem('rtPlayback_audioCues', String(audioCuesEnabled));
    localStorage.setItem('rtPlayback_localOnly', String(localOnlyMode));
    localStorage.setItem('rtPlayback_autoRecord', String(autoRecordEnabled));
  }, [recordingDuration, playbackDelay, repeatDuration, playbackSpeed, facingMode, analysisEnabled, gridOverlayEnabled, audioCuesEnabled, localOnlyMode, autoRecordEnabled]);
  
  // Speed control during playback
  useEffect(() => {
    if (videoPlaybackRef.current && (phase === 'playback' || phase === 'complete')) {
      videoPlaybackRef.current.playbackRate = parseFloat(playbackSpeed);
    }
  }, [playbackSpeed, phase]);

  // Audio cue helper
  const playBeep = useCallback((frequency = 800, duration = 150, volume = 0.3) => {
    if (!audioCuesEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (e) {
      console.error('Audio playback error:', e);
    }
  }, [audioCuesEnabled]);

  // Double beep for recording start
  const playDoubleBeep = useCallback(() => {
    playBeep(1000, 100);
    setTimeout(() => playBeep(1200, 100), 150);
  }, [playBeep]);

  // Long beep for recording stop
  const playLongBeep = useCallback(() => {
    playBeep(600, 400, 0.4);
  }, [playBeep]);
  
  // Get supported mimeType with fallbacks
  const getSupportedMimeType = useCallback(() => {
    const types = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];
    return types.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';
  }, []);

  // Attach stream to video element helper
  const attachPreviewStream = useCallback(() => {
    if (videoPreviewRef.current && streamRef.current) {
      videoPreviewRef.current.srcObject = streamRef.current;
      videoPreviewRef.current.play().catch(console.error);
    }
  }, []);

  // Fullscreen helpers
  const enterFullscreen = useCallback(async () => {
    if (cameraContainerRef.current?.requestFullscreen) {
      try {
        await cameraContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (e) {
        console.error('Fullscreen error:', e);
      }
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }
    setIsFullscreen(false);
  }, []);

  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Initialize camera
  const initCamera = useCallback(async (mode: FacingMode = facingMode) => {
    try {
      console.log('Initializing camera with facingMode:', mode);
      
      // Stop existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      console.log('Stream acquired:', stream.active);
      
      attachPreviewStream();
      setCameraPermission(true);
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraPermission(false);
      toast.error(t('realTimePlayback.cameraPermissionDenied', 'Camera access was denied'));
    }
  }, [t, facingMode, attachPreviewStream]);
  
  // Cleanup camera
  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Flip camera
  const handleFlipCamera = useCallback(async () => {
    const newMode: FacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    await initCamera(newMode);
  }, [facingMode, initCamera]);

  // Cancel countdown
  const handleCancelCountdown = useCallback(() => {
    countdownCancelledRef.current = true;
  }, []);
  
  // Initialize camera only when dialog opens
  useEffect(() => {
    if (isOpen) {
      initCamera();
    }
    return () => {
      if (!isOpen) {
        stopCamera();
        exitFullscreen();
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [isOpen, initCamera, stopCamera, exitFullscreen, recordedUrl]);

  // Re-attach stream when phase changes (for persistent preview)
  useEffect(() => {
    if (isOpen && (phase === 'setup' || phase === 'countdown' || phase === 'recording')) {
      attachPreviewStream();
    }
  }, [isOpen, phase, attachPreviewStream]);
  
  // Recording flow
  const startRecordingFlow = async () => {
    console.log('Starting recording flow...');
    countdownCancelledRef.current = false;
    
    // Validate stream before recording
    if (!streamRef.current || !streamRef.current.active) {
      console.error('Stream is not active, reinitializing camera...');
      await initCamera();
      if (!streamRef.current || !streamRef.current.active) {
        toast.error(t('realTimePlayback.cameraError', 'Camera stream is not available. Please try again.'));
        return;
      }
    }
    
    // Reset state
    setRecordedBlob(null);
    setRecordedUrl(null);
    setAnalysis(null);
    chunksRef.current = [];
    
    // Countdown phase
    setPhase('countdown');
    for (let i = 20; i > 0; i--) {
      if (countdownCancelledRef.current) {
        countdownCancelledRef.current = false;
        setPhase('setup');
        return;
      }
      setCountdown(i);
      
      // Audio cues during countdown
      if (i === 10) {
        playBeep(600, 200);
      } else if (i <= 3) {
        playBeep(800 + (3 - i) * 100, 150);
      }
      
      await new Promise(r => setTimeout(r, 1000));
    }
    
    // Enter fullscreen when recording starts
    await enterFullscreen();
    
    // Recording phase
    setPhase('recording');
    setRecordingTimeLeft(recordingDuration);
    playDoubleBeep(); // Recording start beep
    
    const mimeType = getSupportedMimeType();
    console.log('Using mimeType:', mimeType);
    
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    
    recorder.onstart = () => {
      console.log('MediaRecorder started');
    };
    
    recorder.ondataavailable = (e) => {
      console.log('Data available:', e.data.size, 'bytes');
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    
    recorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
      toast.error(t('realTimePlayback.recordingError', 'Recording failed. Please try again.'));
      setPhase('setup');
      exitFullscreen();
      initCamera();
    };
    
    recorder.onstop = async () => {
      console.log('Recording stopped, chunks:', chunksRef.current.length);
      playLongBeep(); // Recording stop beep
      exitFullscreen();
      
      const totalSize = chunksRef.current.reduce((acc, c) => acc + c.size, 0);
      console.log('Total size:', totalSize, 'bytes');
      
      const blob = new Blob(chunksRef.current, { type: mimeType });
      console.log('Recording complete, blob size:', blob.size);
      
      // Check if recording actually captured data
      if (blob.size === 0) {
        console.error('Recording captured no data!');
        toast.error(t('realTimePlayback.noDataCaptured', 'No video data was captured. Please try again.'));
        setPhase('setup');
        await initCamera();
        return;
      }
      
      const url = URL.createObjectURL(blob);
      setRecordedBlob(blob);
      setRecordedUrl(url);
      
      // Waiting phase
      setPhase('waiting');
      for (let i = playbackDelay; i > 0; i--) {
        setWaitingTimeLeft(i);
        await new Promise(r => setTimeout(r, 1000));
      }
      
      // Playback phase
      setPhase('playback');
      setPlaybackTimeLeft(repeatDuration);
      
      // Upload and optionally analyze (unless local-only mode)
      if (!localOnlyMode) {
        uploadAndAnalyze(blob);
      }
    };
    
    mediaRecorderRef.current = recorder;
    // Start with timeslice to capture data incrementally (every 1 second)
    recorder.start(1000);
    console.log('MediaRecorder.start(1000) called');
    
    // Record for duration
    for (let i = recordingDuration; i > 0; i--) {
      setRecordingTimeLeft(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log('Stopping recorder...');
    recorder.stop();
  };

  // Upload video and optionally run analysis
  const uploadAndAnalyze = async (blob: Blob) => {
    try {
      if (!user) return;
      
      // Upload video first
      const fileName = `${user.id}/realtime-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, blob);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);
      
      // Create video record
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .insert([{
          user_id: user.id,
          sport: sport as "baseball" | "softball",
          module: module as "hitting" | "pitching" | "throwing",
          video_url: publicUrl,
          status: "completed",
        }])
        .select()
        .single();
      
      if (videoError) throw videoError;
      setCurrentVideoId(videoData.id);

      // Only run analysis if enabled
      if (analysisEnabled) {
        setIsAnalyzing(true);
        
        const { data, error } = await supabase.functions.invoke('analyze-realtime-playback', {
          body: { 
            videoId: videoData.id, 
            module, 
            sport, 
            language: i18n.language 
          }
        });
        
        if (error) {
          console.error('Analysis error:', error);
          // Provide fallback analysis
          setAnalysis({
            positives: [
              t('realTimePlayback.defaultPositive1', 'Good effort on your form'),
              t('realTimePlayback.defaultPositive2', 'Consistent motion pattern observed')
            ],
            tips: [
              t('realTimePlayback.defaultTip1', 'Review your footage in slow motion for detailed analysis')
            ],
            overallNote: t('realTimePlayback.defaultNote', 'Keep practicing! Use slow motion playback to identify areas for improvement.')
          });
        } else if (data) {
          setAnalysis(data);
        }
        
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error('Failed to upload/analyze:', error);
      setIsAnalyzing(false);
    }
  };

  // Upload for local-only mode when saving to library
  const uploadLocalRecording = async () => {
    if (!recordedBlob || !user) return null;
    
    try {
      const fileName = `${user.id}/realtime-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, recordedBlob);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);
      
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .insert([{
          user_id: user.id,
          sport: sport as "baseball" | "softball",
          module: module as "hitting" | "pitching" | "throwing",
          video_url: publicUrl,
          status: "completed",
        }])
        .select()
        .single();
      
      if (videoError) throw videoError;
      setCurrentVideoId(videoData.id);
      return videoData.id;
    } catch (error) {
      console.error('Failed to upload local recording:', error);
      toast.error(t('realTimePlayback.uploadError', 'Failed to upload video'));
      return null;
    }
  };
  
  // Playback timer
  useEffect(() => {
    if (phase !== 'playback') return;
    
    const interval = setInterval(() => {
      setPlaybackTimeLeft(prev => {
        if (prev <= 1) {
          setPhase('complete');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [phase]);

  // Auto-record effect
  useEffect(() => {
    if (phase === 'complete' && autoRecordEnabled) {
      setAutoRecordCountdown(3);
      const interval = setInterval(() => {
        setAutoRecordCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleRetake();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [phase, autoRecordEnabled]);
  
  // Auto-play video when playback starts
  useEffect(() => {
    if (phase === 'playback' && videoPlaybackRef.current && recordedUrl) {
      videoPlaybackRef.current.src = recordedUrl;
      videoPlaybackRef.current.playbackRate = parseFloat(playbackSpeed);
      videoPlaybackRef.current.loop = true;
      videoPlaybackRef.current.play().catch(console.error);
    }
  }, [phase, recordedUrl, playbackSpeed]);
  
  // Restart flow (back to setup)
  const handleRestart = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setAnalysis(null);
    setPhase('setup');
    setCurrentVideoId(null);
    setAutoRecordCountdown(0);
    initCamera();
  };

  // Retake (immediately start countdown again)
  const handleRetake = async () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setAnalysis(null);
    setCurrentVideoId(null);
    setAutoRecordCountdown(0);
    await initCamera();
    startRecordingFlow();
  };

  // Stop auto record
  const handleStopAutoRecord = () => {
    setAutoRecordEnabled(false);
    setAutoRecordCountdown(0);
  };
  
  // Download video and analysis
  const handleDownload = () => {
    if (!recordedBlob) return;
    
    // Download video
    const videoUrl = URL.createObjectURL(recordedBlob);
    const videoLink = document.createElement('a');
    videoLink.href = videoUrl;
    videoLink.download = `${sport}-${module}-realtime-${Date.now()}.webm`;
    videoLink.click();
    URL.revokeObjectURL(videoUrl);
    
    // Download analysis
    if (analysis) {
      const analysisText = `
${t('realTimePlayback.positives', "What You're Doing Great")}
${analysis.positives.map(p => `✓ ${p}`).join('\n')}

${t('realTimePlayback.tips', 'Quick Tips')}
${analysis.tips.map(tip => `• ${tip}`).join('\n')}

${analysis.overallNote}
      `.trim();
      
      const textBlob = new Blob([analysisText], { type: 'text/plain' });
      const textUrl = URL.createObjectURL(textBlob);
      const textLink = document.createElement('a');
      textLink.href = textUrl;
      textLink.download = `${sport}-${module}-analysis-${Date.now()}.txt`;
      textLink.click();
      URL.revokeObjectURL(textUrl);
    }
    
    toast.success(t('realTimePlayback.downloadSuccess', 'Video and analysis downloaded'));
  };

  // Handle save to library click
  const handleSaveToLibrary = async () => {
    if (localOnlyMode && !currentVideoId) {
      // Need to upload first
      const videoId = await uploadLocalRecording();
      if (videoId) {
        setShowSaveDialog(true);
      }
    } else {
      setShowSaveDialog(true);
    }
  };
  
  // Handle close
  const handleClose = () => {
    stopCamera();
    exitFullscreen();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setPhase('setup');
    setRecordedBlob(null);
    setRecordedUrl(null);
    setAnalysis(null);
    setAutoRecordCountdown(0);
    onClose();
  };

  const getSpeedLabel = (speed: string) => {
    const labels: Record<string, string> = {
      '0.25': t('realTimePlayback.ultraSlow', 'Ultra Slow'),
      '0.5': t('realTimePlayback.slowMotion', 'Slow Motion'),
      '0.75': t('realTimePlayback.moderate', 'Moderate'),
      '1': t('realTimePlayback.normalSpeed', 'Normal')
    };
    return labels[speed] || speed;
  };

  // Check if we should show live preview (setup, countdown, or recording)
  const showLivePreview = phase === 'setup' || phase === 'countdown' || phase === 'recording';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col bg-gradient-to-br from-background via-background to-muted/30">
          <VisuallyHidden.Root>
            <DialogTitle>{t('realTimePlayback.title', 'Real-Time Playback')}</DialogTitle>
          </VisuallyHidden.Root>
          <div className="relative h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">{t('realTimePlayback.title', 'Real-Time Playback')}</h2>
                  <p className="text-xs text-muted-foreground capitalize">{sport} - {module}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 pb-8">
              <AnimatePresence mode="wait">
                {/* Setup, Countdown, and Recording Phases - Persistent Camera Preview */}
                {showLivePreview && (
                  <motion.div
                    key="live-preview"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    {/* Camera Preview - Persistent across setup/countdown/recording */}
                    <div 
                      ref={cameraContainerRef}
                      className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] sm:aspect-video max-h-[40vh] sm:max-h-none"
                    >
                      {cameraPermission === false ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                          <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
                          <p>{t('realTimePlayback.cameraPermissionRequired', 'Camera permission is required')}</p>
                          <Button variant="outline" className="mt-4" onClick={() => initCamera()}>
                            {t('common.retry', 'Retry')}
                          </Button>
                        </div>
                      ) : (
                        <>
                          <video
                            ref={videoPreviewRef}
                            autoPlay
                            playsInline
                            muted
                            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                          />

                          {/* Grid Overlay */}
                          {gridOverlayEnabled && (
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="absolute top-0 bottom-0 left-1/3 w-px bg-white/50" />
                              <div className="absolute top-0 bottom-0 left-2/3 w-px bg-white/50" />
                              <div className="absolute left-0 right-0 top-1/3 h-px bg-white/50" />
                              <div className="absolute left-0 right-0 top-2/3 h-px bg-white/50" />
                            </div>
                          )}
                          
                          {/* Camera Control Buttons - Setup Phase */}
                          {phase === 'setup' && (
                            <div className="absolute top-4 right-4 flex gap-2">
                              <Button
                                variant="secondary"
                                size="icon"
                                className="bg-black/50 hover:bg-black/70 text-white border-0"
                                onClick={() => setGridOverlayEnabled(!gridOverlayEnabled)}
                                title={t('realTimePlayback.gridOverlay', 'Grid Overlay')}
                              >
                                <Grid3X3 className={`h-5 w-5 ${gridOverlayEnabled ? 'text-primary' : ''}`} />
                              </Button>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="bg-black/50 hover:bg-black/70 text-white border-0"
                                onClick={handleFlipCamera}
                                title={t('realTimePlayback.flipCamera', 'Flip Camera')}
                              >
                                <SwitchCamera className="h-5 w-5" />
                              </Button>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="bg-black/50 hover:bg-black/70 text-white border-0"
                                onClick={enterFullscreen}
                                title={t('realTimePlayback.fullscreen', 'Fullscreen')}
                              >
                                <Maximize className="h-5 w-5" />
                              </Button>
                            </div>
                          )}

                          {/* Countdown Overlay */}
                          {phase === 'countdown' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                              <p className="text-lg text-white mb-4">{t('realTimePlayback.getReady', 'Get Ready!')}</p>
                              <motion.div
                                key={countdown}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 1.5, opacity: 0 }}
                                className="text-9xl font-bold text-white drop-shadow-lg"
                              >
                                {countdown}
                              </motion.div>
                              <Button
                                variant="outline"
                                onClick={handleCancelCountdown}
                                className="mt-8 bg-white/10 border-white/30 text-white hover:bg-white/20"
                              >
                                {t('realTimePlayback.cancelCountdown', 'Cancel')}
                              </Button>
                            </div>
                          )}

                          {/* Recording Overlay */}
                          {phase === 'recording' && (
                            <>
                              {/* Recording indicator */}
                              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 text-white">
                                <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                                <span className="font-medium">{t('realTimePlayback.recording', 'Recording')}</span>
                              </div>
                              {/* Timer */}
                              <div className="absolute bottom-4 right-4 px-4 py-2 rounded-lg bg-black/70 text-white text-2xl font-mono">
                                {recordingTimeLeft}s
                              </div>
                              {/* Exit fullscreen button in recording */}
                              {isFullscreen && (
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white border-0"
                                  onClick={exitFullscreen}
                                >
                                  <Square className="h-5 w-5" />
                                </Button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Settings - Only show in setup phase */}
                    {phase === 'setup' && (
                      <>
                        {/* Settings Grid */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                          {/* Recording Duration */}
                          <Card className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                            <div className="flex items-center gap-2">
                              <Timer className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">{t('realTimePlayback.recordingDuration', 'Recording Duration')}</span>
                            </div>
                            <ToggleGroup 
                              type="single" 
                              value={String(recordingDuration)}
                              onValueChange={(v) => v && setRecordingDuration(parseInt(v))}
                              className="flex flex-wrap gap-1"
                            >
                              {RECORDING_DURATIONS.map(d => (
                                <ToggleGroupItem key={d} value={String(d)} className="px-3 py-1 text-sm">
                                  {d}s
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                          </Card>
                          
                          {/* Playback Delay */}
                          <Card className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">{t('realTimePlayback.playbackDelay', 'Playback Delay')}</span>
                            </div>
                            <div className="space-y-2">
                              <Slider
                                value={[playbackDelay]}
                                onValueChange={([v]) => setPlaybackDelay(v)}
                                min={5}
                                max={30}
                                step={5}
                                className="w-full"
                              />
                              <p className="text-xs text-muted-foreground text-center">{playbackDelay} {t('realTimePlayback.seconds', 'seconds')}</p>
                            </div>
                          </Card>
                          
                          {/* Repeat Duration */}
                          <Card className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                            <div className="flex items-center gap-2">
                              <RotateCcw className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">{t('realTimePlayback.repeatDuration', 'Repeat Duration')}</span>
                            </div>
                            <ToggleGroup 
                              type="single" 
                              value={String(repeatDuration)}
                              onValueChange={(v) => v && setRepeatDuration(parseInt(v))}
                              className="flex flex-wrap gap-1"
                            >
                              {REPEAT_DURATIONS.map(d => (
                                <ToggleGroupItem key={d} value={String(d)} className="px-3 py-1 text-sm">
                                  {d >= 60 ? `${d/60}m` : `${d}s`}
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                          </Card>
                          
                          {/* Playback Speed */}
                          <Card className="p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <Gauge className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">{t('realTimePlayback.playbackSpeed', 'Playback Speed')}</span>
                            </div>
                            <ToggleGroup 
                              type="single" 
                              value={playbackSpeed}
                              onValueChange={(v) => v && setPlaybackSpeed(v)}
                              className="flex flex-wrap gap-1"
                            >
                              {PLAYBACK_SPEEDS.map(s => (
                                <ToggleGroupItem key={s} value={s} className="px-3 py-1 text-sm">
                                  {s}x
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                            <p className="text-xs text-muted-foreground text-center">{getSpeedLabel(playbackSpeed)}</p>
                          </Card>
                        </div>

                        {/* Feature Toggles */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* AI Analysis Toggle */}
                          <Card className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Brain className="h-5 w-5 text-primary" />
                                <div>
                                  <Label htmlFor="analysis-toggle" className="font-medium">
                                    {t('realTimePlayback.aiAnalysis', 'AI Analysis')}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {t('realTimePlayback.aiAnalysisDescription', 'Get AI-powered feedback on your form')}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                id="analysis-toggle"
                                checked={analysisEnabled}
                                onCheckedChange={setAnalysisEnabled}
                              />
                            </div>
                          </Card>

                          {/* Audio Cues Toggle */}
                          <Card className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {audioCuesEnabled ? <Volume2 className="h-5 w-5 text-primary" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
                                <div>
                                  <Label htmlFor="audio-toggle" className="font-medium">
                                    {t('realTimePlayback.audioCues', 'Audio Cues')}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {t('realTimePlayback.audioCuesDescription', 'Beeps during countdown and recording')}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                id="audio-toggle"
                                checked={audioCuesEnabled}
                                onCheckedChange={setAudioCuesEnabled}
                              />
                            </div>
                          </Card>

                          {/* Local Only Mode Toggle */}
                          <Card className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {localOnlyMode ? <WifiOff className="h-5 w-5 text-orange-500" /> : <Wifi className="h-5 w-5 text-primary" />}
                                <div>
                                  <Label htmlFor="local-toggle" className="font-medium">
                                    {t('realTimePlayback.localOnlyMode', 'Local Only Mode')}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {t('realTimePlayback.localOnlyDescription', 'Keep recordings on device until you save')}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                id="local-toggle"
                                checked={localOnlyMode}
                                onCheckedChange={setLocalOnlyMode}
                              />
                            </div>
                          </Card>

                          {/* Auto Record Toggle */}
                          <Card className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <RefreshCw className={`h-5 w-5 ${autoRecordEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                                <div>
                                  <Label htmlFor="auto-record-toggle" className="font-medium">
                                    {t('realTimePlayback.autoRecord', 'Auto Record')}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {t('realTimePlayback.autoRecordDescription', 'Automatically restart recording after playback')}
                                  </p>
                                </div>
                              </div>
                              <Switch
                                id="auto-record-toggle"
                                checked={autoRecordEnabled}
                                onCheckedChange={setAutoRecordEnabled}
                              />
                            </div>
                          </Card>
                        </div>
                        
                        {/* Countdown Info */}
                        <p className="text-sm text-center text-muted-foreground bg-muted/50 rounded-lg p-3 border border-border">
                          {t('realTimePlayback.countdownInfo', 'Once you click Start Recording, a 20 second timer will begin before recording starts.')}
                        </p>
                        
                        {/* Start Button */}
                        <Button 
                          onClick={startRecordingFlow}
                          disabled={!cameraPermission}
                          size="lg"
                          className="w-full gap-2 bg-gradient-to-r from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive/70 text-white shadow-lg"
                        >
                          <Camera className="h-5 w-5" />
                          {t('realTimePlayback.startRecording', 'Start Recording')}
                        </Button>
                      </>
                    )}
                  </motion.div>
                )}
                
                {/* Waiting Phase */}
                {phase === 'waiting' && (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center min-h-[400px]"
                  >
                    <div className="p-6 rounded-full bg-primary/10 mb-6">
                      <Play className="h-12 w-12 text-primary" />
                    </div>
                    <p className="text-lg text-muted-foreground mb-2">
                      {t('realTimePlayback.waitingForPlayback', 'Starting playback in...')}
                    </p>
                    <p className="text-6xl font-bold text-primary">{waitingTimeLeft}s</p>
                  </motion.div>
                )}
                
                {/* Playback & Complete Phase */}
                {(phase === 'playback' || phase === 'complete') && (
                  <motion.div
                    key="playback"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    {/* Video Playback */}
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                      <video
                        ref={videoPlaybackRef}
                        playsInline
                        loop
                        className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                      />
                      {/* Status indicator */}
                      {phase === 'playback' && (
                        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/90 text-white">
                          <Play className="h-4 w-4" />
                          <span className="font-medium">{t('realTimePlayback.playing', 'Playing Back')}</span>
                        </div>
                      )}
                      {/* Timer */}
                      {phase === 'playback' && (
                        <div className="absolute bottom-4 right-4 px-4 py-2 rounded-lg bg-black/70 text-white text-xl font-mono">
                          {Math.floor(playbackTimeLeft / 60)}:{String(playbackTimeLeft % 60).padStart(2, '0')}
                        </div>
                      )}
                      {/* Speed indicator */}
                      <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/70 text-white text-sm">
                        {playbackSpeed}x
                      </div>

                      {/* Auto-record countdown overlay */}
                      {phase === 'complete' && autoRecordEnabled && autoRecordCountdown > 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                          <p className="text-lg text-white mb-2">{t('realTimePlayback.nextRecordingIn', 'Next recording in...')}</p>
                          <p className="text-6xl font-bold text-white">{autoRecordCountdown}</p>
                          <Button
                            variant="outline"
                            onClick={handleStopAutoRecord}
                            className="mt-6 bg-white/10 border-white/30 text-white hover:bg-white/20"
                          >
                            {t('realTimePlayback.stopAutoRecord', 'Stop Auto Record')}
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {/* Speed Controls */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <Gauge className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{t('realTimePlayback.speedLabel', 'Speed')}</span>
                        </div>
                        <ToggleGroup 
                          type="single" 
                          value={playbackSpeed}
                          onValueChange={(v) => v && setPlaybackSpeed(v)}
                          className="flex gap-1"
                        >
                          {PLAYBACK_SPEEDS.map(s => (
                            <ToggleGroupItem key={s} value={s} className="px-4 py-2">
                              {s}x
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </div>
                    </Card>
                    
                    {/* Analysis Card */}
                    {analysisEnabled && !localOnlyMode ? (
                      <Card className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                        {isAnalyzing ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
                            <span className="text-muted-foreground">{t('common.loading', 'Loading...')}</span>
                          </div>
                        ) : analysis ? (
                          <div className="space-y-4">
                            {/* Positives */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-green-500">
                                <Sparkles className="h-5 w-5" />
                                <span className="font-semibold">{t('realTimePlayback.positives', "What You're Doing Great")}</span>
                              </div>
                              {analysis.positives.map((positive, i) => (
                                <div key={i} className="flex items-start gap-2 pl-7">
                                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm">{positive}</span>
                                </div>
                              ))}
                            </div>
                            
                            {/* Tips */}
                            <div className="space-y-2 pt-2 border-t">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Settings className="h-4 w-4" />
                                <span className="font-medium text-sm">{t('realTimePlayback.tips', 'Quick Tips')}</span>
                              </div>
                              {analysis.tips.map((tip, i) => (
                                <p key={i} className="text-xs text-muted-foreground pl-6">• {tip}</p>
                              ))}
                            </div>
                            
                            {/* Overall Note */}
                            <p className="text-sm text-primary font-medium pt-2 border-t">{analysis.overallNote}</p>
                          </div>
                        ) : null}
                      </Card>
                    ) : (
                      <Card className="p-4 border-muted bg-muted/30">
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Brain className="h-5 w-5" />
                          <p className="text-sm">
                            {localOnlyMode 
                              ? t('realTimePlayback.localOnlyNote', 'Local only mode - video will be uploaded when you save to library.')
                              : t('realTimePlayback.analysisDisabled', 'AI analysis is turned off. Your video has been saved.')
                            }
                          </p>
                        </div>
                      </Card>
                    )}
                    
                    {/* Action Buttons */}
                    {phase === 'complete' && (
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={handleRestart} variant="outline" className="flex-1 gap-2">
                          <RotateCcw className="h-4 w-4" />
                          {t('realTimePlayback.restart', 'Restart')}
                        </Button>
                        <Button onClick={handleRetake} variant="outline" className="flex-1 gap-2">
                          <RefreshCw className="h-4 w-4" />
                          {t('realTimePlayback.retake', 'Retake')}
                        </Button>
                        <Button onClick={handleDownload} variant="outline" className="flex-1 gap-2">
                          <Download className="h-4 w-4" />
                          {t('realTimePlayback.download', 'Download')}
                        </Button>
                        <Button 
                          onClick={handleSaveToLibrary} 
                          className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary/80"
                        >
                          <BookMarked className="h-4 w-4" />
                          {t('realTimePlayback.saveToLibrary', 'Save to Library')}
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Save to Library Dialog */}
      {currentVideoId && (
        <SaveToLibraryDialog
          open={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          videoId={currentVideoId}
          sport={sport}
          module={module}
        />
      )}
    </>
  );
};
