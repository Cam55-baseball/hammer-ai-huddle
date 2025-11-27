import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  const [isListCollapsed, setIsListCollapsed] = useState(false);

  // Calculate severity counts
  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  const majorCount = violations.filter(v => v.severity === 'major').length;
  const minorCount = violations.filter(v => v.severity === 'minor').length;

  // Format timestamp as MM:SS
  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

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
      {/* Header with severity summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <h4 className="text-sm font-medium">Detected Issues</h4>
        <div className="flex items-center gap-2 flex-wrap">
          {criticalCount > 0 && (
            <Badge variant="outline" className="bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400">
              🔴 {criticalCount} critical
            </Badge>
          )}
          {majorCount > 0 && (
            <Badge variant="outline" className="bg-orange-500/10 border-orange-500/20 text-orange-700 dark:text-orange-400">
              🟠 {majorCount} major
            </Badge>
          )}
          {minorCount > 0 && (
            <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400">
              🟡 {minorCount} minor
            </Badge>
          )}
        </div>
      </div>

      {/* Color Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          Critical
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-orange-500" />
          Major
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          Minor
        </span>
      </div>

      {/* Timeline scrubber */}
      <div 
        ref={timelineRef}
        className="relative h-16 bg-muted/30 rounded-lg overflow-x-auto overflow-y-hidden touch-pan-x"
      >
        <div className="relative h-full min-w-full" style={{ width: `${Math.max(100, videoDuration * 50)}px` }}>
          {/* Current time indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 transition-all duration-100"
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
                  "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 min-w-[44px] min-h-[44px] w-10 h-10 sm:w-8 sm:h-8 rounded-full",
                  "flex items-center justify-center transition-all hover:scale-125 active:scale-110",
                  "border-2 border-background shadow-lg cursor-pointer animate-pulse hover:animate-none",
                  config?.color || severityColors[violation.severity]
                )}
                style={{ left: `${position}%` }}
                title={`${config?.label || violation.type} at ${formatTimestamp(violation.timestamp)}`}
              >
                <Icon className="h-4 w-4 text-white" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Violation list with collapse toggle on mobile */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsListCollapsed(!isListCollapsed)}
          className="w-full sm:hidden flex items-center justify-between"
        >
          <span className="text-sm">View Details</span>
          {isListCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
        
        <div className={cn(
          "max-h-40 overflow-y-auto space-y-2",
          "sm:block", // Always show on desktop
          isListCollapsed ? "hidden" : "block" // Toggle on mobile
        )}>
          {violations.map((violation, index) => {
            const config = violationConfig[violation.type as keyof typeof violationConfig];
            const Icon = config?.icon || AlertCircle;

            return (
              <button
                key={index}
                onClick={() => handleSeek(violation.timestamp)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 sm:p-2 rounded-lg border min-h-[60px] sm:min-h-0",
                  "hover:bg-muted/50 active:bg-muted transition-colors text-left touch-manipulation"
                )}
              >
                <div className={cn("p-2 sm:p-1.5 rounded-full", config?.color || severityColors[violation.severity])}>
                  <Icon className="h-5 w-5 sm:h-4 sm:w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {config?.label || violation.type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    at {formatTimestamp(violation.timestamp)}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize text-xs">
                  {violation.severity}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};