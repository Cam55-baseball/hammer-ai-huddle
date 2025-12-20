import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, BookOpen, RefreshCw, Hand, MessageSquare, Lightbulb } from 'lucide-react';
import ThoughtJournal from './ThoughtJournal';
import CognitiveDistortions from './CognitiveDistortions';
import ReframingTool from './ReframingTool';
import NegativeThoughtInterrupter from './NegativeThoughtInterrupter';
import SelfTalkRewiring from './SelfTalkRewiring';

export default function CognitiveSkillsHome() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('journal');

  const tools = [
    { id: 'journal', icon: BookOpen, label: t('mentalWellness.cognitiveSkills.tabs.journal', 'Journal') },
    { id: 'distortions', icon: Brain, label: t('mentalWellness.cognitiveSkills.tabs.distortions', 'Traps') },
    { id: 'reframe', icon: RefreshCw, label: t('mentalWellness.cognitiveSkills.tabs.reframe', 'Reframe') },
    { id: 'stop', icon: Hand, label: t('mentalWellness.cognitiveSkills.tabs.stop', 'STOP') },
    { id: 'selftalk', icon: MessageSquare, label: t('mentalWellness.cognitiveSkills.tabs.selfTalk', 'Self-Talk') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-wellness-sage/30 to-wellness-sky/20 border-wellness-sage/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-wellness-sage/20">
              <Lightbulb className="h-5 w-5 text-wellness-sage" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {t('mentalWellness.cognitiveSkills.title', 'Cognitive Skills')}
              </h2>
              <p className="text-sm font-normal text-muted-foreground">
                {t('mentalWellness.cognitiveSkills.subtitle', 'Train your mind to think more clearly')}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.cognitiveSkills.description', 'Learn to identify unhelpful thinking patterns and develop healthier ways of processing thoughts and emotions.')}
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
                className="flex-1 min-w-[80px] gap-1.5 data-[state=active]:bg-wellness-sage data-[state=active]:text-wellness-sage-foreground"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">{tool.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="mt-4">
          <TabsContent value="journal" className="mt-0">
            <ThoughtJournal />
          </TabsContent>

          <TabsContent value="distortions" className="mt-0">
            <CognitiveDistortions />
          </TabsContent>

          <TabsContent value="reframe" className="mt-0">
            <ReframingTool />
          </TabsContent>

          <TabsContent value="stop" className="mt-0">
            <NegativeThoughtInterrupter />
          </TabsContent>

          <TabsContent value="selftalk" className="mt-0">
            <SelfTalkRewiring />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
