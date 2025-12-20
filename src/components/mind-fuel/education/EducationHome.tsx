import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Brain, Moon, Shield, BookOpen } from 'lucide-react';
import MentalHealthBasics from './MentalHealthBasics';
import TopicCards from './TopicCards';
import SleepScience from './SleepScience';
import HealthyBoundaries from './HealthyBoundaries';

export default function EducationHome() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('basics');

  const topics = [
    { id: 'basics', icon: Brain, label: t('mentalWellness.education.tabs.basics', 'Basics') },
    { id: 'topics', icon: BookOpen, label: t('mentalWellness.education.tabs.topics', 'Topics') },
    { id: 'sleep', icon: Moon, label: t('mentalWellness.education.tabs.sleep', 'Sleep') },
    { id: 'boundaries', icon: Shield, label: t('mentalWellness.education.tabs.boundaries', 'Boundaries') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-wellness-sky/30 to-wellness-sage/20 border-wellness-sky/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-wellness-sky/20">
              <GraduationCap className="h-5 w-5 text-wellness-sky" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {t('mentalWellness.education.title', 'Mental Health Education')}
              </h2>
              <p className="text-sm font-normal text-muted-foreground">
                {t('mentalWellness.education.subtitle', 'Learn the foundations of mental wellness')}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.education.description', 'Understanding mental health is the first step to taking care of it. Explore these educational resources to build your mental health literacy.')}
          </p>
        </CardContent>
      </Card>

      {/* Topics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full h-auto flex-wrap gap-1 bg-wellness-cream/50 p-1">
          {topics.map((topic) => {
            const Icon = topic.icon;
            return (
              <TabsTrigger
                key={topic.id}
                value={topic.id}
                className="flex-1 min-w-[80px] gap-1.5 data-[state=active]:bg-wellness-sky data-[state=active]:text-wellness-sky-foreground"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">{topic.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="mt-4">
          <TabsContent value="basics" className="mt-0">
            <MentalHealthBasics />
          </TabsContent>

          <TabsContent value="topics" className="mt-0">
            <TopicCards />
          </TabsContent>

          <TabsContent value="sleep" className="mt-0">
            <SleepScience />
          </TabsContent>

          <TabsContent value="boundaries" className="mt-0">
            <HealthyBoundaries />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
