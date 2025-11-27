import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Camera,
  Download,
  Link2,
  Columns2,
  Rows2,
  Layers,
  X,
  Edit,
  FlipHorizontal,
  ChevronDown,
  Maximize2
} from 'lucide-react';
import { useVideoSync } from '@/hooks/useVideoSync';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { FrameAnnotationDialog } from './FrameAnnotationDialog';

interface KeyFrame {
  original: string;
  annotated: string | null;
  timestamp: number;
}

interface LibrarySession {
  id: string;
  video_url: string;
  thumbnail_url?: string;
  library_title?: string;
  sport: string;
  module: string;
  efficiency_score?: number;
  session_date: string;
  ai_analysis?: any;
}

interface VideoComparisonViewProps {
  video1: LibrarySession;
  video2: LibrarySession;
  open: boolean;
  onClose: () => void;
}

export function VideoComparisonView({ video1, video2, open, onClose }: VideoComparisonViewProps) {
  const isMobile = useIsMobile();
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);

  const [syncPlayback, setSyncPlayback] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [timeOffset, setTimeOffset] = useState(0);
  const [layout, setLayout] = useState<'horizontal' | 'vertical' | 'overlay'>(isMobile ? 'vertical' : 'horizontal');
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [video1Mirrored, setVideo1Mirrored] = useState(false);
  const [video2Mirrored, setVideo2Mirrored] = useState(false);
  
  const [video1KeyFrames, setVideo1KeyFrames] = useState<KeyFrame[]>([]);
  const [video2KeyFrames, setVideo2KeyFrames] = useState<KeyFrame[]>([]);
  
  const [annotationDialogOpen, setAnnotationDialogOpen] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<{ videoNumber: 1 | 2; index: number } | null>(null);

  const [focusMode, setFocusMode] = useState(false);
  const [advancedControlsOpen, setAdvancedControlsOpen] = useState(false);
  const [keyFramesOpen, setKeyFramesOpen] = useState(false);
  const [video1CurrentTime, setVideo1CurrentTime] = useState(0);
  const [video2CurrentTime, setVideo2CurrentTime] = useState(0);
  const [video1Duration, setVideo1Duration] = useState(0);
  const [video2Duration, setVideo2Duration] = useState(0);

  // Detect landscape orientation for mobile
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== 'undefined' && window.matchMedia('(orientation: landscape)').matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(orientation: landscape)');
    const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Track video time updates
  useEffect(() => {
    const v1 = video1Ref.current;
    const v2 = video2Ref.current;

    const handleTimeUpdate1 = () => setVideo1CurrentTime(v1?.currentTime || 0);
    const handleTimeUpdate2 = () => setVideo2CurrentTime(v2?.currentTime || 0);
    const handleLoadedMetadata1 = () => setVideo1Duration(v1?.duration || 0);
    const handleLoadedMetadata2 = () => setVideo2Duration(v2?.duration || 0);

    v1?.addEventListener('timeupdate', handleTimeUpdate1);
    v1?.addEventListener('loadedmetadata', handleLoadedMetadata1);
    v2?.addEventListener('timeupdate', handleTimeUpdate2);
    v2?.addEventListener('loadedmetadata', handleLoadedMetadata2);

    return () => {
      v1?.removeEventListener('timeupdate', handleTimeUpdate1);
      v1?.removeEventListener('loadedmetadata', handleLoadedMetadata1);
      v2?.removeEventListener('timeupdate', handleTimeUpdate2);
      v2?.removeEventListener('loadedmetadata', handleLoadedMetadata2);
    };
  }, []);

  useVideoSync({
    video1Ref,
    video2Ref,
    syncEnabled: syncPlayback,
    timeOffset,
    playbackSpeed
  });

  const togglePlayPause = () => {
    const v1 = video1Ref.current;
    const v2 = video2Ref.current;
    if (!v1 || !v2) return;

    if (isPlaying) {
      v1.pause();
      if (syncPlayback) v2.pause();
      setIsPlaying(false);
    } else {
      v1.play();
      if (syncPlayback) v2.play();
      setIsPlaying(true);
    }
  };

  const stepFrame = (direction: 'forward' | 'backward') => {
    const v1 = video1Ref.current;
    const v2 = video2Ref.current;
    if (!v1) return;

    const step = direction === 'forward' ? 1/30 : -1/30;
    v1.currentTime = Math.max(0, Math.min(v1.duration, v1.currentTime + step));
    
    if (syncPlayback && v2) {
      v2.currentTime = Math.max(0, Math.min(v2.duration, v2.currentTime + step));
    }
  };

  const stepFrameIndividual = (videoNumber: 1 | 2, direction: 'forward' | 'backward') => {
    const videoRef = videoNumber === 1 ? video1Ref : video2Ref;
    const video = videoRef.current;
    if (!video) return;

    const step = direction === 'forward' ? 1/30 : -1/30;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + step));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (videoNumber: 1 | 2, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const videoRef = videoNumber === 1 ? video1Ref : video2Ref;
    const duration = videoNumber === 1 ? video1Duration : video2Duration;
    
    if (videoRef.current && duration > 0) {
      videoRef.current.currentTime = clickPosition * duration;
    }
  };

  const captureKeyFrame = (videoNumber: 1 | 2) => {
    const videoRef = videoNumber === 1 ? video1Ref : video2Ref;
    const canvasRef = videoNumber === 1 ? canvas1Ref : canvas2Ref;
    const setKeyFrames = videoNumber === 1 ? setVideo1KeyFrames : setVideo2KeyFrames;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/png');
    setKeyFrames(prev => [...prev, {
      original: imageData,
      annotated: null,
      timestamp: video.currentTime
    }]);

    toast.success(`Frame captured from Video ${videoNumber}`);
  };

  const downloadFrame = (videoNumber: 1 | 2, index: number) => {
    const frames = videoNumber === 1 ? video1KeyFrames : video2KeyFrames;
    const frame = frames[index];
    if (!frame) return;

    const link = document.createElement('a');
    link.href = frame.annotated || frame.original;
    link.download = `video-${videoNumber}-frame-${index + 1}.png`;
    link.click();

    toast.success('Frame downloaded');
  };

  const downloadAllFrames = async () => {
    const allFrames = [
      ...video1KeyFrames.map((f, i) => ({ data: f, video: 1, index: i })),
      ...video2KeyFrames.map((f, i) => ({ data: f, video: 2, index: i }))
    ];

    for (const { data, video, index } of allFrames) {
      const link = document.createElement('a');
      link.href = data.annotated || data.original;
      link.download = `video-${video}-frame-${index + 1}.png`;
      link.click();
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    toast.success('All frames downloaded');
  };

  const handleAnnotateFrame = (videoNumber: 1 | 2, index: number) => {
    setSelectedFrame({ videoNumber, index });
    setAnnotationDialogOpen(true);
  };

  const handleSaveAnnotation = (annotatedDataUrl: string) => {
    if (!selectedFrame) return;

    const { videoNumber, index } = selectedFrame;
    const setKeyFrames = videoNumber === 1 ? setVideo1KeyFrames : setVideo2KeyFrames;

    setKeyFrames(prev => prev.map((frame, i) => 
      i === index ? { ...frame, annotated: annotatedDataUrl } : frame
    ));

    toast.success('Annotation saved');
    setAnnotationDialogOpen(false);
    setSelectedFrame(null);
  };

  const jumpToFrame = (videoNumber: 1 | 2, timestamp: number) => {
    const videoRef = videoNumber === 1 ? video1Ref : video2Ref;
    if (!videoRef.current) return;

    videoRef.current.currentTime = timestamp;
    
    if (syncPlayback) {
      const otherVideoRef = videoNumber === 1 ? video2Ref : video1Ref;
      if (otherVideoRef.current) {
        otherVideoRef.current.currentTime = timestamp + (videoNumber === 1 ? timeOffset : -timeOffset);
      }
    }
  };

  const currentFrame = selectedFrame 
    ? (selectedFrame.videoNumber === 1 ? video1KeyFrames : video2KeyFrames)[selectedFrame.index]
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-full w-full p-3 sm:p-6 max-h-[95vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className={isMobile ? 'text-lg' : ''}>Video Comparison</span>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

        {/* Layout Controls & Focus Mode */}
        {!focusMode && (
          <div className="flex gap-2 mb-4 flex-wrap justify-between">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={layout === 'horizontal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLayout('horizontal')}
              >
                <Columns2 className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Side by Side</span>}
              </Button>
              <Button
                variant={layout === 'vertical' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLayout('vertical')}
              >
                <Rows2 className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Stacked</span>}
              </Button>
              <Button
                variant={layout === 'overlay' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLayout('overlay')}
              >
                <Layers className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Overlay</span>}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFocusMode(true)}
            >
              <Maximize2 className="h-4 w-4" />
              {!isMobile && <span className="ml-2">Focus Mode</span>}
            </Button>
          </div>
        )}

          {/* Video Players */}
          <div className={`relative ${
            isMobile && !isLandscape ? 'flex flex-col gap-4' : (
              layout === 'horizontal' ? 'grid grid-cols-2 gap-4' :
              layout === 'vertical' ? 'grid grid-rows-2 gap-4' :
              'relative'
            )
          }`}>
            {/* Video 1 */}
            <div className={layout === 'overlay' ? 'absolute inset-0 z-10' : ''}>
              <div className="space-y-2">
                {!focusMode && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge>{video1.sport}</Badge>
                      <Badge variant="outline">{video1.module}</Badge>
                      {video1.efficiency_score !== undefined && (
                        <Badge variant="secondary">{video1.efficiency_score}%</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => captureKeyFrame(1)}
                    >
                      <Camera className="h-4 w-4" />
                      {!isMobile && <span className="ml-2">Capture</span>}
                    </Button>
                  </div>
                )}
                <div className="relative w-full max-w-full overflow-hidden">
                  <video
                    ref={video1Ref}
                    src={video1.video_url}
                    className={`w-full rounded-lg bg-black object-contain ${
                      layout === 'horizontal' ? 'max-h-[50vh]' : 'max-h-[35vh]'
                    }`}
                    controls
                    preload="metadata"
                    style={
                      layout === 'overlay' 
                        ? { opacity: overlayOpacity / 100, transform: video1Mirrored ? 'scaleX(-1)' : 'none' } 
                        : { transform: video1Mirrored ? 'scaleX(-1)' : 'none' }
                    }
                  />
                </div>
                
                {!focusMode && (
                  <>
                    {/* Individual Frame Controls for Video 1 */}
                    <div className={`flex justify-center gap-1 mt-2 ${isMobile ? 'flex-wrap' : 'gap-2'}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => stepFrameIndividual(1, 'backward')}
                        className={isMobile ? 'h-8 w-8 p-0' : ''}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {!isMobile && <span className="text-xs text-muted-foreground self-center">Frame Step</span>}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => stepFrameIndividual(1, 'forward')}
                        className={isMobile ? 'h-8 w-8 p-0' : ''}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVideo1Mirrored(!video1Mirrored)}
                        title="Mirror video"
                        className={`${video1Mirrored ? 'bg-primary/10' : ''} ${isMobile ? 'h-8 w-8 p-0' : ''}`}
                      >
                        <FlipHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <canvas ref={canvas1Ref} className="hidden" />
                    <p className="text-sm font-medium">{video1.library_title || `Video 1`}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(video1.session_date).toLocaleDateString()}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Video 2 */}
            <div className={layout === 'overlay' ? 'relative z-0' : ''}>
              <div className="space-y-2">
                {!focusMode && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge>{video2.sport}</Badge>
                      <Badge variant="outline">{video2.module}</Badge>
                      {video2.efficiency_score !== undefined && (
                        <Badge variant="secondary">{video2.efficiency_score}%</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => captureKeyFrame(2)}
                    >
                      <Camera className="h-4 w-4" />
                      {!isMobile && <span className="ml-2">Capture</span>}
                    </Button>
                  </div>
                )}
                <div className="relative w-full max-w-full overflow-hidden">
                  <video
                    ref={video2Ref}
                    src={video2.video_url}
                    className={`w-full rounded-lg bg-black object-contain ${
                      layout === 'horizontal' ? 'max-h-[50vh]' : 'max-h-[35vh]'
                    }`}
                    controls
                    preload="metadata"
                    style={{ transform: video2Mirrored ? 'scaleX(-1)' : 'none' }}
                  />
                </div>
                
                {!focusMode && (
                  <>
                    {/* Individual Frame Controls for Video 2 */}
                    <div className={`flex justify-center gap-1 mt-2 ${isMobile ? 'flex-wrap' : 'gap-2'}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => stepFrameIndividual(2, 'backward')}
                        className={isMobile ? 'h-8 w-8 p-0' : ''}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {!isMobile && <span className="text-xs text-muted-foreground self-center">Frame Step</span>}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => stepFrameIndividual(2, 'forward')}
                        className={isMobile ? 'h-8 w-8 p-0' : ''}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVideo2Mirrored(!video2Mirrored)}
                        title="Mirror video"
                        className={`${video2Mirrored ? 'bg-primary/10' : ''} ${isMobile ? 'h-8 w-8 p-0' : ''}`}
                      >
                        <FlipHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <canvas ref={canvas2Ref} className="hidden" />
                    <p className="text-sm font-medium">{video2.library_title || `Video 2`}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(video2.session_date).toLocaleDateString()}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Side-by-Side Progress Bars */}
          {!focusMode && (
            <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-2 gap-4'} py-3`}>
              {/* Video 1 Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="font-medium">Video 1</span>
                  <span>{formatTime(video1CurrentTime)} / {formatTime(video1Duration)}</span>
                </div>
                <div 
                  className="relative h-3 bg-secondary rounded-full cursor-pointer overflow-hidden"
                  onClick={(e) => handleProgressClick(1, e)}
                >
                  <div 
                    className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-100"
                    style={{ width: `${video1Duration > 0 ? (video1CurrentTime / video1Duration) * 100 : 0}%` }}
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow"
                    style={{ left: `calc(${video1Duration > 0 ? (video1CurrentTime / video1Duration) * 100 : 0}% - 6px)` }}
                  />
                </div>
              </div>

              {/* Video 2 Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="font-medium">Video 2</span>
                  <span>{formatTime(video2CurrentTime)} / {formatTime(video2Duration)}</span>
                </div>
                <div 
                  className="relative h-3 bg-secondary rounded-full cursor-pointer overflow-hidden"
                  onClick={(e) => handleProgressClick(2, e)}
                >
                  <div 
                    className="absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all duration-100"
                    style={{ width: `${video2Duration > 0 ? (video2CurrentTime / video2Duration) * 100 : 0}%` }}
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-green-500 rounded-full shadow"
                    style={{ left: `calc(${video2Duration > 0 ? (video2CurrentTime / video2Duration) * 100 : 0}% - 6px)` }}
                  />
                </div>
              </div>
            </div>
          )}

          {!focusMode && (
            <>
              <Separator />

              {/* Essential Synchronized Controls */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={syncPlayback}
                    onCheckedChange={setSyncPlayback}
                    id="sync-playback"
                  />
                  <Label htmlFor="sync-playback" className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    {!isMobile && 'Synchronized Playback'}
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => stepFrame('backward')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={togglePlayPause}>
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => stepFrame('forward')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Advanced Controls - Collapsible */}
              <Collapsible open={advancedControlsOpen} onOpenChange={setAdvancedControlsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span>Advanced Controls</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${advancedControlsOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  {/* Playback Speed */}
                  <div className="space-y-2">
                    <Label>Playback Speed: {playbackSpeed}x</Label>
                    <Slider
                      value={[playbackSpeed]}
                      onValueChange={([value]) => setPlaybackSpeed(value)}
                      min={0.25}
                      max={2}
                      step={0.25}
                    />
                  </div>

                  {/* Time Offset */}
                  {syncPlayback && (
                    <div className="space-y-2">
                      <Label>Time Offset: {timeOffset > 0 ? '+' : ''}{timeOffset.toFixed(2)}s</Label>
                      <Slider
                        value={[timeOffset]}
                        onValueChange={([value]) => setTimeOffset(value)}
                        min={-5}
                        max={5}
                        step={0.1}
                      />
                    </div>
                  )}

                  {/* Overlay Opacity Control */}
                  {layout === 'overlay' && (
                    <div className="space-y-2">
                      <Label>Overlay Opacity: {overlayOpacity}%</Label>
                      <Slider
                        value={[overlayOpacity]}
                        onValueChange={([value]) => setOverlayOpacity(value)}
                        min={0}
                        max={100}
                        step={5}
                      />
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              <Separator />
            </>
          )}

          {/* Focus Mode - Minimal Controls */}
          {focusMode && (
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={togglePlayPause}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => setFocusMode(false)}>
                Exit Focus Mode
              </Button>
            </div>
          )}

          {/* Key Frames Grid - Collapsible */}
          {!focusMode && (
            <Collapsible open={keyFramesOpen} onOpenChange={setKeyFramesOpen}>
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex-1 justify-between">
                    <span className={`font-semibold ${isMobile ? 'text-base' : 'text-lg'}`}>
                      Captured Key Frames ({video1KeyFrames.length + video2KeyFrames.length})
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${keyFramesOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                {(video1KeyFrames.length > 0 || video2KeyFrames.length > 0) && (
                  <Button variant="outline" size="sm" onClick={downloadAllFrames} className="ml-2">
                    <Download className="h-4 w-4 mr-2" />
                    {!isMobile && 'Download All'}
                  </Button>
                )}
              </div>

              <CollapsibleContent className="pt-4">
                <ScrollArea className="h-64">
                  <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                    {/* Video 1 Frames */}
                    <div className="space-y-2">
                      <p className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Video 1 Frames</p>
                      {video1KeyFrames.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No frames captured</p>
                      ) : (
                        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                          {video1KeyFrames.map((frame, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={frame.annotated || frame.original}
                                alt={`Video 1 Frame ${idx + 1}`}
                                className="w-full rounded border cursor-pointer hover:border-primary"
                                onClick={() => jumpToFrame(1, frame.timestamp)}
                              />
                              <div className={`absolute inset-0 bg-black/50 transition-opacity flex items-center justify-center gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAnnotateFrame(1, idx);
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadFrame(1, idx);
                                  }}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-xs text-center mt-1">{frame.timestamp.toFixed(2)}s</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Video 2 Frames */}
                    <div className="space-y-2">
                      <p className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Video 2 Frames</p>
                      {video2KeyFrames.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No frames captured</p>
                      ) : (
                        <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                          {video2KeyFrames.map((frame, idx) => (
                            <div key={idx} className="relative group">
                              <img
                                src={frame.annotated || frame.original}
                                alt={`Video 2 Frame ${idx + 1}`}
                                className="w-full rounded border cursor-pointer hover:border-primary"
                                onClick={() => jumpToFrame(2, frame.timestamp)}
                              />
                              <div className={`absolute inset-0 bg-black/50 transition-opacity flex items-center justify-center gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAnnotateFrame(2, idx);
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadFrame(2, idx);
                                  }}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-xs text-center mt-1">{frame.timestamp.toFixed(2)}s</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          )}
        </DialogContent>
      </Dialog>

      {/* Frame Annotation Dialog */}
      {annotationDialogOpen && currentFrame && (
        <FrameAnnotationDialog
          frameDataUrl={currentFrame.annotated || currentFrame.original}
          open={annotationDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setAnnotationDialogOpen(false);
              setSelectedFrame(null);
            }
          }}
          onSave={handleSaveAnnotation}
        />
      )}
    </>
  );
}
