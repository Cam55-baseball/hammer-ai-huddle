import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, AlertTriangle, BookOpen, Users, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import WellnessDisclaimer from '../shared/WellnessDisclaimer';

interface GriefStage {
  id: string;
  name: string;
  description: string;
  tips: string[];
}

const griefStages: GriefStage[] = [
  {
    id: 'denial',
    name: 'Denial',
    description: 'Feeling numb or struggling to accept the loss. This is a protective mechanism that helps us pace our grief.',
    tips: ['Allow yourself time to process', 'Don\'t force yourself to "move on"', 'Seek support from trusted people'],
  },
  {
    id: 'anger',
    name: 'Anger',
    description: 'Feeling frustrated, irritable, or angry—at others, yourself, or the situation. This is a natural part of healing.',
    tips: ['Express anger in healthy ways (exercise, journaling)', 'Understand anger often masks deeper pain', 'Be patient with yourself'],
  },
  {
    id: 'bargaining',
    name: 'Bargaining',
    description: 'Thoughts of "what if" or "if only." Dwelling on what could have been different is common.',
    tips: ['Recognize these thoughts as normal', 'Practice self-compassion', 'Focus on what you can control now'],
  },
  {
    id: 'depression',
    name: 'Depression',
    description: 'Deep sadness, emptiness, or withdrawal. This isn\'t clinical depression but a natural response to loss.',
    tips: ['Allow yourself to feel the sadness', 'Maintain basic self-care', 'Reach out when you\'re ready'],
  },
  {
    id: 'acceptance',
    name: 'Acceptance',
    description: 'Coming to terms with the reality of loss. This doesn\'t mean being "okay" but finding a way forward.',
    tips: ['Acceptance isn\'t forgetting', 'Create new routines and meaning', 'Honor memories while embracing life'],
  },
];

export default function GriefSupport() {
  const { t } = useTranslation();
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const toggleStage = (id: string) => {
    setExpandedStage(expandedStage === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {/* Important Notice */}
      <Card className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/40">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                {t('mentalWellness.healing.grief.notice', 'Important Notice')}
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {t('mentalWellness.healing.grief.noticeText', 'Grief is deeply personal. If you\'re struggling with loss, please consider speaking with a grief counselor or mental health professional. This resource is educational and not a substitute for professional support.')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Introduction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5 text-wellness-rose" />
            {t('mentalWellness.healing.grief.title', 'Understanding Grief')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.healing.grief.intro', 'Grief is a natural response to loss—whether it\'s the loss of a loved one, a relationship, a dream, or a way of life. There\'s no "right" way to grieve, and healing isn\'t linear.')}
          </p>

          <div className="p-4 rounded-lg bg-muted/50">
            <p className="text-sm italic">
              "{t('mentalWellness.healing.grief.quote', 'Grief is the price we pay for love. The depth of our grief reflects the depth of our connection.')}"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Grief Stages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5 text-wellness-sky" />
            {t('mentalWellness.healing.grief.stagesTitle', 'The Grief Process')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.healing.grief.stagesIntro', 'These stages aren\'t linear—you may move back and forth, skip stages, or experience them differently. That\'s completely normal.')}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {griefStages.map((stage) => (
            <div
              key={stage.id}
              className="border rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleStage(stage.id)}
                className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium">{stage.name}</span>
                {expandedStage === stage.id ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {expandedStage === stage.id && (
                <div className="px-3 pb-3 space-y-3">
                  <p className="text-sm text-muted-foreground">{stage.description}</p>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-wellness-sage">Helpful Tips:</p>
                    <ul className="space-y-1">
                      {stage.tips.map((tip, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-wellness-sage">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Support Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-wellness-lavender" />
            {t('mentalWellness.healing.grief.resourcesTitle', 'Finding Support')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
              <Phone className="h-4 w-4 text-wellness-sage" />
              <div>
                <p className="text-sm font-medium">Grief Support Line</p>
                <p className="text-xs text-muted-foreground">1-800-395-5755</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
              <Users className="h-4 w-4 text-wellness-sky" />
              <div>
                <p className="text-sm font-medium">Support Groups</p>
                <p className="text-xs text-muted-foreground">griefshare.org</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            {t('mentalWellness.healing.grief.reminder', 'Remember: Seeking help is a sign of strength, not weakness. You don\'t have to face grief alone.')}
          </p>
        </CardContent>
      </Card>

      <WellnessDisclaimer />
    </div>
  );
}
