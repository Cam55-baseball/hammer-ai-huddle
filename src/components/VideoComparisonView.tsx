import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Edit
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
  
  const [video1KeyFrames, setVideo1KeyFrames] = useState<KeyFrame[]>([]);
  const [video2KeyFrames, setVideo2KeyFrames] = useState<KeyFrame[]>([]);
  
  const [annotationDialogOpen, setAnnotationDialogOpen] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<{ videoNumber: 1 | 2; index: number } | null>(null);

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
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-6 overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Video Comparison</span>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Layout Controls */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={layout === 'horizontal' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLayout('horizontal')}
            >
              <Columns2 className="h-4 w-4 mr-2" />
              Side by Side
            </Button>
            <Button
              variant={layout === 'vertical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLayout('vertical')}
            >
              <Rows2 className="h-4 w-4 mr-2" />
              Stacked
            </Button>
            <Button
              variant={layout === 'overlay' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLayout('overlay')}
            >
              <Layers className="h-4 w-4 mr-2" />
              Overlay
            </Button>
          </div>

          {/* Video Players */}
          <div className={`relative ${
            layout === 'horizontal' ? 'grid grid-cols-2 gap-4' :
            layout === 'vertical' ? 'grid grid-rows-2 gap-4' :
            'relative'
          }`}>
            {/* Video 1 */}
            <div className={layout === 'overlay' ? 'absolute inset-0 z-10' : ''}>
              <div className="space-y-2">
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
                    <Camera className="h-4 w-4 mr-2" />
                    Capture
                  </Button>
                </div>
                <video
                  ref={video1Ref}
                  src={video1.video_url}
                  className="w-full rounded-lg bg-black"
                  controls
                  preload="metadata"
                  style={layout === 'overlay' ? { opacity: overlayOpacity / 100 } : {}}
                />
                <canvas ref={canvas1Ref} className="hidden" />
                <p className="text-sm font-medium">{video1.library_title || `Video 1`}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(video1.session_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Video 2 */}
            <div className={layout === 'overlay' ? 'relative z-0' : ''}>
              <div className="space-y-2">
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
                    <Camera className="h-4 w-4 mr-2" />
                    Capture
                  </Button>
                </div>
                <video
                  ref={video2Ref}
                  src={video2.video_url}
                  className="w-full rounded-lg bg-black"
                  controls
                  preload="metadata"
                />
                <canvas ref={canvas2Ref} className="hidden" />
                <p className="text-sm font-medium">{video2.library_title || `Video 2`}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(video2.session_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

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

          <Separator />

          {/* Synchronized Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={syncPlayback}
                  onCheckedChange={setSyncPlayback}
                  id="sync-playback"
                />
                <Label htmlFor="sync-playback" className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Synchronized Playback
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
          </div>

          <Separator />

          {/* Key Frames Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Captured Key Frames</h3>
              {(video1KeyFrames.length > 0 || video2KeyFrames.length > 0) && (
                <Button variant="outline" size="sm" onClick={downloadAllFrames}>
                  <Download className="h-4 w-4 mr-2" />
                  Download All
                </Button>
              )}
            </div>

            <ScrollArea className="h-64">
              <div className="grid grid-cols-2 gap-4">
                {/* Video 1 Frames */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Video 1 Frames</p>
                  {video1KeyFrames.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No frames captured</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {video1KeyFrames.map((frame, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={frame.annotated || frame.original}
                            alt={`Video 1 Frame ${idx + 1}`}
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
                  <p className="text-sm font-medium">Video 2 Frames</p>
                  {video2KeyFrames.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No frames captured</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {video2KeyFrames.map((frame, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={frame.annotated || frame.original}
                            alt={`Video 2 Frame ${idx + 1}`}
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
