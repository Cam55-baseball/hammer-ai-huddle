import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Compass, Baby, Feather, HandHeart } from 'lucide-react';
import GuidedReflection from './GuidedReflection';
import InnerChildWork from './InnerChildWork';
import GriefSupport from './GriefSupport';
import ForgivenessTools from './ForgivenessTools';

export default function HealingHome() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('reflection');

  const tools = [
    { id: 'reflection', icon: Compass, label: t('mentalWellness.healing.tabs.reflection', 'Reflect') },
    { id: 'innerchild', icon: Baby, label: t('mentalWellness.healing.tabs.innerChild', 'Inner Child') },
    { id: 'grief', icon: Heart, label: t('mentalWellness.healing.tabs.grief', 'Grief') },
    { id: 'forgiveness', icon: Feather, label: t('mentalWellness.healing.tabs.forgiveness', 'Forgive') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-wellness-lavender/30 to-wellness-rose/20 border-wellness-lavender/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-wellness-lavender/20">
              <HandHeart className="h-5 w-5 text-wellness-lavender" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {t('mentalWellness.healing.title', 'Healing & Growth')}
              </h2>
              <p className="text-sm font-normal text-muted-foreground">
                {t('mentalWellness.healing.subtitle', 'Process, heal, and grow from life experiences')}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.healing.description', 'These tools are designed to help you process difficult emotions, heal from past experiences, and foster personal growth. Take your time and be gentle with yourself.')}
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
                className="flex-1 min-w-[80px] gap-1.5 data-[state=active]:bg-wellness-lavender data-[state=active]:text-wellness-lavender-foreground"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">{tool.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="mt-4">
          <TabsContent value="reflection" className="mt-0">
            <GuidedReflection />
          </TabsContent>

          <TabsContent value="innerchild" className="mt-0">
            <InnerChildWork />
          </TabsContent>

          <TabsContent value="grief" className="mt-0">
            <GriefSupport />
          </TabsContent>

          <TabsContent value="forgiveness" className="mt-0">
            <ForgivenessTools />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
