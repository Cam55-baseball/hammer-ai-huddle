import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, ChevronDown, ChevronUp, AlertTriangle, Target, Scale, Glasses, Filter, UserX, ThumbsDown, Sparkles, Cloud, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Distortion {
  id: string;
  icon: React.ElementType;
  color: string;
  example: string;
  reframe: string;
}

export default function CognitiveDistortions() {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const distortions: Distortion[] = [
    {
      id: 'allOrNothing',
      icon: Target,
      color: 'wellness-coral',
      example: t('mentalWellness.cognitiveSkills.distortions.allOrNothing.example', '"I missed one shot, so I\'m a terrible player."'),
      reframe: t('mentalWellness.cognitiveSkills.distortions.allOrNothing.reframe', '"One miss doesn\'t define my whole game. I made several good plays too."')
    },
    {
      id: 'overgeneralization',
      icon: Filter,
      color: 'wellness-lavender',
      example: t('mentalWellness.cognitiveSkills.distortions.overgeneralization.example', '"I always choke under pressure."'),
      reframe: t('mentalWellness.cognitiveSkills.distortions.overgeneralization.reframe', '"I\'ve had some tough moments, but I\'ve also performed well under pressure before."')
    },
    {
      id: 'mentalFilter',
      icon: Glasses,
      color: 'wellness-sky',
      example: t('mentalWellness.cognitiveSkills.distortions.mentalFilter.example', '"The coach said one critical thing, so the whole practice was bad."'),
      reframe: t('mentalWellness.cognitiveSkills.distortions.mentalFilter.reframe', '"The coach gave me one correction but also praised my effort twice."')
    },
    {
      id: 'discounting',
      icon: ThumbsDown,
      color: 'wellness-sage',
      example: t('mentalWellness.cognitiveSkills.distortions.discounting.example', '"I only won because the other team was weak."'),
      reframe: t('mentalWellness.cognitiveSkills.distortions.discounting.reframe', '"I prepared well and executed my game plan. I earned this win."')
    },
    {
      id: 'jumping',
      icon: Sparkles,
      color: 'wellness-coral',
      example: t('mentalWellness.cognitiveSkills.distortions.jumping.example', '"My teammates are probably talking about how bad I played."'),
      reframe: t('mentalWellness.cognitiveSkills.distortions.jumping.reframe', '"I don\'t actually know what they\'re thinking. They might not even notice."')
    },
    {
      id: 'catastrophizing',
      icon: Cloud,
      color: 'wellness-lavender',
      example: t('mentalWellness.cognitiveSkills.distortions.catastrophizing.example', '"If I lose this game, my career is over."'),
      reframe: t('mentalWellness.cognitiveSkills.distortions.catastrophizing.reframe', '"This is one game of many. There will be more opportunities."')
    },
    {
      id: 'emotional',
      icon: Scale,
      color: 'wellness-sky',
      example: t('mentalWellness.cognitiveSkills.distortions.emotional.example', '"I feel like a failure, so I must be one."'),
      reframe: t('mentalWellness.cognitiveSkills.distortions.emotional.reframe', '"Feeling like a failure doesn\'t make me one. Emotions aren\'t facts."')
    },
    {
      id: 'shouldStatements',
      icon: ArrowUpDown,
      color: 'wellness-sage',
      example: t('mentalWellness.cognitiveSkills.distortions.shouldStatements.example', '"I should never make mistakes."'),
      reframe: t('mentalWellness.cognitiveSkills.distortions.shouldStatements.reframe', '"Everyone makes mistakes. They\'re part of learning and growing."')
    },
    {
      id: 'labeling',
      icon: UserX,
      color: 'wellness-coral',
      example: t('mentalWellness.cognitiveSkills.distortions.labeling.example', '"I\'m such a loser."'),
      reframe: t('mentalWellness.cognitiveSkills.distortions.labeling.reframe', '"I had a setback, but that doesn\'t define who I am as a person."')
    },
    {
      id: 'personalization',
      icon: AlertTriangle,
      color: 'wellness-lavender',
      example: t('mentalWellness.cognitiveSkills.distortions.personalization.example', '"We lost because of me."'),
      reframe: t('mentalWellness.cognitiveSkills.distortions.personalization.reframe', '"The outcome was a team result. Many factors contributed."')
    }
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-wellness-lavender/20 to-wellness-sky/20 border-wellness-lavender/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-wellness-lavender" />
            {t('mentalWellness.cognitiveSkills.distortions.title', 'Common Thinking Traps')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.cognitiveSkills.distortions.intro', 'Learn to recognize these common cognitive distortions that can affect your mental game.')}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {distortions.map((distortion) => {
          const Icon = distortion.icon;
          const isExpanded = expandedId === distortion.id;
          
          return (
            <Card
              key={distortion.id}
              className={cn(
                "cursor-pointer transition-all duration-300",
                isExpanded ? `border-${distortion.color}/50 shadow-md` : "hover:border-muted-foreground/30"
              )}
              onClick={() => setExpandedId(isExpanded ? null : distortion.id)}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-${distortion.color}/20`}>
                      <Icon className={`h-4 w-4 text-${distortion.color}`} style={{ color: `hsl(var(--${distortion.color}))` }} />
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {t(`mentalWellness.cognitiveSkills.distortions.${distortion.id}.title`, distortion.id)}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {t(`mentalWellness.cognitiveSkills.distortions.${distortion.id}.short`, 'Tap to learn more')}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    <div>
                      <Badge variant="outline" className="text-xs mb-2 text-destructive border-destructive/30">
                        {t('mentalWellness.cognitiveSkills.distortions.exampleLabel', 'Distorted Thought')}
                      </Badge>
                      <p className="text-sm italic text-muted-foreground">{distortion.example}</p>
                    </div>
                    <div>
                      <Badge variant="outline" className="text-xs mb-2 text-wellness-sage border-wellness-sage/30">
                        {t('mentalWellness.cognitiveSkills.distortions.reframeLabel', 'Reframed Thought')}
                      </Badge>
                      <p className="text-sm italic text-muted-foreground">{distortion.reframe}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
