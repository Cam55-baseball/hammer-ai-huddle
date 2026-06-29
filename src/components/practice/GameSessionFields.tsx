import { Input } from '@/components/ui/input';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { CompetitionLevelPicker } from '@/components/shared/CompetitionLevelPicker';

interface GameSessionFieldsProps {
  opponentName: string;
  opponentLevel: string;
  onNameChange: (name: string) => void;
  onLevelChange: (level: string) => void;
}

/**
 * GameSessionFields — practice-session opponent picker. Uses the unified
 * competition-level catalog so the same level keys persist as everywhere
 * else (onboarding, Tell Hammer, Game Setup).
 */
export function GameSessionFields({ opponentName, opponentLevel, onNameChange, onLevelChange }: GameSessionFieldsProps) {
  const { sport } = useSportTheme();
  return (
    <div className="space-y-3">
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
        <CompetitionLevelPicker
          sport={sport}
          value={opponentLevel}
          onChange={onLevelChange}
          mode="quick"
        />
      </div>
    </div>
  );
}
