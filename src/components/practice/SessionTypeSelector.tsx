import { Card, CardContent } from '@/components/ui/card';
import { Target, Users, Flame, Gamepad2, Swords } from 'lucide-react';

const sessionTypes = [
  { id: 'solo_work', label: 'Solo Work', icon: Target, description: 'Self-directed skill work' },
  { id: 'team_session', label: 'Team Session', icon: Users, description: 'Organized team training' },
  { id: 'lesson', label: 'Lesson', icon: Flame, description: '1-on-1 or small group instruction' },
  { id: 'game', label: 'Game', icon: Gamepad2, description: 'Competition' },
  { id: 'live_abs', label: 'Live At-Bats', icon: Swords, description: 'Intra-squad or simulated game reps' },
];

interface SessionTypeSelectorProps {
  value: string | null;
  onChange: (type: string) => void;
}

export function SessionTypeSelector({ value, onChange }: SessionTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {sessionTypes.map(st => {
        const isSelected = value === st.id;
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
              <span className="text-sm font-medium">{st.label}</span>
              <span className="text-xs text-muted-foreground">{st.description}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export { sessionTypes };
