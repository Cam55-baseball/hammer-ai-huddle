import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Target, Dumbbell, ListOrdered, MessageCircle } from 'lucide-react';

interface SavedDrill {
  id: string;
  drill_name: string;
  drill_description: string | null;
  module_origin: string;
  sport: string;
  saved_at: string;
}

interface DrillDetailDialogProps {
  drill: SavedDrill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedDrill {
  purpose: string;
  steps: string[];
  repsSets: string;
  equipment: string;
  coachingCues: string[];
}

function parseDrillDescription(description: string): ParsedDrill {
  const result: ParsedDrill = {
    purpose: '',
    steps: [],
    repsSets: '',
    equipment: '',
    coachingCues: [],
  };

  // Split by common section markers
  const sections = description.split(/(?=Purpose:|Steps:|Reps\/Sets:|Equipment:|Coaching Cues:)/i);

  for (const section of sections) {
    const trimmed = section.trim();
    
    if (trimmed.toLowerCase().startsWith('purpose:')) {
      result.purpose = trimmed.replace(/^purpose:\s*/i, '').trim();
    } else if (trimmed.toLowerCase().startsWith('steps:')) {
      const stepsText = trimmed.replace(/^steps:\s*/i, '').trim();
      // Split by numbered items or newlines
      result.steps = stepsText
        .split(/\n|(?=\d+[\.\)])/g)
        .map(s => s.replace(/^\d+[\.\)]\s*/, '').trim())
        .filter(s => s.length > 0);
    } else if (trimmed.toLowerCase().startsWith('reps/sets:')) {
      result.repsSets = trimmed.replace(/^reps\/sets:\s*/i, '').trim();
    } else if (trimmed.toLowerCase().startsWith('equipment:')) {
      result.equipment = trimmed.replace(/^equipment:\s*/i, '').trim();
    } else if (trimmed.toLowerCase().startsWith('coaching cues:')) {
      const cuesText = trimmed.replace(/^coaching cues:\s*/i, '').trim();
      // Split by commas, semicolons, or newlines
      result.coachingCues = cuesText
        .split(/[,;\n]+/)
        .map(c => c.trim())
        .filter(c => c.length > 0);
    } else if (!result.purpose && trimmed.length > 0) {
      // If no purpose found yet and this is untagged text, use as purpose
      result.purpose = trimmed;
    }
  }

  return result;
}

export function DrillDetailDialog({ drill, open, onOpenChange }: DrillDetailDialogProps) {
  const { t } = useTranslation();

  if (!drill) return null;

  const parsed = drill.drill_description 
    ? parseDrillDescription(drill.drill_description)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-lg p-4 sm:p-6 overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            {drill.drill_name}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-2">
            {/* Module and Sport badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{drill.module_origin}</Badge>
              <Badge variant="secondary">{drill.sport}</Badge>
            </div>

            {parsed ? (
              <>
                {/* Purpose */}
                {parsed.purpose && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      {t('vault.drills.purpose')}
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {parsed.purpose}
                    </p>
                  </div>
                )}

                {/* Steps */}
                {parsed.steps.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                      <ListOrdered className="h-4 w-4" />
                      {t('vault.drills.steps')}
                    </h4>
                    <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
                      {parsed.steps.map((step, index) => (
                        <li key={index} className="leading-relaxed">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Reps/Sets and Equipment */}
                {(parsed.repsSets || parsed.equipment) && (
                  <div className="flex flex-wrap gap-2">
                    {parsed.repsSets && (
                      <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30">
                        <Dumbbell className="h-3 w-3 mr-1" />
                        {t('vault.drills.repsSets')}: {parsed.repsSets}
                      </Badge>
                    )}
                    {parsed.equipment && (
                      <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30">
                        {t('vault.drills.equipment')}: {parsed.equipment}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Coaching Cues */}
                {parsed.coachingCues.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      {t('vault.drills.coachingCues')}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {parsed.coachingCues.map((cue, index) => (
                        <Badge 
                          key={index} 
                          variant="outline"
                          className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30"
                        >
                          {cue}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {t('vault.drills.noDetails')}
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
