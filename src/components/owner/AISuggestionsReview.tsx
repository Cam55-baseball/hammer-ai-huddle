import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Sparkles, Loader2, Zap } from 'lucide-react';
import {
  usePendingTagSuggestions,
  usePendingRuleSuggestions,
  useSuggestionActions,
} from '@/hooks/useVideoTagSuggestions';

export function AISuggestionsReview() {
  const { data: tagSugg = [], isLoading: lT } = usePendingTagSuggestions();
  const { data: ruleSugg = [], isLoading: lR } = usePendingRuleSuggestions();
  const { approveTag, rejectTag, approveRule, rejectRule, bulkApproveTags } = useSuggestionActions();

  const confColor = (c: number) =>
    c >= 0.8 ? 'bg-green-500/10 text-green-600 border-green-500/30'
      : c >= 0.5 ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
      : 'bg-muted text-muted-foreground';

  return (
    <Tabs defaultValue="tags">
      <div className="flex items-center justify-between mb-3">
        <TabsList>
          <TabsTrigger value="tags">Tag Suggestions ({tagSugg.length})</TabsTrigger>
          <TabsTrigger value="rules">Rule Suggestions ({ruleSugg.length})</TabsTrigger>
        </TabsList>
        {tagSugg.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => bulkApproveTags(tagSugg, 0.8)}>
            <Zap className="h-3.5 w-3.5 mr-1" /> Approve high-confidence
          </Button>
        )}
      </div>

      <TabsContent value="tags" className="space-y-2">
        {lT ? (
          <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : tagSugg.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">
            <Sparkles className="h-6 w-6 mx-auto mb-2" />
            No pending tag suggestions. Trigger Hammer analysis on a video to generate proposals.
          </Card>
        ) : (
          tagSugg.map(s => (
            <Card key={s.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground truncate max-w-[180px]">{s.video_title}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{s.layer.replace('_', ' ')}</Badge>
                    <Badge className="text-[10px] font-mono">{s.suggested_key}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${confColor(s.confidence)}`}>
                      {Math.round(s.confidence * 100)}%
                    </Badge>
                  </div>
                  {s.reasoning && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.reasoning}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => approveTag(s)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => rejectTag(s)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </TabsContent>

      <TabsContent value="rules" className="space-y-2">
        {lR ? (
          <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : ruleSugg.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-sm">
            <Sparkles className="h-6 w-6 mx-auto mb-2" />
            No pending rule suggestions. Pattern discovery runs nightly.
          </Card>
        ) : (
          ruleSugg.map(s => (
            <Card key={s.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] capitalize">{s.skill_domain}</Badge>
                    <Badge className="text-[10px] font-mono">{s.movement_key}</Badge>
                    {s.result_key && <Badge variant="outline" className="text-[10px] font-mono">+ {s.result_key}</Badge>}
                    <span className="text-xs">→</span>
                    <Badge className="text-[10px] font-mono bg-primary/20 text-primary">{s.correction_key}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${confColor(s.confidence)}`}>
                      {Math.round(s.confidence * 100)}%
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {s.sample_size} samples · avg improvement {s.avg_improvement.toFixed(1)} pts
                  </p>
                  {s.reasoning && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.reasoning}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => approveRule(s)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => rejectRule(s)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
