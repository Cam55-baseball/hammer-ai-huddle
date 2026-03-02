import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import type { SessionConfig } from './SessionConfigPanel';

interface SessionConfigBarProps {
  config: SessionConfig;
  onEdit: () => void;
}

const repSourceLabels: Record<string, string> = {
  machine_bp: 'Machine BP',
  flip: 'Flip',
  live_bp: 'Live BP',
  regular_bp: 'Regular BP',
  game: 'Game',
  tee: 'Tee',
  front_toss: 'Front Toss',
  coach_pitch: 'Coach Pitch',
  soft_toss: 'Soft Toss',
  bullpen: 'Bullpen',
  flat_ground: 'Flat Ground',
  fungo: 'Fungo',
  live: 'Live',
  drill: 'Drill',
  bullpen_receive: 'Bullpen Receive',
  other: 'Other',
};

export function SessionConfigBar({ config, onEdit }: SessionConfigBarProps) {
  const coachLabel = config.coach_session_type === 'solo'
    ? 'Solo'
    : config.coach_session_type === 'lesson'
      ? 'Lesson'
      : 'Coach-Led';

  return (
    <div className="flex items-center gap-2 flex-wrap bg-muted/30 rounded-lg border px-3 py-2">
      <Badge variant="outline" className="text-[10px]">
        {repSourceLabels[config.rep_source] ?? config.rep_source}
      </Badge>
      <Badge variant="outline" className="text-[10px]">
        {config.pitch_distance_ft} ft
      </Badge>
      {config.velocity_band && (
        <Badge variant="outline" className="text-[10px]">
          {config.velocity_band}
        </Badge>
      )}
      <Badge variant="outline" className="text-[10px]">
        {config.season_context.replace(/_/g, ' ')}
      </Badge>
      <Badge variant="outline" className="text-[10px]">
        {coachLabel}
      </Badge>
      <Badge variant="outline" className="text-[10px] capitalize">
        {config.indoor_outdoor}
      </Badge>
      <Button variant="ghost" size="sm" className="h-6 px-1.5 ml-auto" onClick={onEdit}>
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  );
}
