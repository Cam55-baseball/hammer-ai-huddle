import { useNNSuggestions, type NNSuggestion } from '@/hooks/useNNSuggestions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Surfaces high-confidence NN suggestions backed by 14-day behavior.
 * Renders nothing when there are no active suggestions.
 */
export function NNSuggestionPanel() {
  const { suggestions, loading, accept, dismiss } = useNNSuggestions();

  if (loading || suggestions.length === 0) return null;

  return (
    <Card className="border-2 border-red-500/20 bg-gradient-to-br from-red-500/5 to-amber-500/5">
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-red-500/15 p-2">
            <Sparkles className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-black uppercase tracking-wider">
              Suggested Standards
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Based on your recent behavior, these are already part of your identity.
            </p>
          </div>
        </div>

        <ul className="space-y-2">
          {suggestions.map((s) => (
            <SuggestionRow key={s.id} s={s} onAccept={() => accept(s)} onDismiss={() => dismiss(s)} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

interface RowProps {
  s: NNSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}

function SuggestionRow({ s, onAccept, onDismiss }: RowProps) {
  const highPriority = s.score >= 0.9;
  const title = s.template?.display_nickname || s.template?.title || 'Activity';
  const accent = s.template?.color || (highPriority ? '#ef4444' : '#f59e0b');

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-xl border-2 bg-background/60 p-3 transition-all',
        highPriority
          ? 'border-red-500/40 ring-1 ring-red-500/40 scale-[1.02] shadow-[0_0_24px_-8px_rgba(239,68,68,0.5)]'
          : 'border-border/60'
      )}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accent}26`, color: accent }}
      >
        <Flame className={cn('h-5 w-5', highPriority && 'fill-red-500/40')} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-sm truncate">{title}</p>
          <span
            className={cn(
              'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider border',
              highPriority
                ? 'bg-red-500/15 text-red-400 border-red-500/40'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            )}
          >
            {highPriority ? 'Lock this in' : 'Ready to lock'}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span>{s.total_completions_14d} of last 14 days</span>
          {s.consistency_streak > 0 && (
            <>
              <span className="opacity-50">·</span>
              <span className="font-bold text-foreground/80">
                {s.consistency_streak}-day streak
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          onClick={onAccept}
          className={cn(
            'h-8 text-[11px] font-black uppercase tracking-wider',
            highPriority
              ? 'bg-red-600 hover:bg-red-600/90 text-white'
              : 'bg-foreground text-background hover:bg-foreground/90'
          )}
        >
          Make Non-Negotiable
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDismiss}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Not now"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
