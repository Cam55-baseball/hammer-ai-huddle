import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, Award, Calendar } from 'lucide-react';
import MoodTrends from './MoodTrends';
import StressPatterns from './StressPatterns';
import ProgressMilestones from './ProgressMilestones';

export default function InsightsHome() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('mood');

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <BarChart3 className="h-6 w-6" />
            {t('insights.title', 'Wellness Insights')}
          </CardTitle>
          <p className="text-white/80 text-sm">
            {t('insights.subtitle', 'Track your mental wellness journey with data-driven insights')}
          </p>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-foreground">7</p>
            <p className="text-xs text-muted-foreground">
              {t('insights.dayStreak', 'Day Streak')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <p className="text-2xl font-bold text-foreground">12</p>
            <p className="text-xs text-muted-foreground">
              {t('insights.badgesEarned', 'Badges Earned')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-foreground">7.2</p>
            <p className="text-xs text-muted-foreground">
              {t('insights.avgMood', 'Avg Mood')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold text-foreground">28</p>
            <p className="text-xs text-muted-foreground">
              {t('insights.entriesThisMonth', 'Entries This Month')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="mood">
            {t('insights.moodTrends', 'Mood Trends')}
          </TabsTrigger>
          <TabsTrigger value="stress">
            {t('insights.stressPatterns', 'Stress')}
          </TabsTrigger>
          <TabsTrigger value="milestones">
            {t('insights.milestones', 'Milestones')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mood" className="mt-4">
          <MoodTrends />
        </TabsContent>

        <TabsContent value="stress" className="mt-4">
          <StressPatterns />
        </TabsContent>

        <TabsContent value="milestones" className="mt-4">
          <ProgressMilestones />
        </TabsContent>
      </Tabs>
    </div>
  );
}
