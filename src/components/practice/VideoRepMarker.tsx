import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Play, Pause, SkipBack, SkipForward, Flag, Clock } from 'lucide-react';
import type { ScoredRep } from './RepScorer';

export interface RepMarker {
  rep_index: number;
  start_time_sec: number;
  end_time_sec: number | null;
  locked: boolean;
}

interface VideoRepMarkerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  markers: RepMarker[];
  onMarkersChange: (markers: RepMarker[]) => void;
  duration: number;
  currentTime: number;
}

export function VideoRepMarker({ videoRef, markers, onMarkersChange, duration, currentTime }: VideoRepMarkerProps) {
  const [activeMarkerIndex, setActiveMarkerIndex] = useState<number | null>(null);

  const handleMarkStart = useCallback(() => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    const newMarker: RepMarker = {
      rep_index: markers.length,
      start_time_sec: time,
      end_time_sec: null,
      locked: false,
    };
    onMarkersChange([...markers, newMarker]);
    setActiveMarkerIndex(markers.length);
  }, [markers, onMarkersChange, videoRef]);

  const handleMarkEnd = useCallback(() => {
    if (!videoRef.current || activeMarkerIndex === null) return;
    const time = videoRef.current.currentTime;
    const updated = markers.map((m, i) =>
      i === activeMarkerIndex ? { ...m, end_time_sec: time } : m
    );
    onMarkersChange(updated);
    setActiveMarkerIndex(null);
  }, [markers, activeMarkerIndex, onMarkersChange, videoRef]);

  const jumpToMarker = useCallback((marker: RepMarker) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = marker.start_time_sec;
  }, [videoRef]);

  const removeMarker = useCallback((index: number) => {
    const updated = markers.filter((_, i) => i !== index).map((m, i) => ({ ...m, rep_index: i }));
    onMarkersChange(updated);
    if (activeMarkerIndex === index) setActiveMarkerIndex(null);
  }, [markers, onMarkersChange, activeMarkerIndex]);

  return (
    <div className="space-y-2">
      {/* Timeline bar */}
      {duration > 0 && (
        <div className="relative h-6 bg-muted/30 rounded border border-border overflow-hidden">
          {/* Current time indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
          {/* Rep markers */}
          {markers.map((m, i) => {
            const left = (m.start_time_sec / duration) * 100;
            const width = m.end_time_sec ? ((m.end_time_sec - m.start_time_sec) / duration) * 100 : 1;
            return (
              <button
                key={i}
                onClick={() => jumpToMarker(m)}
                className={cn(
                  'absolute top-0.5 bottom-0.5 rounded-sm transition-colors',
                  m.locked ? 'bg-primary/40' : 'bg-primary/25 hover:bg-primary/40',
                  activeMarkerIndex === i && 'ring-1 ring-primary'
                )}
                style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
                title={`Rep #${i + 1}`}
              />
            );
          })}
        </div>
      )}

      {/* Mark controls */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleMarkStart}
          disabled={activeMarkerIndex !== null}
          className="text-xs gap-1"
        >
          <Flag className="h-3 w-3" />
          Mark Start
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleMarkEnd}
          disabled={activeMarkerIndex === null}
          className="text-xs gap-1"
        >
          <Clock className="h-3 w-3" />
          Mark End
        </Button>
      </div>

      {/* Marker list */}
      {markers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {markers.map((m, i) => (
            <Badge
              key={i}
              variant={m.end_time_sec ? 'secondary' : 'outline'}
              className={cn(
                'cursor-pointer text-[10px] gap-1',
                activeMarkerIndex === i && 'ring-1 ring-primary'
              )}
              onClick={() => jumpToMarker(m)}
            >
              #{i + 1} {m.start_time_sec.toFixed(1)}s
              {m.end_time_sec && ` → ${m.end_time_sec.toFixed(1)}s`}
              {!m.locked && (
                <button
                  onClick={e => { e.stopPropagation(); removeMarker(i); }}
                  className="ml-0.5 text-destructive hover:text-destructive/80"
                >
                  ×
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
