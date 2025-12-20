import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, TrendingUp, Heart, Compass, RefreshCw, Flame } from 'lucide-react';
import ConfidenceTracker from './ConfidenceTracker';
import SelfBeliefExercises from './SelfBeliefExercises';
import IdentityValues from './IdentityValues';
import FailureReframing from './FailureReframing';
import SelfEfficacyChallenges from './SelfEfficacyChallenges';

export default function ResilienceHome() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('confidence');

  const tools = [
    { id: 'confidence', icon: TrendingUp, label: t('mentalWellness.resilience.tabs.confidence', 'Confidence') },
    { id: 'belief', icon: Heart, label: t('mentalWellness.resilience.tabs.belief', 'Belief') },
    { id: 'identity', icon: Compass, label: t('mentalWellness.resilience.tabs.identity', 'Identity') },
    { id: 'failure', icon: RefreshCw, label: t('mentalWellness.resilience.tabs.failure', 'Reframe') },
    { id: 'efficacy', icon: Flame, label: t('mentalWellness.resilience.tabs.efficacy', 'Challenges') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-wellness-coral/30 to-wellness-lavender/20 border-wellness-coral/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-wellness-coral/20">
              <Shield className="h-5 w-5 text-wellness-coral" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {t('mentalWellness.resilience.title', 'Resilience Building')}
              </h2>
              <p className="text-sm font-normal text-muted-foreground">
                {t('mentalWellness.resilience.subtitle', 'Build mental toughness and bounce back stronger')}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.resilience.description', 'Develop the confidence, self-belief, and mental strength needed to overcome any challenge in sports and life.')}
          </p>
        </CardContent>
      </Card>

      {/* Tools Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full h-auto flex-wrap gap-1 bg-wellness-cream/50 p-1">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <TabsTrigger
                key={tool.id}
                value={tool.id}
                className="flex-1 min-w-[70px] gap-1.5 data-[state=active]:bg-wellness-coral data-[state=active]:text-wellness-coral-foreground"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">{tool.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="mt-4">
          <TabsContent value="confidence" className="mt-0">
            <ConfidenceTracker />
          </TabsContent>

          <TabsContent value="belief" className="mt-0">
            <SelfBeliefExercises />
          </TabsContent>

          <TabsContent value="identity" className="mt-0">
            <IdentityValues />
          </TabsContent>

          <TabsContent value="failure" className="mt-0">
            <FailureReframing />
          </TabsContent>

          <TabsContent value="efficacy" className="mt-0">
            <SelfEfficacyChallenges />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
