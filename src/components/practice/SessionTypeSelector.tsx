import { Card, CardContent } from '@/components/ui/card';
import { useSportTerminology } from '@/hooks/useSportTerminology';
import { Target, Flame, Users, Gamepad2, BarChart3, CircleDot, Swords, HeartPulse } from 'lucide-react';

const sessionTypes = [
  { id: 'personal_practice', label: 'Personal Practice', icon: Target, description: 'Solo skill work' },
  { id: 'team_practice', label: 'Team Practice', icon: Users, description: 'Organized team session' },
  { id: 'coach_lesson', label: 'Coach Lesson', icon: Flame, description: 'With instructor' },
  { id: 'game', label: 'Game', icon: Gamepad2, description: 'Competition' },
  { id: 'post_game_analysis', label: 'Post-Game Analysis', icon: BarChart3, description: 'Film & review' },
  { id: 'bullpen', label: 'Bullpen', icon: CircleDot, description: 'Mound/circle work' },
  { id: 'live_scrimmage', label: 'Live Scrimmage', icon: Swords, description: 'Intra-squad' },
  { id: 'rehab_session', label: 'Rehab Session', icon: HeartPulse, description: 'Recovery work' },
];

interface SessionTypeSelectorProps {
  value: string | null;
  onChange: (type: string) => void;
}

export function SessionTypeSelector({ value, onChange }: SessionTypeSelectorProps) {
  const { term } = useSportTerminology();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {sessionTypes.map(st => {
        const isSelected = value === st.id;
        const label = st.id === 'bullpen' ? term('sessionTypes', 'bullpen') : st.label;
        return (
          <Card
            key={st.id}
            className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
              isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent/50'
            }`}
            onClick={() => onChange(st.id)}
          >
            <CardContent className="flex flex-col items-center gap-2 py-4 px-3 text-center">
              <st.icon className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{st.description}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export { sessionTypes };
