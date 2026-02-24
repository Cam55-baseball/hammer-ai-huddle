import { Badge } from '@/components/ui/badge';
import type { OutcomeTag } from '@/data/baseball/outcomeTags';

interface OutcomeTagBubblesProps {
  outcomes: OutcomeTag[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function OutcomeTagBubbles({ outcomes, selected, onChange }: OutcomeTagBubblesProps) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const colorMap: Record<string, string> = {
    green: 'bg-green-500/10 text-green-700 border-green-500/30 hover:bg-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30 hover:bg-yellow-500/20',
    red: 'bg-red-500/10 text-red-700 border-red-500/30 hover:bg-red-500/20',
  };

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-2 block">Outcomes</label>
      <div className="flex flex-wrap gap-2">
        {outcomes.map(tag => {
          const isSelected = selected.includes(tag.id);
          return (
            <Badge
              key={tag.id}
              variant="outline"
              className={`cursor-pointer transition-all hover:scale-105 ${
                isSelected ? 'ring-2 ring-primary ' + colorMap[tag.color] : colorMap[tag.color]
              }`}
              onClick={() => toggle(tag.id)}
            >
              {tag.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
