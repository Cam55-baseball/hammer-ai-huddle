import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/DashboardLayout';
import { TemplatesGrid } from '@/components/custom-activities/TemplatesGrid';
import { ActivityHistoryList } from '@/components/custom-activities/ActivityHistoryList';
import { ActivityAnalytics } from '@/components/custom-activities/ActivityAnalytics';
import { HydrationReminderSettings } from '@/components/custom-activities/HydrationReminderSettings';
import { HydrationTrackerWidget } from '@/components/custom-activities/HydrationTrackerWidget';
import { RunningPresetLibrary } from '@/components/custom-activities/RunningPresetLibrary';
import { WorkoutTemplatesLibrary } from '@/components/custom-activities/WorkoutTemplatesLibrary';
import { ReceivedActivitiesList } from '@/components/custom-activities/ReceivedActivitiesList';
import { useCustomActivities } from '@/hooks/useCustomActivities';
import { useReceivedActivities } from '@/hooks/useReceivedActivities';
import { LayoutGrid, History, BarChart3, Droplets, Footprints, BookOpen, Inbox } from 'lucide-react';
import { toast } from 'sonner';

export default function MyCustomActivities() {
  const { t } = useTranslation();
  const [selectedSport] = useState<'baseball' | 'softball'>(() => {
    return (localStorage.getItem('selectedSport') as 'baseball' | 'softball') || 'baseball';
  });
  
  const {
    templates,
    todayLogs,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleFavorite,
    refetch
  } = useCustomActivities(selectedSport);

  const { pendingCount } = useReceivedActivities();

  const handleUseTemplate = (exercises: any[], templateName: string) => {
    toast.success(t('workoutTemplates.templateLoaded', `Template "${templateName}" loaded! Create a new activity to use it.`));
    // Store in session for the activity builder to pick up
    sessionStorage.setItem('pendingWorkoutExercises', JSON.stringify(exercises));
    sessionStorage.setItem('pendingWorkoutName', templateName);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              {t('myCustomActivities.title', 'My Custom Activities')}
            </h1>
            <p className="text-muted-foreground">
              {t('myCustomActivities.subtitle', 'Manage templates, view history, and track your progress')}
            </p>
          </div>
          <HydrationTrackerWidget />
        </div>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-7 h-auto">
            <TabsTrigger value="templates" className="flex items-center gap-2 py-3">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">{t('myCustomActivities.tabs.templates', 'Templates')}</span>
            </TabsTrigger>
            <TabsTrigger value="received" className="flex items-center gap-2 py-3">
              <Inbox className="h-4 w-4" />
              <span className="hidden sm:inline">{t('myCustomActivities.tabs.received', 'Received')}</span>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2 py-3">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">{t('myCustomActivities.tabs.library', 'Library')}</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 py-3">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">{t('myCustomActivities.tabs.history', 'History')}</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 py-3">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('myCustomActivities.tabs.analytics', 'Analytics')}</span>
            </TabsTrigger>
            <TabsTrigger value="hydration" className="flex items-center gap-2 py-3">
              <Droplets className="h-4 w-4" />
              <span className="hidden sm:inline">{t('myCustomActivities.tabs.hydration', 'Hydration')}</span>
            </TabsTrigger>
            <TabsTrigger value="presets" className="flex items-center gap-2 py-3">
              <Footprints className="h-4 w-4" />
              <span className="hidden sm:inline">{t('myCustomActivities.tabs.presets', 'Presets')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-6">
            <TemplatesGrid
              templates={templates}
              loading={loading}
              selectedSport={selectedSport}
              onCreateTemplate={createTemplate}
              onUpdateTemplate={updateTemplate}
              onDeleteTemplate={deleteTemplate}
              onToggleFavorite={toggleFavorite}
              onRefetch={refetch}
            />
          </TabsContent>

          <TabsContent value="received" className="mt-6">
            <ReceivedActivitiesList selectedSport={selectedSport} />
          </TabsContent>

          <TabsContent value="library" className="mt-6">
            <WorkoutTemplatesLibrary 
              selectedSport={selectedSport}
              onUseTemplate={handleUseTemplate}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <ActivityHistoryList selectedSport={selectedSport} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <ActivityAnalytics selectedSport={selectedSport} />
          </TabsContent>

          <TabsContent value="hydration" className="mt-6">
            <HydrationReminderSettings />
          </TabsContent>

          <TabsContent value="presets" className="mt-6">
            <RunningPresetLibrary selectedSport={selectedSport} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
