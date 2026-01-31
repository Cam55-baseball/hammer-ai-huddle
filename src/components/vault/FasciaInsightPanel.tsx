import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Sparkles, Trophy, BookOpen, Link2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { getBodyAreaLabel } from './quiz/body-maps/bodyAreaDefinitions';
import { 
  getFasciaConnection, 
  getConnectedAreas,
  type BodyConnectionInfo 
} from './quiz/body-maps/fasciaConnectionMappings';
import { BodyConnectionDisclaimer } from './BodyConnectionDisclaimer';

interface FasciaInsightPanelProps {
  areaId: string;
  className?: string;
  defaultOpen?: boolean;
}

/**
 * Collapsible panel showing fascia/body connection insights for a selected pain area.
 * Uses kid-friendly language based on elite fascia research (Myers, Schleip, Stecco).
 */
export function FasciaInsightPanel({ 
  areaId, 
  className,
  defaultOpen = false 
}: FasciaInsightPanelProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const connection = getFasciaConnection(areaId);
  
  if (!connection) {
    return null;
  }

  const connectedAreaLabels = getConnectedAreas(areaId)
    .slice(0, 4)
    .map(id => getBodyAreaLabel(id));

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("w-full", className)}
    >
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/15 transition-colors text-left">
        <Sparkles className="h-4 w-4 text-purple-400 flex-shrink-0" />
        <span className="text-xs font-medium text-purple-300 flex-1">
          {t('fascia.bodyConnection.title', 'Body Connection Insight')}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 text-purple-400 transition-transform",
          isOpen && "rotate-180"
        )} />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2">
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-3 space-y-3">
          {/* Body Line Info */}
          <div className="flex items-start gap-2">
            <span className="text-lg">{connection.primaryLine.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-purple-300">
                {t('fascia.onBodyLine', 'This is on your "{{lineName}}"', {
                  lineName: t(`fascia.bodyLine.${connection.primaryLine.id.toLowerCase()}`, connection.primaryLine.kidName)
                })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {connection.kidInsight}
              </p>
            </div>
          </div>

          {/* Connected Areas */}
          {connectedAreaLabels.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Link2 className="h-3 w-3" />
                {t('fascia.connectedSpots', 'Connected Spots')}:
              </div>
              <div className="flex flex-wrap gap-1">
                {connectedAreaLabels.map((label, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full text-[10px] font-medium"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pro Tip */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
            <div className="flex items-start gap-2">
              <Trophy className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-400">
                  {t('fascia.proTip', 'Pro Tip')}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {connection.proTip}
                </p>
              </div>
            </div>
          </div>

          {/* Research Attribution */}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
            <BookOpen className="h-3 w-3" />
            <span>
              {t('fascia.research.attribution', 'Based on research by {{sources}}', {
                sources: connection.researchSource
              })}
            </span>
          </div>

          {/* Disclaimer */}
          <BodyConnectionDisclaimer variant="compact" />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface FasciaInsightSummaryProps {
  areaIds: string[];
  className?: string;
}

/**
 * Summary panel showing fascia insights for multiple selected pain areas.
 */
export function FasciaInsightSummary({ areaIds, className }: FasciaInsightSummaryProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  if (areaIds.length === 0) return null;

  // Find the dominant body line
  const lineFrequency: Record<string, { line: any; count: number }> = {};
  areaIds.forEach(areaId => {
    const connection = getFasciaConnection(areaId);
    if (connection) {
      const lineId = connection.primaryLine.id;
      if (!lineFrequency[lineId]) {
        lineFrequency[lineId] = { line: connection.primaryLine, count: 0 };
      }
      lineFrequency[lineId].count++;
    }
  });

  const sorted = Object.values(lineFrequency).sort((a, b) => b.count - a.count);
  const dominantLine = sorted[0]?.line;
  const hasDominantPattern = sorted[0]?.count >= 2;

  if (!dominantLine) return null;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("w-full", className)}
    >
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2.5 rounded-lg bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 hover:from-purple-500/15 hover:to-indigo-500/15 transition-colors text-left">
        <span className="text-lg">{dominantLine.emoji}</span>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-purple-300">
            {t('fascia.bodyConnection.title', 'Body Connection Insight')}
          </span>
          {hasDominantPattern && (
            <p className="text-[10px] text-muted-foreground truncate">
              {t('fascia.patternDetected', 'Pattern detected on {{lineName}}', {
                lineName: t(`fascia.bodyLine.${dominantLine.id.toLowerCase()}`, dominantLine.kidName)
              })}
            </p>
          )}
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-purple-400 transition-transform flex-shrink-0",
          isOpen && "rotate-180"
        )} />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2">
        <div className="space-y-2">
          {areaIds.slice(0, 3).map(areaId => (
            <FasciaInsightPanel 
              key={areaId} 
              areaId={areaId} 
              defaultOpen={false}
            />
          ))}
          
          {areaIds.length > 3 && (
            <p className="text-xs text-muted-foreground text-center py-1">
              +{areaIds.length - 3} {t('common.more', 'more')}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
