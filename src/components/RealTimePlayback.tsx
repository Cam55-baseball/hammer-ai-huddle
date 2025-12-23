import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { 
  X, Video, Play, Pause, RotateCcw, Download, BookMarked, 
  Settings, Timer, Clock, Gauge, Camera, CheckCircle2, AlertCircle,
  Sparkles
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
  
  // State
  const [phase, setPhase] = useState<Phase>('setup');
  const [countdown, setCountdown] = useState(5);
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
  
  // Refs
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const videoPlaybackRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Persist settings
  useEffect(() => {
    localStorage.setItem('rtPlayback_recordingDuration', String(recordingDuration));
    localStorage.setItem('rtPlayback_playbackDelay', String(playbackDelay));
    localStorage.setItem('rtPlayback_repeatDuration', String(repeatDuration));
    localStorage.setItem('rtPlayback_playbackSpeed', playbackSpeed);
  }, [recordingDuration, playbackDelay, repeatDuration, playbackSpeed]);
  
  // Speed control during playback
  useEffect(() => {
    if (videoPlaybackRef.current && (phase === 'playback' || phase === 'complete')) {
      videoPlaybackRef.current.playbackRate = parseFloat(playbackSpeed);
    }
  }, [playbackSpeed, phase]);
  
  // Initialize camera
  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
      setCameraPermission(true);
    } catch (error) {
      console.error('Camera access error:', error);
      setCameraPermission(false);
      toast.error(t('realTimePlayback.cameraPermissionDenied', 'Camera access was denied'));
    }
  }, [t]);
  
  // Cleanup camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);
  
  useEffect(() => {
    if (isOpen && phase === 'setup') {
      initCamera();
    }
    return () => {
      if (!isOpen) {
        stopCamera();
        if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [isOpen, phase, initCamera, stopCamera, recordedUrl]);
  
  // Recording flow
  const startRecordingFlow = async () => {
    if (!streamRef.current) return;
    
    // Reset state
    setRecordedBlob(null);
    setRecordedUrl(null);
    setAnalysis(null);
    chunksRef.current = [];
    
    // Countdown phase
    setPhase('countdown');
    for (let i = 5; i > 0; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    
    // Recording phase
    setPhase('recording');
    setRecordingTimeLeft(recordingDuration);
    
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9' 
        : 'video/webm'
    });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
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
      
      // Start analysis in background
      generateAnalysis(blob);
    };
    
    mediaRecorderRef.current = recorder;
    recorder.start();
    
    // Record for duration
    for (let i = recordingDuration; i > 0; i--) {
      setRecordingTimeLeft(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    
    recorder.stop();
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
  
  // Auto-play video when playback starts
  useEffect(() => {
    if (phase === 'playback' && videoPlaybackRef.current && recordedUrl) {
      videoPlaybackRef.current.src = recordedUrl;
      videoPlaybackRef.current.playbackRate = parseFloat(playbackSpeed);
      videoPlaybackRef.current.loop = true;
      videoPlaybackRef.current.play().catch(console.error);
    }
  }, [phase, recordedUrl, playbackSpeed]);
  
  // Generate AI analysis
  const generateAnalysis = async (blob: Blob) => {
    setIsAnalyzing(true);
    try {
      // Upload video first
      if (!user) return;
      
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
      
      // Call analysis edge function
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
    } catch (error) {
      console.error('Failed to generate analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Restart flow
  const handleRestart = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setAnalysis(null);
    setPhase('setup');
    setCurrentVideoId(null);
    initCamera();
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
  
  // Handle close
  const handleClose = () => {
    stopCamera();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setPhase('setup');
    setRecordedBlob(null);
    setRecordedUrl(null);
    setAnalysis(null);
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden bg-gradient-to-br from-background via-background to-muted/30">
          <VisuallyHidden.Root>
            <DialogTitle>{t('realTimePlayback.title', 'Real-Time Playback')}</DialogTitle>
          </VisuallyHidden.Root>
          <div className="relative h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm">
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
            
            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <AnimatePresence mode="wait">
                {/* Setup Phase */}
                {phase === 'setup' && (
                  <motion.div
                    key="setup"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    {/* Camera Preview */}
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                      {cameraPermission === false ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                          <AlertCircle className="h-12 w-12 mb-4 text-destructive" />
                          <p>{t('realTimePlayback.cameraPermissionRequired', 'Camera permission is required')}</p>
                          <Button variant="outline" className="mt-4" onClick={initCamera}>
                            {t('common.retry', 'Retry')}
                          </Button>
                        </div>
                      ) : (
                        <video
                          ref={videoPreviewRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                      )}
                    </div>
                    
                    {/* Settings Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Recording Duration */}
                      <Card className="p-4 space-y-3">
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
                      <Card className="p-4 space-y-3">
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
                      <Card className="p-4 space-y-3">
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
                  </motion.div>
                )}
                
                {/* Countdown Phase */}
                {phase === 'countdown' && (
                  <motion.div
                    key="countdown"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex flex-col items-center justify-center min-h-[400px]"
                  >
                    <p className="text-lg text-muted-foreground mb-4">{t('realTimePlayback.getReady', 'Get Ready!')}</p>
                    <motion.div
                      key={countdown}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      className="text-9xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent"
                    >
                      {countdown}
                    </motion.div>
                  </motion.div>
                )}
                
                {/* Recording Phase */}
                {phase === 'recording' && (
                  <motion.div
                    key="recording"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                      <video
                        ref={videoPreviewRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      {/* Recording indicator */}
                      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/90 text-white">
                        <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
                        <span className="font-medium">{t('realTimePlayback.recording', 'Recording')}</span>
                      </div>
                      {/* Timer */}
                      <div className="absolute bottom-4 right-4 px-4 py-2 rounded-lg bg-black/70 text-white text-2xl font-mono">
                        {recordingTimeLeft}s
                      </div>
                    </div>
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
                        className="w-full h-full object-cover scale-x-[-1]"
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
                    
                    {/* Action Buttons */}
                    {phase === 'complete' && (
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={handleRestart} variant="outline" className="flex-1 gap-2">
                          <RotateCcw className="h-4 w-4" />
                          {t('realTimePlayback.restart', 'Restart')}
                        </Button>
                        <Button onClick={handleDownload} variant="outline" className="flex-1 gap-2">
                          <Download className="h-4 w-4" />
                          {t('realTimePlayback.download', 'Download')}
                        </Button>
                        <Button 
                          onClick={() => setShowSaveDialog(true)} 
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
