import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Sparkles, 
  Trophy, 
  Dumbbell,
  ChevronDown, 
  ChevronUp, 
  Heart,
  Shield,
  Smartphone,
  Target
} from 'lucide-react';

interface EducationSection {
  id: string;
  titleKey: string;
  contentKey: string;
  icon: React.ReactNode;
}

const bodyDiversityExamples = [
  { key: 'pitcher', position: 'Pitcher' },
  { key: 'catcher', position: 'Catcher' },
  { key: 'infielder', position: 'Infielder' },
  { key: 'outfielder', position: 'Outfielder' },
];

const positiveAffirmations = [
  'affirmation1',
  'affirmation2',
  'affirmation3',
  'affirmation4',
  'affirmation5',
];

const functionOverAppearance = [
  { key: 'strength', icon: <Dumbbell className="h-4 w-4" /> },
  { key: 'speed', icon: <Target className="h-4 w-4" /> },
  { key: 'durability', icon: <Shield className="h-4 w-4" /> },
  { key: 'recovery', icon: <Heart className="h-4 w-4" /> },
];

const comparisonDangers = [
  { key: 'filters', icon: '📷' },
  { key: 'highlights', icon: '✨' },
  { key: 'different', icon: '🎯' },
  { key: 'journey', icon: '🌱' },
];

export default function BodyImageEducation() {
  const { t } = useTranslation();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const sections: EducationSection[] = [
    {
      id: 'impact',
      titleKey: 'nutrition.education.bodyImage.impact.title',
      contentKey: 'nutrition.education.bodyImage.impact.content',
      icon: <Heart className="h-4 w-4" />,
    },
    {
      id: 'diversity',
      titleKey: 'nutrition.education.bodyImage.diversity.title',
      contentKey: 'nutrition.education.bodyImage.diversity.content',
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: 'comparison',
      titleKey: 'nutrition.education.bodyImage.comparison.title',
      contentKey: 'nutrition.education.bodyImage.comparison.content',
      icon: <Smartphone className="h-4 w-4" />,
    },
    {
      id: 'function',
      titleKey: 'nutrition.education.bodyImage.function.title',
      contentKey: 'nutrition.education.bodyImage.function.content',
      icon: <Trophy className="h-4 w-4" />,
    },
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <Card className="bg-gradient-to-br from-teal-500/10 to-emerald-500/10 border-teal-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 rounded-lg bg-teal-500/20">
            <Sparkles className="h-5 w-5 text-teal-400" />
          </div>
          {t('nutrition.education.bodyImage.title', 'Body Image & Self-Confidence')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('nutrition.education.bodyImage.subtitle', 'Building a healthy relationship with your body as an athlete')}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Introduction */}
        <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
          <p className="text-sm text-teal-400">
            {t('nutrition.education.bodyImage.intro', 'Athletes come in all shapes and sizes. What matters most is how your body performs, recovers, and helps you achieve your goals. This section helps you build a healthy relationship with your body and resist unhelpful comparisons.')}
          </p>
        </div>

        {/* Expandable Sections */}
        <div className="space-y-2">
          {sections.map((section) => {
            const isExpanded = expandedSection === section.id;
            
            return (
              <div
                key={section.id}
                className="border border-teal-500/20 rounded-lg overflow-hidden bg-background/50"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-3 flex items-center justify-between hover:bg-teal-500/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-teal-400">{section.icon}</span>
                    <span className="font-medium text-sm">
                      {t(section.titleKey)}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 animate-in fade-in duration-200">
                    <p className="text-sm text-muted-foreground">
                      {t(section.contentKey)}
                    </p>
                    
                    {/* Body Diversity Section */}
                    {section.id === 'diversity' && (
                      <div className="grid grid-cols-2 gap-2">
                        {bodyDiversityExamples.map((example) => (
                          <div 
                            key={example.key}
                            className="p-2 rounded-lg bg-teal-500/5 border border-teal-500/10 text-center"
                          >
                            <span className="text-sm font-medium">
                              {t(`nutrition.education.bodyImage.positions.${example.key}`)}
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t(`nutrition.education.bodyImage.positionDesc.${example.key}`)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Comparison Culture Section */}
                    {section.id === 'comparison' && (
                      <div className="space-y-2">
                        {comparisonDangers.map((danger) => (
                          <div 
                            key={danger.key}
                            className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10"
                          >
                            <span className="text-lg">{danger.icon}</span>
                            <div>
                              <span className="text-sm font-medium">
                                {t(`nutrition.education.bodyImage.dangers.${danger.key}.title`)}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {t(`nutrition.education.bodyImage.dangers.${danger.key}.description`)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Function Over Appearance Section */}
                    {section.id === 'function' && (
                      <div className="grid grid-cols-2 gap-2">
                        {functionOverAppearance.map((item) => (
                          <div 
                            key={item.key}
                            className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center"
                          >
                            <div className="flex justify-center text-green-400 mb-1">
                              {item.icon}
                            </div>
                            <span className="text-sm font-medium">
                              {t(`nutrition.education.bodyImage.functions.${item.key}.title`)}
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t(`nutrition.education.bodyImage.functions.${item.key}.description`)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Positive Affirmations */}
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-purple-400" />
              {t('nutrition.education.bodyImage.affirmations.title', 'Athlete Affirmations')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-sm text-muted-foreground mb-3">
              {t('nutrition.education.bodyImage.affirmations.message', 'Positive self-talk helps build confidence. Try saying these to yourself:')}
            </p>
            <div className="space-y-2">
              {positiveAffirmations.map((affirmation) => (
                <div 
                  key={affirmation}
                  className="p-2 rounded-lg bg-purple-500/5 border border-purple-500/10"
                >
                  <p className="text-sm italic">
                    "{t(`nutrition.education.bodyImage.affirmations.${affirmation}`)}"
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Key Message */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/20">
          <p className="text-sm font-medium text-teal-300 text-center">
            {t('nutrition.education.bodyImage.keyMessage', 'Your body is an incredible tool for achieving your athletic dreams. Treat it with respect, fuel it well, and appreciate everything it can do.')}
          </p>
        </div>

        {/* Disclaimer */}
        <div className="flex gap-3 p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
          <Shield className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-teal-300 mb-1">
              {t('nutrition.education.disclaimer.title', 'Educational Information Only')}
            </p>
            <p className="text-muted-foreground text-xs">
              {t('nutrition.education.bodyImage.disclaimer', 'This content is designed to promote positive body image. If you are struggling with how you feel about your body, please talk to a trusted adult, counselor, or healthcare professional.')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
