import { useEffect, useRef } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Violation {
  timestamp: number;
  type: string;
  severity: 'critical' | 'major' | 'minor';
}

interface ViolationTimelineProps {
  violations: Violation[];
  videoDuration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  className?: string;
}

const violationConfig = {
  hands_passing_elbow: {
    label: 'Hands Passing Elbow',
    color: 'bg-red-500',
    icon: AlertTriangle
  },
  front_shoulder_opening: {
    label: 'Front Shoulder Opening',
    color: 'bg-red-500',
    icon: AlertTriangle
  },
  excessive_head_movement: {
    label: 'Excessive Head Movement',
    color: 'bg-orange-500',
    icon: AlertCircle
  },
  arm_angle_injury_risk: {
    label: 'Arm Angle Risk',
    color: 'bg-red-500',
    icon: AlertTriangle
  }
};

const severityColors = {
  critical: 'bg-red-500',
  major: 'bg-orange-500',
  minor: 'bg-yellow-500'
};

export const ViolationTimeline = ({ 
  violations, 
  videoDuration, 
  currentTime, 
  onSeek,
  className 
}: ViolationTimelineProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);

  // Scroll to current time marker
  useEffect(() => {
    if (timelineRef.current) {
      const progress = currentTime / videoDuration;
      const scrollPosition = progress * timelineRef.current.scrollWidth;
      timelineRef.current.scrollLeft = scrollPosition - timelineRef.current.clientWidth / 2;
    }
  }, [currentTime, videoDuration]);

  const handleSeek = (timestamp: number) => {
    onSeek(timestamp);
    
    // Haptic feedback on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  if (violations.length === 0) {
    return (
      <div className={cn("p-4 bg-muted/30 rounded-lg text-center", className)}>
        <Info className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No violations detected. Great form!
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Detected Issues</h4>
        <Badge variant="outline">{violations.length} total</Badge>
      </div>

      {/* Timeline scrubber */}
      <div 
        ref={timelineRef}
        className="relative h-16 bg-muted/30 rounded-lg overflow-x-auto overflow-y-hidden"
      >
        <div className="relative h-full min-w-full" style={{ width: `${Math.max(100, videoDuration * 50)}px` }}>
          {/* Current time indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-20"
            style={{ left: `${(currentTime / videoDuration) * 100}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background"></div>
          </div>

          {/* Violation markers */}
          {violations.map((violation, index) => {
            const config = violationConfig[violation.type as keyof typeof violationConfig];
            const Icon = config?.icon || AlertCircle;
            const position = (violation.timestamp / videoDuration) * 100;

            return (
              <button
                key={index}
                onClick={() => handleSeek(violation.timestamp)}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full",
                  "flex items-center justify-center transition-transform hover:scale-125",
                  "border-2 border-background shadow-lg cursor-pointer",
                  config?.color || severityColors[violation.severity]
                )}
                style={{ left: `${position}%` }}
                title={`${config?.label || violation.type} at ${violation.timestamp.toFixed(1)}s`}
              >
                <Icon className="h-4 w-4 text-white" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Violation list */}
      <div className="max-h-40 overflow-y-auto space-y-2">
        {violations.map((violation, index) => {
          const config = violationConfig[violation.type as keyof typeof violationConfig];
          const Icon = config?.icon || AlertCircle;

          return (
            <button
              key={index}
              onClick={() => handleSeek(violation.timestamp)}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg border",
                "hover:bg-muted/50 transition-colors text-left"
              )}
            >
              <div className={cn("p-1.5 rounded-full", config?.color || severityColors[violation.severity])}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {config?.label || violation.type}
                </p>
                <p className="text-xs text-muted-foreground">
                  at {violation.timestamp.toFixed(1)}s
                </p>
              </div>
              <Badge variant="outline" className="capitalize">
                {violation.severity}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
};