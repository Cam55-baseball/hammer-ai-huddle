import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Pencil, Ruler, Circle, Minus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const ANALYZABLE_MODULES = ['hitting', 'pitching', 'throwing', 'fielding', 'catching'];
const THROW_MECHANICS_MODULES = ['fielding', 'catching'];

interface RepVideoAnalysisProps {
  videoUrl: string;
  module: string;
  repIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveAnnotations?: (annotations: AnnotationData[]) => void;
  existingAnnotations?: AnnotationData[];
  readOnly?: boolean;
}

export interface AnnotationData {
  id: string;
  type: 'line' | 'circle' | 'freehand' | 'angle' | 'marker';
  label?: string;
  timestamp_sec: number;
  points: { x: number; y: number }[];
  color: string;
}

type DrawTool = 'line' | 'circle' | 'freehand' | 'angle' | 'marker' | null;

export function isAnalyzableModule(module: string): boolean {
  return ANALYZABLE_MODULES.includes(module);
}

export function RepVideoAnalysis({
  videoUrl,
  module,
  repIndex,
  open,
  onOpenChange,
  onSaveAnnotations,
  existingAnnotations = [],
  readOnly = false,
}: RepVideoAnalysisProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTool, setActiveTool] = useState<DrawTool>(null);
  const [annotations, setAnnotations] = useState<AnnotationData[]>(existingAnnotations);
  const [drawColor, setDrawColor] = useState('#ef4444');

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const stepFrame = useCallback((direction: -1 | 1) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + direction * (1 / 30)));
  }, [duration]);

  const handleSave = useCallback(() => {
    onSaveAnnotations?.(annotations);
    onOpenChange(false);
  }, [annotations, onSaveAnnotations, onOpenChange]);

  const tools: { tool: DrawTool; icon: React.ReactNode; label: string }[] = [
    { tool: 'line', icon: <Minus className="h-4 w-4" />, label: 'Line' },
    { tool: 'circle', icon: <Circle className="h-4 w-4" />, label: 'Circle' },
    { tool: 'freehand', icon: <Pencil className="h-4 w-4" />, label: 'Draw' },
    { tool: 'angle', icon: <Ruler className="h-4 w-4" />, label: 'Angle' },
  ];

  const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {THROW_MECHANICS_MODULES.includes(module) ? 'Analyze Throw Mechanics' : 'Analyze'} — Rep #{repIndex + 1}
            <Badge variant="secondary" className="text-xs capitalize">{module}</Badge>
          </DialogTitle>
          <p className="text-[11px] text-muted-foreground mt-1">
            Max clip size 2 GB. If your video fails to load or upload, it's likely too large — try a shorter clip or compress the file and try again.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          {/* Video with overlay canvas */}
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full max-h-[400px] object-contain"
              playsInline
              onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
              onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
              onEnded={() => setIsPlaying(false)}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-auto"
              style={{ pointerEvents: activeTool ? 'auto' : 'none' }}
            />
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => stepFrame(-1)} className="h-8 w-8">
              <SkipBack className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon" onClick={togglePlay} className="h-8 w-8">
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => stepFrame(1)} className="h-8 w-8">
              <SkipForward className="h-3.5 w-3.5" />
            </Button>

            <div className="flex-1 px-2">
              <Slider
                value={[currentTime]}
                min={0}
                max={duration || 1}
                step={0.033}
                onValueChange={([v]) => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = v;
                    setCurrentTime(v);
                  }
                }}
              />
            </div>

            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
            </span>
          </div>

          {/* Drawing tools */}
          {!readOnly && (
            <div className="flex items-center gap-2 flex-wrap">
              {tools.map(t => (
                <Button
                  key={t.tool}
                  variant={activeTool === t.tool ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTool(activeTool === t.tool ? null : t.tool)}
                  className="gap-1 text-xs"
                >
                  {t.icon}
                  {t.label}
                </Button>
              ))}

              <div className="flex gap-1 ml-2">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setDrawColor(c)}
                    className={cn(
                      'w-5 h-5 rounded-full border-2 transition-all',
                      drawColor === c ? 'border-foreground scale-125' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAnnotations([])}
                className="ml-auto gap-1 text-xs text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          )}

          {/* Annotation markers */}
          {annotations.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {annotations.map((a, i) => (
                <Badge key={a.id} variant="outline" className="text-[10px]">
                  {a.type} @ {a.timestamp_sec.toFixed(1)}s
                  {a.label && ` — ${a.label}`}
                </Badge>
              ))}
            </div>
          )}

          {/* Save */}
          {!readOnly && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save Analysis</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
