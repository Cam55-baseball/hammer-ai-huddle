import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Camera,
  Download,
  Columns2,
  Rows2,
  Layers,
  X,
  Edit,
  FlipHorizontal,
  ChevronDown,
} from 'lucide-react';
import { useVideoSync } from '@/hooks/useVideoSync';
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
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);

  const [syncPlayback, setSyncPlayback] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [timeOffset, setTimeOffset] = useState(0);
  const [layout, setLayout] = useState<'horizontal' | 'vertical' | 'overlay'>('horizontal');
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [video1Mirrored, setVideo1Mirrored] = useState(false);
  const [video2Mirrored, setVideo2Mirrored] = useState(false);
  
  const [video1KeyFrames, setVideo1KeyFrames] = useState<KeyFrame[]>([]);
  const [video2KeyFrames, setVideo2KeyFrames] = useState<KeyFrame[]>([]);
  
  const [annotationDialogOpen, setAnnotationDialogOpen] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<{ videoNumber: 1 | 2; index: number } | null>(null);

  const [advancedControlsOpen, setAdvancedControlsOpen] = useState(false);
  const [keyFramesOpen, setKeyFramesOpen] = useState(false);
  const [video1CurrentTime, setVideo1CurrentTime] = useState(0);
  const [video2CurrentTime, setVideo2CurrentTime] = useState(0);
  const [video1Duration, setVideo1Duration] = useState(0);
  const [video2Duration, setVideo2Duration] = useState(0);

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
        <DialogContent className="max-w-full w-full h-[95vh] p-2 sm:p-4 flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0 pb-2">
            <DialogTitle className="flex items-center justify-between">
              <span className="text-base sm:text-lg">Video Comparison</span>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Video Container - Takes all available space */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className={`h-full ${
              layout === 'horizontal' 
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' 
                : layout === 'vertical'
                ? 'grid grid-rows-2 gap-2'
                : 'relative'
            }`}>
              {/* Video 1 */}
              <div className={`h-full overflow-hidden flex flex-col ${layout === 'overlay' ? 'absolute inset-0 z-10' : ''}`}>
                <div className="relative flex-1 min-h-0">
                  <div style={{ transform: video1Mirrored ? 'scaleX(-1)' : 'none' }} className="h-full">
                    <video
                      ref={video1Ref}
                      src={video1.video_url}
                      className="w-full h-full rounded-lg bg-black object-contain"
                      controls
                      preload="metadata"
                      style={
                        layout === 'overlay' 
                          ? { opacity: overlayOpacity / 100 } 
                          : undefined
                      }
                    />
                  </div>
                  {/* Overlay Controls */}
                  <div className="absolute bottom-2 right-2 flex gap-1 opacity-70 hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => captureKeyFrame(1)}
                      className="h-8 w-8 p-0"
                      title="Capture frame"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setVideo1Mirrored(!video1Mirrored)}
                      className={`h-8 w-8 p-0 ${video1Mirrored ? 'bg-primary/20' : ''}`}
                      title="Mirror video"
                    >
                      <FlipHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="flex-shrink-0 pt-1 space-y-0.5">
                  <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                    <span>V1</span>
                    <span>{formatTime(video1CurrentTime)} / {formatTime(video1Duration)}</span>
                  </div>
                  <div 
                    className="relative h-2 bg-secondary rounded-full cursor-pointer overflow-hidden"
                    onClick={(e) => handleProgressClick(1, e)}
                  >
                    <div 
                      className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-100"
                      style={{ width: `${video1Duration > 0 ? (video1CurrentTime / video1Duration) * 100 : 0}%` }}
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white border border-blue-500 rounded-full shadow"
                      style={{ left: `calc(${video1Duration > 0 ? (video1CurrentTime / video1Duration) * 100 : 0}% - 4px)` }}
                    />
                  </div>
                  {/* Individual Frame Controls */}
                  <div className="flex justify-center gap-1 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => stepFrameIndividual(1, 'backward')}
                      className="h-7 w-7 p-0"
                      title="Step backward"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => stepFrameIndividual(1, 'forward')}
                      className="h-7 w-7 p-0"
                      title="Step forward"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <canvas ref={canvas1Ref} className="hidden" />
              </div>

              {/* Video 2 */}
              <div className={`h-full overflow-hidden flex flex-col ${layout === 'overlay' ? 'relative z-0' : ''}`}>
                <div className="relative flex-1 min-h-0">
                  <div style={{ transform: video2Mirrored ? 'scaleX(-1)' : 'none' }} className="h-full">
                    <video
                      ref={video2Ref}
                      src={video2.video_url}
                      className="w-full h-full rounded-lg bg-black object-contain"
                      controls
                      preload="metadata"
                    />
                  </div>
                  {/* Overlay Controls */}
                  <div className="absolute bottom-2 right-2 flex gap-1 opacity-70 hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => captureKeyFrame(2)}
                      className="h-8 w-8 p-0"
                      title="Capture frame"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setVideo2Mirrored(!video2Mirrored)}
                      className={`h-8 w-8 p-0 ${video2Mirrored ? 'bg-primary/20' : ''}`}
                      title="Mirror video"
                    >
                      <FlipHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="flex-shrink-0 pt-1 space-y-0.5">
                  <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                    <span>V2</span>
                    <span>{formatTime(video2CurrentTime)} / {formatTime(video2Duration)}</span>
                  </div>
                  <div 
                    className="relative h-2 bg-secondary rounded-full cursor-pointer overflow-hidden"
                    onClick={(e) => handleProgressClick(2, e)}
                  >
                    <div 
                      className="absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all duration-100"
                      style={{ width: `${video2Duration > 0 ? (video2CurrentTime / video2Duration) * 100 : 0}%` }}
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white border border-green-500 rounded-full shadow"
                      style={{ left: `calc(${video2Duration > 0 ? (video2CurrentTime / video2Duration) * 100 : 0}% - 4px)` }}
                    />
                  </div>
                  {/* Individual Frame Controls */}
                  <div className="flex justify-center gap-1 pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => stepFrameIndividual(2, 'backward')}
                      className="h-7 w-7 p-0"
                      title="Step backward"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => stepFrameIndividual(2, 'forward')}
                      className="h-7 w-7 p-0"
                      title="Step forward"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <canvas ref={canvas2Ref} className="hidden" />
              </div>
            </div>
          </div>

          {/* Bottom Control Bar - Fixed Height */}
          <div className="flex-shrink-0 pt-2 space-y-2 border-t">
            {/* Main Controls */}
            <div className="flex items-center justify-between gap-2">
              {/* Left: Layout + Sync Toggle */}
              <div className="flex items-center gap-1">
                <Button
                  variant={layout === 'horizontal' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLayout('horizontal')}
                  className="h-8 w-8 p-0"
                  title="Side by side"
                >
                  <Columns2 className="h-4 w-4" />
                </Button>
                <Button
                  variant={layout === 'vertical' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLayout('vertical')}
                  className="h-8 w-8 p-0"
                  title="Stacked"
                >
                  <Rows2 className="h-4 w-4" />
                </Button>
                <Button
                  variant={layout === 'overlay' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setLayout('overlay')}
                  className="h-8 w-8 p-0"
                  title="Overlay"
                >
                  <Layers className="h-4 w-4" />
                </Button>
                <div className="h-4 w-px bg-border mx-1" />
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={syncPlayback}
                    onCheckedChange={setSyncPlayback}
                    id="sync"
                    className="scale-75"
                  />
                  <Label htmlFor="sync" className="text-xs cursor-pointer hidden sm:inline">
                    Sync
                  </Label>
                </div>
              </div>

              {/* Center: Playback Controls */}
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => stepFrame('backward')} className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="default" size="sm" onClick={togglePlayPause} className="h-8 px-3">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => stepFrame('forward')} className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Right: More Options */}
              <Collapsible open={advancedControlsOpen} onOpenChange={setAdvancedControlsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <span className="text-xs">More</span>
                    <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${advancedControlsOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            </div>

            {/* Advanced Controls Content */}
            <Collapsible open={advancedControlsOpen} onOpenChange={setAdvancedControlsOpen}>
              <CollapsibleContent className="space-y-3 pt-2 border-t">
                {/* Playback Speed */}
                <div className="space-y-1">
                  <Label className="text-xs">Speed: {playbackSpeed}x</Label>
                  <Slider
                    value={[playbackSpeed]}
                    onValueChange={([value]) => setPlaybackSpeed(value)}
                    min={0.25}
                    max={2}
                    step={0.25}
                    className="w-full"
                  />
                </div>

                {/* Time Offset */}
                {syncPlayback && (
                  <div className="space-y-1">
                    <Label className="text-xs">Offset: {timeOffset > 0 ? '+' : ''}{timeOffset.toFixed(2)}s</Label>
                    <Slider
                      value={[timeOffset]}
                      onValueChange={([value]) => setTimeOffset(value)}
                      min={-5}
                      max={5}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Overlay Opacity */}
                {layout === 'overlay' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Opacity: {overlayOpacity}%</Label>
                    <Slider
                      value={[overlayOpacity]}
                      onValueChange={([value]) => setOverlayOpacity(value)}
                      min={0}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Key Frames */}
                {(video1KeyFrames.length > 0 || video2KeyFrames.length > 0) && (
                  <Collapsible open={keyFramesOpen} onOpenChange={setKeyFramesOpen}>
                    <div className="flex items-center justify-between border-t pt-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="flex-1 justify-between h-7">
                          <span className="text-xs">
                            Key Frames ({video1KeyFrames.length + video2KeyFrames.length})
                          </span>
                          <ChevronDown className={`h-3 w-3 transition-transform ${keyFramesOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <Button variant="ghost" size="sm" onClick={downloadAllFrames} className="h-7 px-2">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>

                    <CollapsibleContent className="pt-2">
                      <ScrollArea className="h-48">
                        <div className="grid grid-cols-2 gap-2">
                          {/* Video 1 Frames */}
                          {video1KeyFrames.map((frame, idx) => (
                            <div key={`v1-${idx}`} className="relative group">
                              <img
                                src={frame.annotated || frame.original}
                                alt={`V1 Frame ${idx + 1}`}
                                className="w-full rounded border cursor-pointer hover:border-primary"
                                onClick={() => jumpToFrame(1, frame.timestamp)}
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAnnotateFrame(1, idx);
                                  }}
                                  className="h-6 w-6 p-0"
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
                                  className="h-6 w-6 p-0"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-[10px] text-center mt-0.5">V1 {frame.timestamp.toFixed(2)}s</p>
                            </div>
                          ))}

                          {/* Video 2 Frames */}
                          {video2KeyFrames.map((frame, idx) => (
                            <div key={`v2-${idx}`} className="relative group">
                              <img
                                src={frame.annotated || frame.original}
                                alt={`V2 Frame ${idx + 1}`}
                                className="w-full rounded border cursor-pointer hover:border-primary"
                                onClick={() => jumpToFrame(2, frame.timestamp)}
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAnnotateFrame(2, idx);
                                  }}
                                  className="h-6 w-6 p-0"
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
                                  className="h-6 w-6 p-0"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-[10px] text-center mt-0.5">V2 {frame.timestamp.toFixed(2)}s</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
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
