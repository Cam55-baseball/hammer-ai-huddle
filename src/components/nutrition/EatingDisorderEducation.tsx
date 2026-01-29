import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Heart, 
  AlertTriangle, 
  Shield, 
  ChevronDown, 
  ChevronUp, 
  Phone,
  Check,
  X,
  Zap,
  Activity
} from 'lucide-react';

interface EducationSection {
  id: string;
  titleKey: string;
  contentKey: string;
  icon: React.ReactNode;
}

const warningSigns = [
  { key: 'obsessiveTracking', healthy: 'mindfulEating', unhealthy: 'obsessiveTracking' },
  { key: 'skippingMeals', healthy: 'regularMeals', unhealthy: 'skippingMeals' },
  { key: 'excessiveExercise', healthy: 'balancedTraining', unhealthy: 'excessiveExercise' },
  { key: 'bodyPreoccupation', healthy: 'performanceFocus', unhealthy: 'bodyPreoccupation' },
  { key: 'avoidingMeals', healthy: 'socialEating', unhealthy: 'avoidingMeals' },
  { key: 'hidingFood', healthy: 'openCommunication', unhealthy: 'hidingFood' },
  { key: 'moodChanges', healthy: 'stableEnergy', unhealthy: 'moodChanges' },
];

const athleteRisks = [
  { key: 'reds', icon: <Zap className="h-4 w-4" /> },
  { key: 'underFueling', icon: <Activity className="h-4 w-4" /> },
  { key: 'growthConcerns', icon: <Heart className="h-4 w-4" /> },
  { key: 'overtraining', icon: <AlertTriangle className="h-4 w-4" /> },
];

const supportResources = [
  { key: 'trustedAdult', icon: '👤' },
  { key: 'coach', icon: '🏃' },
  { key: 'healthcare', icon: '🏥' },
  { key: 'helpline', value: '1-800-931-2237', icon: '📞' },
];

export default function EatingDisorderEducation() {
  const { t } = useTranslation();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const sections: EducationSection[] = [
    {
      id: 'overview',
      titleKey: 'nutrition.education.eatingDisorder.overview.title',
      contentKey: 'nutrition.education.eatingDisorder.overview.content',
      icon: <Heart className="h-4 w-4" />,
    },
    {
      id: 'warningSigns',
      titleKey: 'nutrition.education.eatingDisorder.warningSigns.title',
      contentKey: 'nutrition.education.eatingDisorder.warningSigns.content',
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    {
      id: 'athleteRisks',
      titleKey: 'nutrition.education.eatingDisorder.athleteRisks.title',
      contentKey: 'nutrition.education.eatingDisorder.athleteRisks.content',
      icon: <Activity className="h-4 w-4" />,
    },
    {
      id: 'properFueling',
      titleKey: 'nutrition.education.eatingDisorder.properFueling.title',
      contentKey: 'nutrition.education.eatingDisorder.properFueling.content',
      icon: <Zap className="h-4 w-4" />,
    },
  ];

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-1.5 rounded-lg bg-amber-500/20">
            <Heart className="h-5 w-5 text-amber-400" />
          </div>
          {t('nutrition.education.eatingDisorder.title', 'Understanding Eating & Your Body')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('nutrition.education.eatingDisorder.subtitle', 'Educational information about healthy eating habits for athletes')}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Introduction */}
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-300">
            {t('nutrition.education.eatingDisorder.intro', 'Understanding the relationship between food and our bodies is an important part of being an athlete. This section provides educational information to help you recognize when eating habits might become unhealthy.')}
          </p>
        </div>

        {/* Expandable Sections */}
        <div className="space-y-2">
          {sections.map((section) => {
            const isExpanded = expandedSection === section.id;
            
            return (
              <div
                key={section.id}
                className="border border-amber-500/20 rounded-lg overflow-hidden bg-background/50"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full p-3 flex items-center justify-between hover:bg-amber-500/5 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400">{section.icon}</span>
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
                    
                    {/* Warning Signs Section */}
                    {section.id === 'warningSigns' && (
                      <div className="space-y-2">
                        {warningSigns.map((sign) => (
                          <div key={sign.key} className="grid grid-cols-2 gap-2">
                            <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                              <div className="flex items-center gap-1 mb-1">
                                <Check className="h-3 w-3 text-green-400" />
                                <span className="text-xs font-medium text-green-400">
                                  {t('nutrition.education.healthy', 'Healthy')}
                                </span>
                              </div>
                              <p className="text-xs">
                                {t(`nutrition.education.eatingDisorder.signs.${sign.healthy}`)}
                              </p>
                            </div>
                            <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                              <div className="flex items-center gap-1 mb-1">
                                <X className="h-3 w-3 text-red-400" />
                                <span className="text-xs font-medium text-red-400">
                                  {t('nutrition.education.concerning', 'Concerning')}
                                </span>
                              </div>
                              <p className="text-xs">
                                {t(`nutrition.education.eatingDisorder.signs.${sign.unhealthy}`)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Athlete Risks Section */}
                    {section.id === 'athleteRisks' && (
                      <div className="space-y-2">
                        {athleteRisks.map((risk) => (
                          <div 
                            key={risk.key}
                            className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-amber-400">{risk.icon}</span>
                              <span className="text-sm font-medium">
                                {t(`nutrition.education.eatingDisorder.risks.${risk.key}.title`)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {t(`nutrition.education.eatingDisorder.risks.${risk.key}.description`)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Proper Fueling Section */}
                    {section.id === 'properFueling' && (
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <span className="text-green-400">•</span>
                            <span>{t('nutrition.education.eatingDisorder.fueling.performance')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-400">•</span>
                            <span>{t('nutrition.education.eatingDisorder.fueling.growth')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-400">•</span>
                            <span>{t('nutrition.education.eatingDisorder.fueling.recovery')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-green-400">•</span>
                            <span>{t('nutrition.education.eatingDisorder.fueling.injury')}</span>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Support Resources */}
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4 text-blue-400" />
              {t('nutrition.education.support.title', 'Need Support?')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-sm text-muted-foreground mb-3">
              {t('nutrition.education.support.message', 'If you or someone you know is struggling with food or body image concerns, please reach out to:')}
            </p>
            <div className="space-y-2">
              {supportResources.map((resource) => (
                <div 
                  key={resource.key}
                  className="flex items-center gap-2 text-sm"
                >
                  <span>{resource.icon}</span>
                  <span>
                    {t(`nutrition.education.support.${resource.key}`)}
                    {resource.value && (
                      <span className="font-medium text-blue-400 ml-1">{resource.value}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="flex gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Shield className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-300 mb-1">
              {t('nutrition.education.disclaimer.title', 'Educational Information Only')}
            </p>
            <p className="text-muted-foreground text-xs">
              {t('nutrition.education.disclaimer.text', 'This content is for educational purposes only and is not intended to diagnose or treat any condition. If you have concerns about your eating habits or relationship with food, please talk to a trusted adult or healthcare professional.')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
