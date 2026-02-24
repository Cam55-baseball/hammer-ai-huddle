import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAIPrompts } from '@/hooks/useAIPrompts';
import { Lightbulb, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AIPromptCard() {
  const { prompts, hasPrompts } = useAIPrompts();
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (!hasPrompts || dismissed) return null;

  const current = prompts[index % prompts.length];

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="pt-4 flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm">{current}</p>
          {prompts.length > 1 && (
            <div className="flex items-center gap-1 mt-2">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIndex(i => (i - 1 + prompts.length) % prompts.length)}>
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-xs text-muted-foreground">{(index % prompts.length) + 1}/{prompts.length}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIndex(i => (i + 1) % prompts.length)}>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setDismissed(true)}>
          <X className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
