import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const opponentLevels = [
  { value: 'rec', label: 'Recreational' },
  { value: 'travel', label: 'Travel' },
  { value: 'hs', label: 'High School' },
  { value: 'college', label: 'College' },
  { value: 'pro', label: 'Professional' },
];

interface GameSessionFieldsProps {
  opponentName: string;
  opponentLevel: string;
  onNameChange: (name: string) => void;
  onLevelChange: (level: string) => void;
}

export function GameSessionFields({ opponentName, opponentLevel, onNameChange, onLevelChange }: GameSessionFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Opponent Name <span className="text-destructive">*</span>
        </label>
        <Input
          placeholder="Enter opponent team name"
          value={opponentName}
          onChange={e => onNameChange(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Opponent Level <span className="text-destructive">*</span>
        </label>
        <Select value={opponentLevel} onValueChange={onLevelChange}>
          <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
          <SelectContent>
            {opponentLevels.map(l => (
              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
