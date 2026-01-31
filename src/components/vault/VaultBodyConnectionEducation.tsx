import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, BookOpen, Trophy, Sparkles } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { BODY_LINES } from './quiz/body-maps/fasciaConnectionMappings';
import { BodyConnectionDisclaimer } from './BodyConnectionDisclaimer';

interface VaultBodyConnectionEducationProps {
  className?: string;
  defaultOpen?: boolean;
}

/**
 * Educational card explaining fascia and body connections for young athletes.
 * Uses kid-friendly language and analogies (spider web, train tracks, bedsheet).
 * Based on research from Myers, Schleip, Stecco, and the International Fascia Research Congress.
 */
export function VaultBodyConnectionEducation({ 
  className,
  defaultOpen = false 
}: VaultBodyConnectionEducationProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const bodyLines = [
    { ...BODY_LINES.SBL, translationKey: 'backTrack' },
    { ...BODY_LINES.SFL, translationKey: 'frontTrack' },
    { ...BODY_LINES.LL, translationKey: 'sideTrack' },
    { ...BODY_LINES.ARM, translationKey: 'armTrack' },
    { ...BODY_LINES.DFL, translationKey: 'coreTrack' },
  ];

  return (
    <Card className={cn("bg-gradient-to-br from-purple-500/5 to-indigo-500/5 border-purple-500/20", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <CardContent className="p-4 flex items-center gap-3 cursor-pointer hover:bg-purple-500/5 transition-colors">
            <div className="p-2 rounded-xl bg-purple-500/20">
              <Sparkles className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-bold text-foreground">
                🕸️ {t('fascia.education.title', 'How Your Body Connects')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t('fascia.education.subtitle', 'Tap to learn like a pro!')}
              </p>
            </div>
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )} />
          </CardContent>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="px-4 pb-4 pt-0 space-y-4">
            {/* Introduction */}
            <div className="space-y-2">
              <p className="text-sm text-foreground">
                {t('fascia.education.webAnalogy', 
                  'Did you know your body has an invisible web inside?'
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('fascia.education.whatIsFascia', 
                  "It's called fascia (fash-ee-uh), and it wraps around every muscle like a stretchy suit."
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('fascia.education.sheetAnalogy', 
                  "When one part gets tight, it can pull on other parts - kind of like when you pull one corner of a bedsheet and the whole thing moves!"
                )}
              </p>
            </div>

            {/* Body Lines */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <span>🚂</span>
                {t('fascia.education.mainTracksTitle', 'The Main "Body Tracks"')}
              </h4>
              
              <div className="space-y-2">
                {bodyLines.map((line) => (
                  <div 
                    key={line.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-background/50"
                  >
                    <span className="text-base flex-shrink-0">{line.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium" style={{ color: line.color }}>
                        {t(`fascia.bodyLine.${line.translationKey}`, line.kidName)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {line.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Why Pros Care */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <h4 className="text-xs font-bold text-amber-400">
                  {t('fascia.education.whyProsCare', 'Why Pros Care')}
                </h4>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('fascia.education.proExplanation', 
                  "Top athletes know that pain in one spot might come from tightness in a completely different spot. They stretch the WHOLE track, not just where it hurts!"
                )}
              </p>
            </div>

            {/* Research Attribution */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <BookOpen className="h-3 w-3" />
                <span>{t('fascia.education.researchTitle', 'This comes from real science!')}</span>
              </div>
              <p className="text-[10px] text-muted-foreground/80">
                {t('fascia.education.researchers', 
                  'Researchers like Thomas Myers (Anatomy Trains), Dr. Robert Schleip, and Carla & Antonio Stecco study how our bodies connect. Pretty cool, right?'
                )}
              </p>
            </div>

            {/* Disclaimer */}
            <BodyConnectionDisclaimer variant="full" />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
