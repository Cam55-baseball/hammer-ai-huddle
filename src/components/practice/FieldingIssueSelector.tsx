import { cn } from '@/lib/utils';

const FIELDING_ISSUES = [
  { id: 'late_transfer', label: 'Late Transfer' },
  { id: 'bad_footwork', label: 'Bad Footwork' },
  { id: 'bobble', label: 'Bobble' },
  { id: 'offline_throw', label: 'Offline Throw' },
  { id: 'booted_ground_ball', label: 'Booted Ground Ball' },
  { id: 'bad_footwork_angle', label: 'Bad Footwork Angle' },
  { id: 'dropped_ball', label: 'Dropped Ball' },
  { id: 'slow_reaction', label: 'Slow Reaction' },
];

interface FieldingIssueSelectorProps {
  selected: string[];
  onChange: (issues: string[]) => void;
}

export function FieldingIssueSelector({ selected, onChange }: FieldingIssueSelectorProps) {
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id],
    );
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Fielding Issues Detected</label>
      <div className="flex flex-wrap gap-2">
        {FIELDING_ISSUES.map((issue) => (
          <button
            key={issue.id}
            type="button"
            onClick={() => toggle(issue.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              selected.includes(issue.id)
                ? 'bg-destructive text-destructive-foreground border-destructive'
                : 'bg-muted text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {issue.label}
          </button>
        ))}
      </div>
    </div>
  );
}
