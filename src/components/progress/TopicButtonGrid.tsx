/**
 * TopicButtonGrid — ranked topic shortcut tiles. Clicking scrolls to
 * the matching TopicPanel and opens it.
 */
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import type { ProgressTopicId } from "@/lib/progress/rankProgressTopics";

export interface TopicTile {
  readonly id: ProgressTopicId;
  readonly title: string;
  readonly tagline: string;
  readonly icon: LucideIcon;
  readonly available: boolean;
}

interface Props {
  readonly tiles: ReadonlyArray<TopicTile>;
  readonly onSelect: (id: ProgressTopicId) => void;
}

export function TopicButtonGrid({ tiles, onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {tiles.map((t, idx) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className="text-left"
          >
            <Card
              className={`h-full p-3 transition-all hover:shadow-md hover:border-primary/40 ${
                t.available ? "border-primary/20" : "border-border opacity-70"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  #{idx + 1}
                </span>
              </div>
              <h3 className="text-sm font-semibold leading-tight">{t.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                {t.available ? t.tagline : "Not enough data yet."}
              </p>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
