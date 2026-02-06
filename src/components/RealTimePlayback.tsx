import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  X, Video, Play, Pause, RotateCcw, Download, BookMarked, 
  Settings, Timer, Clock, Gauge, Camera, CheckCircle2, AlertCircle,
  Sparkles, SwitchCamera, Brain, Grid3X3, Volume2, VolumeX, 
  Wifi, WifiOff, RefreshCw, Maximize, Square, PictureInPicture2,
  SkipBack, SkipForward, ChevronLeft, ChevronRight, Pencil, Layers,
  TimerReset, Copy, Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SaveToLibraryDialog } from "./SaveToLibraryDialog";
import { FrameAnnotationDialog } from "./FrameAnnotationDialog";
import { FrameComparisonDialog } from "./FrameComparisonDialog";
import { VideoAnnotationOverlay, VideoAnnotation } from "./VideoAnnotationOverlay";
import i18n from "@/i18n";

interface RealTimePlaybackProps {
  isOpen: boolean;
  onClose: () => void;
  module: string;
  sport: string;
}

type Phase = 'setup' | 'countdown' | 'recording' | 'waiting' | 'playback' | 'complete';
type FacingMode = 'user' | 'environment';
type AnalysisStatus = 
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'analyzing'
  | 'complete'
  | 'failed'
  | 'skipped-local'
  | 'skipped-disabled';

interface MechanicsBreakdown {
  category: string;
  score: number;
  observation: string;
  tip: string;
}

interface DrillRecommendation {
  title: string;
  purpose: string;
  steps: string[];
  reps_sets: string;
  cues: string[];
}

interface Analysis {
  overallScore: number;
  quickSummary: string;
  mechanicsBreakdown: MechanicsBreakdown[];
  redFlags?: string[];
  positives?: string[];
  keyStrength: string;
  priorityFix: string;
  drills?: DrillRecommendation[];
  drillRecommendation?: string; // Legacy field for backward compatibility
}

const RECORDING_DURATIONS = [10, 15, 20, 30, 40];
const PLAYBACK_DELAYS = [5, 10, 15, 20, 25, 30];
const REPEAT_DURATIONS = [30, 45, 60, 90, 120];
const PLAYBACK_SPEEDS = ['0.25', '0.5', '0.75', '1'];
const FRAME_COUNT_OPTIONS = [5, 7, 10, 15];

interface CapturedFrame {
  dataUrl: string;
  timestamp: number;
  selectedForAnalysis: boolean;
  annotated?: boolean;
}

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
  // Always start with auto-record OFF - user must enable it each session
  const [autoRecordEnabled, setAutoRecordEnabled] = useState<boolean>(false);
  
  // Analysis issue alert state
  const [showAnalysisIssueAlert, setShowAnalysisIssueAlert] = useState(false);
  
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
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [autoRecordCountdown, setAutoRecordCountdown] = useState(0);
  const [autoRecordPaused, setAutoRecordPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState<CapturedFrame[]>([]);
  const [orientationWarning, setOrientationWarning] = useState(false);
  const [orientationCrashRecovery, setOrientationCrashRecovery] = useState(false);
  
  // Enhanced frame controls - default to 7 for better coverage
  const [frameCountForAnalysis, setFrameCountForAnalysis] = useState<number>(() => 
    parseInt(localStorage.getItem('rtPlayback_frameCount') || '7')
  );
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  
  // Annotation state
  const [annotationDialogOpen, setAnnotationDialogOpen] = useState(false);
  const [frameToAnnotate, setFrameToAnnotate] = useState<{dataUrl: string; index: number} | null>(null);
  
  // Enhanced features state
  const [frameCompareMode, setFrameCompareMode] = useState(false);
  const [videoAnnotationActive, setVideoAnnotationActive] = useState(false);
  const [videoAnnotations, setVideoAnnotations] = useState<VideoAnnotation[]>([]);
  const [autoCaptureSetting, setAutoCaptureSetting] = useState<'off' | 'interval'>(() => 
    (localStorage.getItem('rtPlayback_autoCapture') as 'off' | 'interval') || 'off'
  );
  const [autoCaptureInterval, setAutoCaptureInterval] = useState<number>(() => 
    parseInt(localStorage.getItem('rtPlayback_autoCaptureInterval') || '3')
  );
  
  // Refs
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const videoPlaybackRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownCancelledRef = useRef(false);
  const cameraContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Persist settings (NOTE: autoRecordEnabled is NOT persisted - it resets each session)
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
    localStorage.setItem('rtPlayback_frameCount', String(frameCountForAnalysis));
    localStorage.setItem('rtPlayback_autoCapture', autoCaptureSetting);
    localStorage.setItem('rtPlayback_autoCaptureInterval', String(autoCaptureInterval));
  }, [recordingDuration, playbackDelay, repeatDuration, playbackSpeed, facingMode, analysisEnabled, gridOverlayEnabled, audioCuesEnabled, localOnlyMode, frameCountForAnalysis, autoCaptureSetting, autoCaptureInterval]);
  
  // Speed control during playback
  useEffect(() => {
    if (videoPlaybackRef.current && (phase === 'playback' || phase === 'complete')) {
      videoPlaybackRef.current.playbackRate = parseFloat(playbackSpeed);
    }
  }, [playbackSpeed, phase]);

  // Toggle pause/play handler
  const handleTogglePlayPause = useCallback(() => {
    const video = videoPlaybackRef.current;
    if (!video) return;
    
    if (video.paused) {
      video.play();
      setIsPaused(false);
    } else {
      video.pause();
      setIsPaused(true);
    }
  }, []);

  // Capture key frame handler
  const handleCaptureKeyFrame = useCallback(() => {
    const video = videoPlaybackRef.current;
    if (!video) return;
    
    // Create canvas and draw current frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    
    const newFrame: CapturedFrame = {
      dataUrl,
      timestamp: video.currentTime,
      selectedForAnalysis: true,
      annotated: false
    };
    
    setCapturedFrames(prev => [...prev, newFrame]);
    toast.success(t('realTimePlayback.frameCaptured', 'Key frame captured!'));
  }, [t]);

  // Download captured frame
  const handleDownloadFrame = useCallback((dataUrl: string, index: number) => {
    const link = document.createElement('a');
    link.download = `keyframe-${index + 1}.png`;
    link.href = dataUrl;
    link.click();
  }, []);

  // Clear all captured frames
  const handleClearFrames = useCallback(() => {
    setCapturedFrames([]);
    toast.success(t('realTimePlayback.framesCleared', 'Frames cleared'));
  }, [t]);

  // Toggle frame selection for analysis
  const handleToggleFrameSelection = useCallback((index: number) => {
    setCapturedFrames(prev => prev.map((frame, i) => 
      i === index ? { ...frame, selectedForAnalysis: !frame.selectedForAnalysis } : frame
    ));
  }, []);

  // Open annotation dialog for a frame
  const handleAnnotateFrame = useCallback((frame: CapturedFrame, index: number) => {
    setFrameToAnnotate({ dataUrl: frame.dataUrl, index });
    setAnnotationDialogOpen(true);
  }, []);

  // Save annotated frame
  const handleSaveAnnotatedFrame = useCallback((annotatedDataUrl: string) => {
    if (frameToAnnotate === null) return;
    
    setCapturedFrames(prev => prev.map((frame, i) => 
      i === frameToAnnotate.index 
        ? { ...frame, dataUrl: annotatedDataUrl, annotated: true } 
        : frame
    ));
    setAnnotationDialogOpen(false);
    setFrameToAnnotate(null);
    toast.success(t('realTimePlayback.frameAnnotated', 'Frame annotated!'));
  }, [frameToAnnotate, t]);

  // Annotate current frame during playback
  const handleAnnotateCurrentFrame = useCallback(() => {
    const video = videoPlaybackRef.current;
    if (!video) return;
    
    // Pause video first
    video.pause();
    setIsPaused(true);
    
    // Capture current frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    
    // Open annotation dialog directly with current frame
    setFrameToAnnotate({ dataUrl, index: -1 }); // -1 means new frame
    setAnnotationDialogOpen(true);
  }, []);

  // Frame-by-frame navigation
  const handleStepFrame = useCallback((direction: 'forward' | 'backward', frameCount: number = 1) => {
    const video = videoPlaybackRef.current;
    if (!video) return;
    
    // Approximate frame duration (assuming 30fps)
    const frameDuration = 1 / 30;
    const timeChange = frameDuration * frameCount * (direction === 'forward' ? 1 : -1);
    
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + timeChange));
    
    // Pause if not already paused
    if (!video.paused) {
      video.pause();
      setIsPaused(true);
    }
  }, []);

  // Jump to specific time on timeline
  const handleSeekToTime = useCallback((time: number) => {
    const video = videoPlaybackRef.current;
    if (!video) return;
    
    video.currentTime = time;
  }, []);

  // Picture-in-Picture handlers
  const handleTogglePiP = useCallback(async () => {
    const video = videoPlaybackRef.current;
    if (!video) return;
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        setIsPiPActive(true);
        toast.success(t('realTimePlayback.pipActivated', 'Video is now in a floating window. You can use other apps while watching!'), {
          duration: 4000,
        });
      } else {
        toast.error(t('realTimePlayback.pipNotSupported', 'Picture-in-Picture not supported on this browser'));
      }
    } catch (error) {
      console.error('PiP error:', error);
      toast.error(t('realTimePlayback.pipNotSupported', 'Picture-in-Picture not supported on this browser'));
    }
  }, [t]);

  // Exit PiP when dialog closes
  useEffect(() => {
    if (!isOpen && document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(console.error);
      setIsPiPActive(false);
    }
  }, [isOpen]);

  // Auto-capture frames during playback
  useEffect(() => {
    if (autoCaptureSetting !== 'interval' || phase !== 'playback' || isPaused) return;
    
    const interval = setInterval(() => {
      handleCaptureKeyFrame();
    }, autoCaptureInterval * 1000);
    
    return () => clearInterval(interval);
  }, [autoCaptureSetting, autoCaptureInterval, phase, isPaused, handleCaptureKeyFrame]);

  // Handle opening video annotation overlay
  const handleOpenVideoAnnotation = useCallback(() => {
    const video = videoPlaybackRef.current;
    if (!video) return;
    
    video.pause();
    setIsPaused(true);
    setVideoAnnotationActive(true);
  }, []);

  // Handle saving annotated frame from overlay
  const handleSaveAnnotatedFrameFromOverlay = useCallback((dataUrl: string) => {
    const video = videoPlaybackRef.current;
    if (!video) return;
    
    const newFrame: CapturedFrame = {
      dataUrl,
      timestamp: video.currentTime,
      selectedForAnalysis: true,
      annotated: true
    };
    setCapturedFrames(prev => [...prev, newFrame]);
    toast.success(t('realTimePlayback.frameWithAnnotationsSaved', 'Frame with annotations saved!'));
  }, [t]);

  // Get selected frames for comparison
  const selectedFramesForCompare = capturedFrames.filter(f => f.selectedForAnalysis);

  // Select all frames
  const handleSelectAllFrames = useCallback(() => {
    setCapturedFrames(prev => prev.map(frame => ({ ...frame, selectedForAnalysis: true })));
  }, []);

  // Deselect all frames
  const handleDeselectAllFrames = useCallback(() => {
    setCapturedFrames(prev => prev.map(frame => ({ ...frame, selectedForAnalysis: false })));
  }, []);

  // PiP event listeners
  useEffect(() => {
    const video = videoPlaybackRef.current;
    if (!video) return;
    
    const handleEnterPiP = () => setIsPiPActive(true);
    const handleLeavePiP = () => setIsPiPActive(false);
    
    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);
    
    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [phase]);

  // Video time tracking
  useEffect(() => {
    const video = videoPlaybackRef.current;
    if (!video || (phase !== 'playback' && phase !== 'complete')) return;
    
    const handleTimeUpdate = () => {
      setCurrentVideoTime(video.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration);
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [phase]);

  // Extract key frames from video for AI analysis
  const extractKeyFrames = useCallback(async (videoBlob: Blob): Promise<string[]> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(videoBlob);
      video.src = url;
      
      video.onloadedmetadata = () => {
        const duration = video.duration;
        // Use configurable frame count
        const frameCount = frameCountForAnalysis;
        const timestamps = Array.from({ length: frameCount }, (_, i) => 
          (i / (frameCount - 1)) * duration
        );
        
        const frames: string[] = [];
        let currentIndex = 0;
        
        const captureFrame = () => {
          const canvas = document.createElement('canvas');
          // Resize to reasonable dimensions for API (max 512px)
          const maxDim = 512;
          let width = video.videoWidth;
          let height = video.videoHeight;
          
          if (width > height) {
            if (width > maxDim) {
              height = (height / width) * maxDim;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = (width / height) * maxDim;
              height = maxDim;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            // Use JPEG for smaller payload
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            frames.push(dataUrl);
          }
          
          currentIndex++;
          if (currentIndex < timestamps.length) {
            video.currentTime = timestamps[currentIndex];
          } else {
            URL.revokeObjectURL(url);
            video.remove();
            resolve(frames);
          }
        };
        
        video.onseeked = captureFrame;
        video.currentTime = timestamps[0];
      };
      
      video.onerror = () => {
        console.error('Failed to load video for frame extraction');
        URL.revokeObjectURL(url);
        resolve([]);
      };
    });
  }, []);

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

  // Fullscreen helpers - use CSS-based fullscreen for reliable behavior
  const enterFullscreen = useCallback(() => {
    setIsFullscreen(true);
    // Also try native fullscreen for true immersive experience
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // CSS fallback is already active via isFullscreen state
        console.log('Native fullscreen denied, using CSS fullscreen');
      });
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }
  }, []);

  // Listen for native fullscreen change (e.g., user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        // User exited native fullscreen, but keep CSS fullscreen active during recording
        // Only fully exit if we're not in countdown/recording
        if (phase !== 'countdown' && phase !== 'recording') {
          setIsFullscreen(false);
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [phase, isFullscreen]);

  // Lock orientation during recording phases to prevent session reset
  useEffect(() => {
    const isActivePhase = phase === 'countdown' || phase === 'recording' || phase === 'waiting';
    const orientation = screen.orientation as ScreenOrientation & { lock?: (type: string) => Promise<void>; unlock?: () => void };
    
    if (isActivePhase && orientation?.lock) {
      // Try to lock to current orientation
      const currentType = orientation.type;
      const lockType = currentType.includes('portrait') ? 'portrait' : 'landscape';
      
      orientation.lock(lockType).catch(() => {
        // Lock not supported on this device/browser - that's okay, we have the warning fallback
        console.log('Orientation lock not supported');
      });
    }
    
    return () => {
      // Unlock orientation when leaving active phases
      const orientationUnlock = screen.orientation as ScreenOrientation & { unlock?: () => void };
      if (orientationUnlock?.unlock) {
        orientationUnlock.unlock();
      }
    };
  }, [phase]);

  // Show orientation warning for setup phase (educational, not crash prevention)
  useEffect(() => {
    const handleOrientationWarning = () => {
      if (phase === 'setup') {
        setOrientationWarning(true);
        setTimeout(() => setOrientationWarning(false), 3000);
      }
    };
    
    window.addEventListener('orientationchange', handleOrientationWarning);
    return () => window.removeEventListener('orientationchange', handleOrientationWarning);
  }, [phase]);

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

  // CRITICAL: Detect orientation changes during active recording and GRACEFULLY STOP recording
  useEffect(() => {
    let lastOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    
    const handleOrientationCrashPrevention = () => {
      const isActivePhase = phase === 'countdown' || phase === 'recording' || phase === 'waiting';
      const currentOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      
      if (isActivePhase && currentOrientation !== lastOrientation) {
        console.warn('Orientation changed during active recording phase - stopping gracefully');
        
        // CRITICAL: Stop recording GRACEFULLY before crash
        if (mediaRecorderRef.current?.state === 'recording') {
          try {
            mediaRecorderRef.current.stop();
          } catch (e) {
            console.error('Failed to stop recorder:', e);
          }
        }
        
        // Exit fullscreen
        exitFullscreen();
        
        // Show recovery message and reset to setup
        setOrientationCrashRecovery(true);
        setPhase('setup');
        
        toast.warning(t('realTimePlayback.orientationInterrupted', 'Recording interrupted by orientation change. Please lock your screen orientation and try again.'));
        
        // Reinitialize camera after brief delay
        setTimeout(() => {
          initCamera();
          setOrientationCrashRecovery(false);
        }, 500);
      }
      
      lastOrientation = currentOrientation;
    };
    
    // Use multiple listeners for broader compatibility
    window.addEventListener('orientationchange', handleOrientationCrashPrevention);
    
    // Also listen for resize which catches orientation changes on some devices
    const handleResize = () => {
      // Debounce to avoid multiple triggers
      setTimeout(handleOrientationCrashPrevention, 100);
    };
    window.addEventListener('resize', handleResize);
    
    // Visual viewport API for modern mobile browsers
    window.visualViewport?.addEventListener('resize', handleOrientationCrashPrevention);
    
    return () => {
      window.removeEventListener('orientationchange', handleOrientationCrashPrevention);
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleOrientationCrashPrevention);
    };
  }, [phase, exitFullscreen, initCamera, t]);

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
    setAnalysisError(null);
    chunksRef.current = [];
    
    // Set analysis status based on settings
    if (localOnlyMode) {
      setAnalysisStatus('skipped-local');
    } else if (!analysisEnabled) {
      setAnalysisStatus('skipped-disabled');
    } else {
      setAnalysisStatus('idle');
    }
    
    // Enter fullscreen IMMEDIATELY on user click (within user gesture context)
    try {
      if (cameraContainerRef.current?.requestFullscreen) {
        await cameraContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.warn('Fullscreen request failed (user may have declined):', err);
      // Continue without fullscreen - don't block recording
    }
    
    // Countdown phase
    setPhase('countdown');
    for (let i = 20; i > 0; i--) {
      if (countdownCancelledRef.current) {
        countdownCancelledRef.current = false;
        setPhase('setup');
        exitFullscreen();
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
      
      setAnalysisStatus('uploading');
      setAnalysisError(null);
      
      // Upload video first
      const fileName = `${user.id}/realtime-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, blob);
      
      if (uploadError) {
        setAnalysisStatus('failed');
        setAnalysisError(t('realTimePlayback.uploadFailed', 'Failed to upload video'));
        throw uploadError;
      }
      
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
      
      if (videoError) {
        setAnalysisStatus('failed');
        setAnalysisError(t('realTimePlayback.saveFailed', 'Failed to save video record'));
        throw videoError;
      }
      setCurrentVideoId(videoData.id);

      // Only run analysis if enabled
      if (analysisEnabled) {
        setAnalysisStatus('extracting');
        setIsAnalyzing(true);
        
        // Set up 20-second timeout for analysis
        let analysisTimedOut = false;
        const analysisTimeout = setTimeout(() => {
          analysisTimedOut = true;
          console.warn('Analysis timeout - unable to gather information within 20 seconds');
          setShowAnalysisIssueAlert(true);
          setIsAnalyzing(false);
          setAnalysisStatus('failed');
        }, 20000);
        
        try {
          // Extract key frames for vision analysis
          const frames = await extractKeyFrames(blob);
          console.log(`Extracted ${frames.length} key frames for analysis`);
          
          if (analysisTimedOut) {
            clearTimeout(analysisTimeout);
            return;
          }
          
          if (frames.length === 0) {
            clearTimeout(analysisTimeout);
            setAnalysisStatus('failed');
            setAnalysisError(t('realTimePlayback.frameExtractionFailed', 'Failed to extract video frames'));
            setIsAnalyzing(false);
            return;
          }
          
          setAnalysisStatus('analyzing');
          
          const { data, error } = await supabase.functions.invoke('analyze-realtime-playback', {
            body: { 
              videoId: videoData.id, 
              module, 
              sport, 
              language: i18n.language,
              frames // Send frames for vision analysis
            }
          });
          
          // Clear timeout since analysis completed
          clearTimeout(analysisTimeout);
          
          if (analysisTimedOut) return; // Exit if timeout already triggered
          
          if (error) {
            console.error('Analysis error:', error);
            setAnalysisStatus('failed');
            setAnalysisError(t('realTimePlayback.analysisFailed', 'Hammer analysis failed'));
            // Provide fallback analysis with mechanics breakdown
            setAnalysis({
              overallScore: 7.5,
              quickSummary: t('realTimePlayback.defaultSummary', 'Good effort! Review your mechanics in slow motion.'),
              mechanicsBreakdown: [
                { category: 'Setup', score: 7, observation: t('realTimePlayback.defaultObservation', 'Solid foundation'), tip: t('realTimePlayback.defaultMechanicTip', 'Continue practicing') }
              ],
              keyStrength: t('realTimePlayback.defaultStrength', 'Good effort and consistency'),
              priorityFix: t('realTimePlayback.defaultPriority', 'Review slow-motion footage'),
              drillRecommendation: t('realTimePlayback.defaultDrill', 'Tee work for consistency')
            });
          } else if (data) {
            // Check for low-quality analysis results indicating athlete wasn't visible
            const isLowQualityAnalysis = (analysis: Analysis): boolean => {
              const genericPhrases = [
                'unable to observe', 'cannot see', 'not visible', 
                'obscured', 'out of frame', 'difficult to analyze',
                'unable to detect', 'no athlete', 'not detected'
              ];
              
              const textToCheck = [
                analysis.quickSummary || '',
                analysis.keyStrength || '',
                analysis.priorityFix || ''
              ].join(' ').toLowerCase();
              
              return genericPhrases.some(phrase => textToCheck.includes(phrase));
            };
            
            if (isLowQualityAnalysis(data)) {
              console.warn('Low-quality analysis detected - athlete may not be visible');
              setShowAnalysisIssueAlert(true);
            }
            
            setAnalysis(data);
            setAnalysisStatus('complete');
          }
          
          setIsAnalyzing(false);
        } catch (analysisError) {
          clearTimeout(analysisTimeout);
          throw analysisError;
        }
      } else {
        setAnalysisStatus('skipped-disabled');
      }
    } catch (error) {
      console.error('Failed to upload/analyze:', error);
      setAnalysisStatus('failed');
      if (!analysisError) {
        setAnalysisError(t('realTimePlayback.unexpectedError', 'An unexpected error occurred'));
      }
      setIsAnalyzing(false);
    }
  };

  // Retry analysis
  const handleRetryAnalysis = async () => {
    if (!recordedBlob || !currentVideoId) return;
    
    setAnalysisStatus('extracting');
    setAnalysisError(null);
    setIsAnalyzing(true);
    
    try {
      const frames = await extractKeyFrames(recordedBlob);
      
      if (frames.length === 0) {
        setAnalysisStatus('failed');
        setAnalysisError(t('realTimePlayback.frameExtractionFailed', 'Failed to extract video frames'));
        setIsAnalyzing(false);
        return;
      }
      
      setAnalysisStatus('analyzing');
      
      const { data, error } = await supabase.functions.invoke('analyze-realtime-playback', {
        body: { 
          videoId: currentVideoId, 
          module, 
          sport, 
          language: i18n.language,
          frames
        }
      });
      
      if (error) {
        console.error('Retry analysis error:', error);
        setAnalysisStatus('failed');
        setAnalysisError(t('realTimePlayback.analysisFailed', 'Hammer analysis failed'));
      } else if (data) {
        setAnalysis(data);
        setAnalysisStatus('complete');
      }
    } catch (error) {
      console.error('Retry analysis failed:', error);
      setAnalysisStatus('failed');
      setAnalysisError(t('realTimePlayback.unexpectedError', 'An unexpected error occurred'));
    }
    
    setIsAnalyzing(false);
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

  // Auto-record effect - with pause support and wait-for-analysis
  // Now works during both playback AND complete phases
  useEffect(() => {
    if ((phase === 'playback' || phase === 'complete') && autoRecordEnabled) {
      // Initialize countdown when entering playback phase (only once)
      if (phase === 'playback' && autoRecordCountdown === 0) {
        setAutoRecordCountdown(repeatDuration); // Use the configured repeat duration
      }
      
      const interval = setInterval(() => {
        setAutoRecordCountdown(prev => {
          // If paused, don't decrement
          if (autoRecordPaused) {
            return prev;
          }
          
          // If analysis is enabled and still running, wait for it
          if (analysisEnabled && isAnalyzing) {
            return prev; // Keep the countdown paused while analyzing
          }
          
          if (prev <= 1) {
            clearInterval(interval);
            handleRetake();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else if (!autoRecordEnabled) {
      // Reset countdown when auto-record is disabled
      setAutoRecordCountdown(0);
    }
  }, [phase, autoRecordEnabled, autoRecordPaused, analysisEnabled, isAnalyzing, repeatDuration]);
  
  // Transition warning toast at 5 seconds before camera preview appears
  useEffect(() => {
    if (phase === 'complete' && autoRecordEnabled && !autoRecordPaused && autoRecordCountdown === 5) {
      toast.info(t('realTimePlayback.preparingNextRecording', 'Preparing next recording in 5 seconds...'), {
        duration: 3000,
      });
    }
  }, [autoRecordCountdown, phase, autoRecordEnabled, autoRecordPaused, t]);
  
  // Auto-play video when playback starts - ensure immediate display
  useEffect(() => {
    if ((phase === 'playback' || phase === 'complete') && recordedUrl && videoPlaybackRef.current) {
      const video = videoPlaybackRef.current;
      console.log('Initializing playback video:', recordedUrl);
      
      // Set source and prepare video
      video.src = recordedUrl;
      video.preload = 'auto';
      video.loop = true;
      video.muted = true; // MUST be muted for reliable autoplay
      video.playbackRate = parseFloat(playbackSpeed);
      
      // Load and play
      video.load();
      
      // Wait for video to be ready, then play
      const handleCanPlay = () => {
        console.log('Video can play, starting playback');
        video.currentTime = 0;
        video.play().catch(err => {
          console.error('Play failed even with muted:', err);
        });
      };
      
      video.addEventListener('canplay', handleCanPlay, { once: true });
      
      // Also try immediate play in case video is already ready
      video.play().catch(() => {
        // Will retry on canplay event
      });
      
      return () => {
        video.removeEventListener('canplay', handleCanPlay);
      };
    }
  }, [phase, recordedUrl]);
  
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
    setAutoRecordPaused(false);
  };

  // Pause/resume auto record
  const handleToggleAutoRecordPause = () => {
    setAutoRecordPaused(prev => !prev);
  };

  // Continue without waiting for analysis
  const handleContinueWithoutAnalysis = () => {
    setAutoRecordPaused(false);
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
      const mechanicsText = analysis.mechanicsBreakdown
        .map(m => `${m.category}: ${m.score}/10 - ${m.observation} (${m.tip})`)
        .join('\n');
      
      const analysisText = `
${t('realTimePlayback.quickAnalysis', 'Quick Analysis')} - Score: ${analysis.overallScore}/10

"${analysis.quickSummary}"

${t('realTimePlayback.mechanicsBreakdown', 'Mechanics Breakdown')}
${mechanicsText}

${t('realTimePlayback.keyStrength', 'Key Strength')}: ${analysis.keyStrength}
${t('realTimePlayback.priorityFix', 'Priority Fix')}: ${analysis.priorityFix}
${t('realTimePlayback.tryThisDrill', 'Try This Drill')}: ${analysis.drillRecommendation}
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

  // Check if we should show live preview (setup, countdown, recording, OR auto-record final countdown)
  // Only show camera preview in final 3 seconds of auto-record countdown AND when not paused
  // This keeps video playback visible during most of the countdown so user can review analysis
  const showAutoRecordPreview = phase === 'complete' && autoRecordEnabled && 
    autoRecordCountdown > 0 && autoRecordCountdown <= 3 && !autoRecordPaused;
  const showLivePreview = phase === 'setup' || phase === 'countdown' || phase === 'recording' || showAutoRecordPreview;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col bg-gradient-to-br from-background via-background to-muted/30 [&>button]:hidden">
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
                    className={`${isFullscreen ? '' : 'space-y-4'}`}
                  >
                    {/* Camera Preview - LARGER in setup phase AND auto-record countdown to show what will be recorded */}
                    {/* When fullscreen, this fills the entire screen */}
                    <div 
                      ref={cameraContainerRef}
                      className={`relative overflow-hidden bg-black ${
                        (isFullscreen || phase === 'countdown' || phase === 'recording')
                          ? 'fixed inset-0 z-[9999] rounded-none' 
                          : (phase === 'setup' || showAutoRecordPreview)
                            ? 'rounded-xl min-h-[55vh] sm:min-h-[60vh] aspect-auto'
                            : 'rounded-xl aspect-[4/3] sm:aspect-video max-h-[40vh] sm:max-h-none'
                      }`}
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
                            className={`w-full h-full ${isFullscreen ? 'object-contain' : 'object-cover'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
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
                          
                          {/* Recording Area Indicator - Setup Phase AND Auto-Record Countdown */}
                          {(phase === 'setup' || showAutoRecordPreview) && (
                            <>
                              {/* Corner brackets to show recording area */}
                              <div className="absolute inset-4 pointer-events-none">
                                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/70 rounded-tl" />
                                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/70 rounded-tr" />
                                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/70 rounded-bl" />
                                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/70 rounded-br" />
                              </div>
                              
                              {/* "This will be recorded" indicator */}
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/70 text-white text-sm flex items-center gap-2">
                                <Video className="h-4 w-4 text-red-400" />
                                <span>{t('realTimePlayback.thisWillBeRecorded', 'This is what will be recorded')}</span>
                              </div>
                              
                              {/* Orientation tip - only show in setup, not during auto-record countdown */}
                              {phase === 'setup' && (
                                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs flex items-center gap-2">
                                  <span>📱</span>
                                  <span>{t('realTimePlayback.lockOrientation', 'Lock orientation before recording')}</span>
                                </div>
                              )}
                              
                              {/* Auto-Record Countdown Overlay - Shows LARGE preview with countdown */}
                              {showAutoRecordPreview && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                                  {/* Waiting for analysis message */}
                                  {analysisEnabled && isAnalyzing && (
                                    <div className="mb-4 px-4 py-2 rounded-full bg-blue-500/90 text-white text-sm flex items-center gap-2 animate-pulse">
                                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                      <span>{t('realTimePlayback.waitingForAnalysis', 'Waiting for analysis...')}</span>
                                    </div>
                                  )}
                                  
                                  {/* Paused indicator */}
                                  {autoRecordPaused && (
                                    <div className="mb-4 px-4 py-2 rounded-full bg-yellow-500/90 text-black text-sm font-medium flex items-center gap-2">
                                      <Pause className="h-4 w-4" />
                                      <span>{t('realTimePlayback.autoRecordPaused', 'Auto-record paused')}</span>
                                    </div>
                                  )}
                                  
                                  {/* Main countdown display - shows PAUSED when paused */}
                                  {autoRecordPaused ? (
                                    <p className="text-2xl font-bold text-yellow-300 mb-2 animate-pulse">PAUSED</p>
                                  ) : !(analysisEnabled && isAnalyzing) && (
                                    <p className="text-lg text-white mb-2">{t('realTimePlayback.nextRecordingIn', 'Next recording in...')}</p>
                                  )}
                                  
                                  <motion.p 
                                    key={autoRecordCountdown}
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="text-7xl font-bold text-white drop-shadow-lg"
                                  >
                                    {autoRecordCountdown}
                                  </motion.p>
                                  
                                  {/* Control buttons */}
                                  <div className="mt-6 flex flex-wrap gap-3 justify-center">
                                    {/* Pause/Resume button */}
                                    <Button
                                      variant={autoRecordPaused ? "default" : "outline"}
                                      onClick={handleToggleAutoRecordPause}
                                      className={autoRecordPaused 
                                        ? "bg-primary hover:bg-primary/90 text-primary-foreground gap-2 animate-pulse font-semibold"
                                        : "bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2"
                                      }
                                    >
                                      {autoRecordPaused ? (
                                        <>
                                          <Play className="h-4 w-4" />
                                          {t('realTimePlayback.resumeAutoRecord', 'Resume')}
                                        </>
                                      ) : (
                                        <>
                                          <Pause className="h-4 w-4" />
                                          {t('realTimePlayback.pauseAutoRecord', 'Pause')}
                                        </>
                                      )}
                                    </Button>
                                    
                                    {/* Continue without analysis button - when waiting for analysis */}
                                    {analysisEnabled && isAnalyzing && (
                                      <Button
                                        variant="outline"
                                        onClick={handleContinueWithoutAnalysis}
                                        className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2"
                                      >
                                        <SkipForward className="h-4 w-4" />
                                        {t('realTimePlayback.continueWithoutAnalysis', 'Continue Anyway')}
                                      </Button>
                                    )}
                                    
                                    {/* Stop auto-record button */}
                                    <Button
                                      variant="outline"
                                      onClick={handleStopAutoRecord}
                                      className="bg-red-500/20 border-red-400/50 text-red-200 hover:bg-red-500/30 gap-2"
                                    >
                                      <Square className="h-4 w-4" />
                                      {t('realTimePlayback.stopAutoRecord', 'Stop Auto Record')}
                                    </Button>
                                  </div>
                                  
                                  {/* Analysis status indicator at bottom */}
                                  {analysisEnabled && (
                                    <div className="mt-4 flex items-center gap-2 text-sm">
                                      {isAnalyzing ? (
                                        <span className="text-blue-300">
                                          {analysisStatus === 'uploading' && t('realTimePlayback.uploading', 'Uploading...')}
                                          {analysisStatus === 'extracting' && t('realTimePlayback.extracting', 'Extracting frames...')}
                                          {analysisStatus === 'analyzing' && t('realTimePlayback.analyzing', 'Analyzing...')}
                                        </span>
                                      ) : analysisStatus === 'complete' ? (
                                        <span className="text-green-300 flex items-center gap-1">
                                          <CheckCircle2 className="h-4 w-4" />
                                          {t('realTimePlayback.analysisComplete', 'Analysis complete')}
                                        </span>
                                      ) : analysisStatus === 'failed' ? (
                                        <span className="text-red-300 flex items-center gap-1">
                                          <AlertCircle className="h-4 w-4" />
                                          {t('realTimePlayback.failed', 'Analysis failed')}
                                        </span>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
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

                          {/* Orientation Warning Overlay */}
                          <AnimatePresence>
                            {orientationWarning && (
                              <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-amber-500/95 text-black px-6 py-4 rounded-xl shadow-lg text-center max-w-xs"
                              >
                                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-900" />
                                <p className="font-semibold text-sm">
                                  {t('realTimePlayback.orientationWarning', 'Avoid rotating your device during recording!')}
                                </p>
                                <p className="text-xs mt-1 text-amber-800">
                                  {t('realTimePlayback.orientationHint', 'This may interrupt your session.')}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
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
                          {/* Hammer Analysis Toggle */}
                          <Card className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Sparkles className="h-5 w-5 text-primary" />
                                <div>
                                  <Label htmlFor="analysis-toggle" className="font-medium">
                                    {t('realTimePlayback.aiAnalysis', 'Hammer Analysis')}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {t('realTimePlayback.aiAnalysisDescription', 'Get expert coaching feedback on your mechanics')}
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
                
                {/* Playback & Complete Phase - but NOT during auto-record countdown which shows camera preview */}
                {(phase === 'playback' || (phase === 'complete' && !showAutoRecordPreview)) && (
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
                        src={recordedUrl ?? undefined}
                        autoPlay
                        playsInline
                        loop
                        muted
                        preload="auto"
                        className={`w-full h-full object-contain ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                        onLoadedData={() => {
                          console.log('Video loaded data, ensuring playback');
                          const video = videoPlaybackRef.current;
                          if (video) {
                            video.currentTime = 0;
                            video.play().catch(console.error);
                          }
                        }}
                      />
                      
                      {/* Video Annotation Overlay */}
                      <VideoAnnotationOverlay
                        videoRef={videoPlaybackRef}
                        isActive={videoAnnotationActive}
                        onClose={() => setVideoAnnotationActive(false)}
                        annotations={videoAnnotations}
                        onAnnotationsChange={setVideoAnnotations}
                        currentTime={currentVideoTime}
                        onSaveFrame={handleSaveAnnotatedFrameFromOverlay}
                      />
                      
                      {/* PiP Active Overlay */}
                      {isPiPActive && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-40">
                          <PictureInPicture2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
                          <p className="text-white text-lg font-medium mb-2">
                            {t('realTimePlayback.pipActiveTitle', 'Video in Floating Window')}
                          </p>
                          <p className="text-muted-foreground text-sm mb-4 text-center px-8">
                            {t('realTimePlayback.pipActiveDescription', 'You can now use other apps while watching your recording')}
                          </p>
                          <Button onClick={handleTogglePiP} variant="secondary">
                            {t('realTimePlayback.returnToFullView', 'Return to Full View')}
                          </Button>
                        </div>
                      )}
                      
                      {/* Status indicators - STACKED VERTICALLY to prevent overlap */}
                      {!isPiPActive && (
                        <div className="absolute top-4 left-4 flex flex-col gap-2 items-start pointer-events-none">
                          {/* Playing status */}
                          {phase === 'playback' && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/90 text-white">
                              <Play className="h-4 w-4" />
                              <span className="font-medium text-sm">{t('realTimePlayback.playing', 'Playing Back')}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Right side indicators - STACKED VERTICALLY */}
                      {!isPiPActive && (
                        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end pointer-events-none">
                          {/* Speed indicator */}
                          <div className="px-3 py-1.5 rounded-full bg-black/70 text-white text-sm font-medium">
                            {playbackSpeed}x
                          </div>
                          
                          {/* Auto-capture indicator */}
                          {autoCaptureSetting === 'interval' && phase === 'playback' && !isPaused && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/90 text-black text-xs font-medium">
                              <TimerReset className="h-3 w-3" />
                              <span>{autoCaptureInterval}s</span>
                            </div>
                          )}
                          
                          {/* Analysis Status Badge */}
                          {analysisStatus !== 'idle' && analysisStatus !== 'complete' && (
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                              analysisStatus === 'uploading' || analysisStatus === 'extracting' || analysisStatus === 'analyzing'
                                ? 'bg-blue-500/90 text-white'
                                : analysisStatus === 'failed'
                                ? 'bg-red-500/90 text-white'
                                : 'bg-gray-500/90 text-white'
                            }`}>
                              {(analysisStatus === 'uploading' || analysisStatus === 'extracting' || analysisStatus === 'analyzing') && (
                                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                              )}
                              {analysisStatus === 'failed' && <AlertCircle className="h-3 w-3" />}
                              {analysisStatus === 'skipped-local' && <WifiOff className="h-3 w-3" />}
                              {analysisStatus === 'skipped-disabled' && <Sparkles className="h-3 w-3" />}
                              <span className="truncate max-w-[80px]">
                                {analysisStatus === 'uploading' && t('realTimePlayback.uploading', 'Uploading')}
                                {analysisStatus === 'extracting' && t('realTimePlayback.extracting', 'Extracting')}
                                {analysisStatus === 'analyzing' && t('realTimePlayback.analyzing', 'Analyzing')}
                                {analysisStatus === 'failed' && t('realTimePlayback.failed', 'Failed')}
                                {analysisStatus === 'skipped-local' && t('realTimePlayback.local', 'Local')}
                                {analysisStatus === 'skipped-disabled' && t('realTimePlayback.off', 'Off')}
                              </span>
                            </div>
                          )}
                          
                          {/* Analysis Complete Badge */}
                          {analysisStatus === 'complete' && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/90 text-white text-xs font-medium">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>{t('realTimePlayback.ready', 'Ready')}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Timer - Bottom right, separate from other badges */}
                      {phase === 'playback' && !isPiPActive && (
                        <div className="absolute bottom-16 right-4 px-4 py-2 rounded-lg bg-black/70 text-white text-xl font-mono pointer-events-none">
                          {Math.floor(playbackTimeLeft / 60)}:{String(playbackTimeLeft % 60).padStart(2, '0')}
                        </div>
                      )}
                      
                      {/* Video Controls */}
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                        {/* Left side controls: Play/Pause, Frame navigation, Capture, Annotate */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={handleTogglePlayPause}
                            className="h-9 w-9 rounded-full bg-black/70 hover:bg-black/90 text-white border-0"
                          >
                            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                          </Button>
                          
                          {/* Frame-by-frame navigation */}
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => handleStepFrame('backward', 5)}
                            className="h-8 w-8 rounded-full bg-black/70 hover:bg-black/90 text-white border-0"
                            title={t('realTimePlayback.stepBackward5', 'Back 5 frames')}
                          >
                            <SkipBack className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => handleStepFrame('backward', 1)}
                            className="h-8 w-8 rounded-full bg-black/70 hover:bg-black/90 text-white border-0"
                            title={t('realTimePlayback.stepBackward1', 'Back 1 frame')}
                          >
                            <ChevronLeft className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => handleStepFrame('forward', 1)}
                            className="h-8 w-8 rounded-full bg-black/70 hover:bg-black/90 text-white border-0"
                            title={t('realTimePlayback.stepForward1', 'Forward 1 frame')}
                          >
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => handleStepFrame('forward', 5)}
                            className="h-8 w-8 rounded-full bg-black/70 hover:bg-black/90 text-white border-0"
                            title={t('realTimePlayback.stepForward5', 'Forward 5 frames')}
                          >
                            <SkipForward className="h-3 w-3" />
                          </Button>
                          
                          <div className="w-px h-6 bg-white/30 mx-1" />
                          
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={handleCaptureKeyFrame}
                            className="h-9 w-9 rounded-full bg-black/70 hover:bg-black/90 text-white border-0"
                            title={t('realTimePlayback.captureKeyFrame', 'Capture Key Frame')}
                          >
                            <Camera className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={handleAnnotateCurrentFrame}
                            className="h-9 w-9 rounded-full bg-black/70 hover:bg-black/90 text-white border-0"
                            title={t('realTimePlayback.annotateCurrentFrame', 'Annotate Current Frame')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={handleOpenVideoAnnotation}
                            className="h-9 w-9 rounded-full bg-black/70 hover:bg-black/90 text-white border-0"
                            title={t('realTimePlayback.drawOnVideo', 'Draw on Video')}
                          >
                            <Layers className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Right side: PiP toggle */}
                        <div className="flex items-center gap-1">
                          {document.pictureInPictureEnabled && (
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={handleTogglePiP}
                              className={`h-9 w-9 rounded-full bg-black/70 hover:bg-black/90 text-white border-0 ${isPiPActive ? 'ring-2 ring-primary bg-primary/50' : ''}`}
                              title={isPiPActive ? t('realTimePlayback.exitPiP', 'Exit PiP') : t('realTimePlayback.enterPiP', 'Picture-in-Picture')}
                            >
                              <PictureInPicture2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Timeline scrubber */}
                      {videoDuration > 0 && (
                        <div className="absolute bottom-16 left-4 right-4">
                          <div className="relative h-1 bg-white/30 rounded-full cursor-pointer"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = e.clientX - rect.left;
                              const percent = x / rect.width;
                              handleSeekToTime(percent * videoDuration);
                            }}
                          >
                            <div 
                              className="absolute h-full bg-primary rounded-full"
                              style={{ width: `${(currentVideoTime / videoDuration) * 100}%` }}
                            />
                            {/* Captured frame markers */}
                            {capturedFrames.map((frame, i) => (
                              <div
                                key={i}
                                className="absolute w-2 h-2 bg-yellow-400 rounded-full -top-0.5 transform -translate-x-1/2 cursor-pointer hover:scale-150 transition-transform"
                                style={{ left: `${(frame.timestamp / videoDuration) * 100}%` }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSeekToTime(frame.timestamp);
                                }}
                                title={`Frame ${i + 1} - ${frame.timestamp.toFixed(2)}s`}
                              />
                            ))}
                          </div>
                          <div className="flex justify-between mt-1 text-[10px] text-white/70">
                            <span>{currentVideoTime.toFixed(1)}s</span>
                            <span>{videoDuration.toFixed(1)}s</span>
                          </div>
                        </div>
                      )}

                      {/* Auto-record countdown overlay - REMOVED, now shows in camera preview section */}
                    </div>
                    
                    {/* Auto-Record Controls - Below video during playback/complete when auto-record is enabled */}
                    {autoRecordEnabled && (phase === 'playback' || phase === 'complete') && (
                      <Card className="p-4 border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                          {/* Status Section */}
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${autoRecordPaused ? 'bg-muted' : analysisEnabled && isAnalyzing ? 'bg-blue-500/10' : 'bg-primary/10'}`}>
                              <Timer className={`h-5 w-5 ${autoRecordPaused ? 'text-muted-foreground' : analysisEnabled && isAnalyzing ? 'text-blue-500' : 'text-primary'}`} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {autoRecordPaused 
                                  ? t('realTimePlayback.autoRecordPaused', 'Auto-Record Paused')
                                  : analysisEnabled && isAnalyzing
                                    ? t('realTimePlayback.waitingForAnalysis', 'Waiting for Analysis...')
                                    : t('realTimePlayback.nextRecordingIn', 'Next recording in {{seconds}}s').replace('{{seconds}}', String(autoRecordCountdown))
                                }
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {autoRecordPaused 
                                  ? t('realTimePlayback.tapToResume', 'Tap Resume to continue')
                                  : analysisEnabled && isAnalyzing
                                    ? t('realTimePlayback.willContinueAfterAnalysis', 'Will continue when analysis completes')
                                    : t('realTimePlayback.recordingStartsAuto', 'Recording will start automatically')
                                }
                              </p>
                            </div>
                          </div>
                          
                          {/* Control Buttons */}
                          <div className="flex gap-2 flex-wrap justify-center">
                            {/* Pause/Resume button - enhanced styling when paused */}
                            <Button 
                              onClick={handleToggleAutoRecordPause} 
                              variant={autoRecordPaused ? "default" : "outline"}
                              size="sm"
                              className={autoRecordPaused 
                                ? "gap-2 bg-primary hover:bg-primary/90 text-primary-foreground animate-pulse" 
                                : "gap-2"
                              }
                            >
                              {autoRecordPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                              {autoRecordPaused 
                                ? t('realTimePlayback.resumeAutoRecord', 'Resume')
                                : t('realTimePlayback.pauseAutoRecord', 'Pause')
                              }
                            </Button>
                            
                            {/* Continue without analysis - only when analyzing */}
                            {analysisEnabled && isAnalyzing && (
                              <Button 
                                onClick={handleContinueWithoutAnalysis} 
                                variant="outline" 
                                size="sm"
                                className="gap-2"
                              >
                                <SkipForward className="h-4 w-4" />
                                {t('realTimePlayback.continueWithoutAnalysis', 'Continue Anyway')}
                              </Button>
                            )}
                            
                            {/* Stop auto-record */}
                            <Button 
                              onClick={handleStopAutoRecord} 
                              variant="outline" 
                              size="sm"
                              className="gap-2 text-destructive hover:text-destructive"
                            >
                              <Square className="h-4 w-4" />
                              {t('realTimePlayback.stopAutoRecord', 'Stop')}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )}
                    
                    {/* Frame Count Setting */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <Grid3X3 className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{t('realTimePlayback.frameCount', 'Frames for Hammer Analysis')}</span>
                        </div>
                        <ToggleGroup 
                          type="single" 
                          value={String(frameCountForAnalysis)}
                          onValueChange={(v) => v && setFrameCountForAnalysis(parseInt(v))}
                          className="flex gap-1"
                        >
                          {FRAME_COUNT_OPTIONS.map(n => (
                            <ToggleGroupItem key={n} value={String(n)} className="px-4 py-2">
                              {n}
                            </ToggleGroupItem>
                          ))}
                        </ToggleGroup>
                      </div>
                    </Card>
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
                    
                    {/* Auto-Capture Setting */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <TimerReset className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{t('realTimePlayback.autoCapture', 'Auto-Capture Frames')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ToggleGroup 
                            type="single" 
                            value={autoCaptureSetting}
                            onValueChange={(v) => v && setAutoCaptureSetting(v as 'off' | 'interval')}
                            className="flex gap-1"
                          >
                            <ToggleGroupItem value="off" className="px-3 py-1 text-sm">
                              {t('common.off', 'Off')}
                            </ToggleGroupItem>
                            <ToggleGroupItem value="interval" className="px-3 py-1 text-sm">
                              {autoCaptureInterval}s
                            </ToggleGroupItem>
                          </ToggleGroup>
                          {autoCaptureSetting === 'interval' && (
                            <Slider
                              value={[autoCaptureInterval]}
                              onValueChange={([v]) => setAutoCaptureInterval(v)}
                              min={1}
                              max={10}
                              step={1}
                              className="w-20"
                            />
                          )}
                        </div>
                      </div>
                    </Card>
                    
                    {/* Captured Frames with Selection and Annotation */}
                    {capturedFrames.length > 0 && (
                      <Card className="p-4">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Camera className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">
                              {t('realTimePlayback.capturedFrames', 'Captured Frames')} ({capturedFrames.length})
                            </span>
                            <span className="text-xs text-muted-foreground">
                              • {selectedFramesForCompare.length} {t('realTimePlayback.selectedForAnalysis', 'selected')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedFramesForCompare.length >= 2 && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setFrameCompareMode(true)}
                                className="gap-1"
                              >
                                <Copy className="h-3 w-3" />
                                {t('realTimePlayback.compare', 'Compare')}
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={handleSelectAllFrames}
                              className="text-xs"
                            >
                              {t('realTimePlayback.selectAll', 'Select All')}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={handleClearFrames}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {capturedFrames.map((frame, index) => (
                            <div 
                              key={index} 
                              className="relative flex-shrink-0 group"
                            >
                              {/* Selection checkbox */}
                              <div className="absolute -top-1 -left-1 z-10">
                                <Checkbox
                                  checked={frame.selectedForAnalysis}
                                  onCheckedChange={() => handleToggleFrameSelection(index)}
                                  className="bg-background"
                                />
                              </div>
                              
                              {/* Annotated badge */}
                              {frame.annotated && (
                                <div className="absolute -top-1 -right-1 z-10 bg-primary text-primary-foreground rounded-full p-0.5">
                                  <Pencil className="h-3 w-3" />
                                </div>
                              )}
                              
                              <img 
                                src={frame.dataUrl} 
                                alt={`Frame ${index + 1}`}
                                className={`h-20 w-auto rounded-md border-2 object-cover cursor-pointer ${
                                  frame.selectedForAnalysis ? 'border-primary' : 'border-border'
                                }`}
                                onClick={() => handleDownloadFrame(frame.dataUrl, index)}
                              />
                              
                              {/* Timestamp */}
                              <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-black/70 text-white text-[10px]">
                                {frame.timestamp.toFixed(2)}s
                              </div>
                              
                              {/* Hover overlay with actions */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-white hover:bg-white/20"
                                  onClick={(e) => { e.stopPropagation(); handleAnnotateFrame(frame, index); }}
                                  title={t('realTimePlayback.annotateFrame', 'Annotate')}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-white hover:bg-white/20"
                                  onClick={(e) => { e.stopPropagation(); handleDownloadFrame(frame.dataUrl, index); }}
                                  title={t('realTimePlayback.downloadFrame', 'Download')}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                    
                    {/* Analysis Card */}
                    {analysisEnabled && !localOnlyMode ? (
                      <Card className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
                        {isAnalyzing ? (
                          <div className="flex flex-col items-center justify-center py-8 space-y-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                            <span className="text-muted-foreground">
                              {analysisStatus === 'uploading' && t('realTimePlayback.statusUploading', 'Uploading...')}
                              {analysisStatus === 'extracting' && t('realTimePlayback.statusExtracting', 'Extracting frames...')}
                              {analysisStatus === 'analyzing' && t('realTimePlayback.statusAnalyzing', 'Hammer analyzing...')}
                            </span>
                            <p className="text-xs text-muted-foreground/70 text-center max-w-xs">
                              {t('realTimePlayback.analysisHint', 'This may take a few seconds')}
                            </p>
                          </div>
                        ) : analysisStatus === 'failed' ? (
                          <div className="flex flex-col items-center justify-center py-6 space-y-3">
                            <div className="p-3 rounded-full bg-red-500/10">
                              <AlertCircle className="h-6 w-6 text-red-500" />
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-red-600">{t('realTimePlayback.statusFailed', 'Analysis failed')}</p>
                              {analysisError && (
                                <p className="text-sm text-muted-foreground mt-1">{analysisError}</p>
                              )}
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={handleRetryAnalysis}
                              className="gap-2"
                            >
                              <RefreshCw className="h-4 w-4" />
                              {t('realTimePlayback.retryAnalysis', 'Retry Analysis')}
                            </Button>
                          </div>
                        ) : analysis ? (
                          <div className="space-y-4">
                            {/* Header with Score */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                <span className="font-semibold">{t('realTimePlayback.quickAnalysis', 'Quick Analysis')}</span>
                              </div>
                              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10">
                                <span className="text-lg font-bold text-primary">{analysis.overallScore}</span>
                                <span className="text-sm text-muted-foreground">/10</span>
                              </div>
                            </div>
                            
                            {/* Quick Summary */}
                            <p className="text-sm text-muted-foreground italic break-words">"{analysis.quickSummary}"</p>
                            
                            {/* Red Flags - Priority Warning Section */}
                            {analysis.redFlags && analysis.redFlags.length > 0 && (
                              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 space-y-2">
                                <div className="flex items-center gap-2 text-red-600">
                                  <AlertCircle className="h-4 w-4" />
                                  <span className="text-xs font-semibold uppercase tracking-wider">
                                    {t('realTimePlayback.redFlags', 'Red Flags')}
                                  </span>
                                </div>
                                <ul className="space-y-1">
                                  {analysis.redFlags.map((flag, i) => (
                                    <li key={i} className="text-sm text-red-700 dark:text-red-400 flex items-start gap-2 break-words">
                                      <span className="flex-shrink-0 mt-0.5">⚠️</span>
                                      <span>{flag.replace(/^⚠️\s*/, '')}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Positives Section */}
                            {analysis.positives && analysis.positives.length > 0 && (
                              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 space-y-2">
                                <div className="flex items-center gap-2 text-green-600">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span className="text-xs font-semibold uppercase tracking-wider">
                                    {t('realTimePlayback.positives', 'What\'s Working')}
                                  </span>
                                </div>
                                <ul className="space-y-1">
                                  {analysis.positives.map((positive, i) => (
                                    <li key={i} className="text-sm text-green-700 dark:text-green-400 flex items-start gap-2 break-words">
                                      <span className="flex-shrink-0 mt-0.5">✓</span>
                                      <span>{positive}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Mechanics Breakdown */}
                            <div className="space-y-2">
                              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {t('realTimePlayback.mechanicsBreakdown', 'Mechanics Breakdown')}
                              </span>
                              <div className="grid gap-2">
                                {analysis.mechanicsBreakdown.map((mechanic, i) => (
                                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                      mechanic.score >= 8 ? 'bg-green-500/20 text-green-600' :
                                      mechanic.score >= 6 ? 'bg-yellow-500/20 text-yellow-600' :
                                      'bg-red-500/20 text-red-600'
                                    }`}>
                                      {mechanic.score}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">{mechanic.category}</p>
                                      <p className="text-xs text-muted-foreground break-words">{mechanic.observation}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Key Insights */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-green-500">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span className="text-xs font-medium">{t('realTimePlayback.keyStrength', 'Key Strength')}</span>
                                </div>
                                <p className="text-sm pl-5 break-words">{analysis.keyStrength}</p>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-orange-500">
                                  <AlertCircle className="h-4 w-4" />
                                  <span className="text-xs font-medium">{t('realTimePlayback.priorityFix', 'Priority Fix')}</span>
                                </div>
                                <p className="text-sm pl-5 break-words">{analysis.priorityFix}</p>
                              </div>
                            </div>
                            
                            {/* Structured Drills */}
                            {analysis.drills && analysis.drills.length > 0 ? (
                              <div className="space-y-3 pt-2 border-t">
                                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                  {t('realTimePlayback.recommendedDrills', 'Recommended Drills')}
                                </span>
                                {analysis.drills.map((drill, i) => (
                                  <div key={i} className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Settings className="h-4 w-4 text-primary flex-shrink-0" />
                                      <span className="font-medium text-sm">{drill.title}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground italic break-words">{drill.purpose}</p>
                                    <ol className="text-sm space-y-1 pl-4">
                                      {drill.steps.map((step, stepIdx) => (
                                        <li key={stepIdx} className="list-decimal text-xs break-words">{step}</li>
                                      ))}
                                    </ol>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{drill.reps_sets}</span>
                                      {drill.cues.map((cue, cueIdx) => (
                                        <span key={cueIdx} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                          "{cue}"
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : analysis.drillRecommendation ? (
                              /* Legacy Drill Recommendation fallback */
                              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                                <Settings className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                  <span className="text-xs font-medium text-primary">{t('realTimePlayback.tryThisDrill', 'Try This Drill')}</span>
                                  <p className="text-sm break-words">{analysis.drillRecommendation}</p>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </Card>
                    ) : (
                      <Card className="p-4 border-muted bg-muted/30">
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Sparkles className="h-5 w-5" />
                          <p className="text-sm">
                            {localOnlyMode 
                              ? t('realTimePlayback.localOnlyNote', 'Local only mode - video will be uploaded when you save to library.')
                              : t('realTimePlayback.analysisDisabled', 'Hammer Analysis is turned off. Your video has been saved.')
                            }
                          </p>
                        </div>
                      </Card>
                    )}
                    
                    {/* Action Buttons - SHOW DURING PLAYBACK TOO so user can proceed while analysis runs */}
                    {(phase === 'playback' || phase === 'complete') && (
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
                    
                    {/* Skip Analysis Option when analyzing */}
                    {isAnalyzing && (
                      <div className="flex justify-center">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setIsAnalyzing(false);
                            setAnalysisStatus('skipped-disabled');
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {t('realTimePlayback.skipAnalysis', 'Skip Analysis & Continue')}
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
      
      {/* Frame Annotation Dialog */}
      {frameToAnnotate && (
        <FrameAnnotationDialog
          open={annotationDialogOpen}
          onOpenChange={(open) => {
            setAnnotationDialogOpen(open);
            if (!open) setFrameToAnnotate(null);
          }}
          frameDataUrl={frameToAnnotate.dataUrl}
          onSave={(annotatedDataUrl) => {
            if (frameToAnnotate.index === -1) {
              // New frame from current playback position
              const newFrame: CapturedFrame = {
                dataUrl: annotatedDataUrl,
                timestamp: currentVideoTime,
                selectedForAnalysis: true,
                annotated: true
              };
              setCapturedFrames(prev => [...prev, newFrame]);
              setAnnotationDialogOpen(false);
              setFrameToAnnotate(null);
              toast.success(t('realTimePlayback.frameAnnotated', 'Frame annotated and saved!'));
            } else {
              handleSaveAnnotatedFrame(annotatedDataUrl);
            }
          }}
        />
      )}
      
      {/* Frame Comparison Dialog */}
      <FrameComparisonDialog
        open={frameCompareMode}
        onOpenChange={setFrameCompareMode}
        frames={selectedFramesForCompare}
        onDownload={(frame, index) => handleDownloadFrame(frame.dataUrl, index)}
      />
      
      {/* Analysis Issue Alert Dialog */}
      <AlertDialog open={showAnalysisIssueAlert} onOpenChange={setShowAnalysisIssueAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('realTimePlayback.analysisIssueTitle', 'Unable to Analyze Recording')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('realTimePlayback.analysisIssueDescription', 
                "We couldn't gather enough information from your recording for an accurate analysis. This usually happens when the athlete isn't fully visible in the frame."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              {t('realTimePlayback.tipsForBetterRecording', 'Tips for a better recording:')}
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('realTimePlayback.tip1', 'Stand 6-10 feet from the camera')}</li>
              <li>{t('realTimePlayback.tip2', 'Ensure your full body is visible in frame')}</li>
              <li>{t('realTimePlayback.tip3', 'Use good lighting (avoid backlight)')}</li>
              <li>{t('realTimePlayback.tip4', 'Position camera at waist height for best angle')}</li>
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowAnalysisIssueAlert(false)}>
              {t('realTimePlayback.gotIt', "Got it, I'll try again")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
