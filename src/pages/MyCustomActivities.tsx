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
import { LayoutGrid, History, BarChart3, Droplets, Footprints, BookOpen, Inbox, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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

  const tabs = [
    { value: 'templates', icon: LayoutGrid, label: t('myCustomActivities.tabs.templates', 'Templates') },
    { value: 'received', icon: Inbox, label: t('myCustomActivities.tabs.received', 'Received'), badge: pendingCount },
    { value: 'library', icon: BookOpen, label: t('myCustomActivities.tabs.library', 'Library') },
    { value: 'history', icon: History, label: t('myCustomActivities.tabs.history', 'History') },
    { value: 'analytics', icon: BarChart3, label: t('myCustomActivities.tabs.analytics', 'Analytics') },
    { value: 'hydration', icon: Droplets, label: t('myCustomActivities.tabs.hydration', 'Hydration') },
    { value: 'presets', icon: Footprints, label: t('myCustomActivities.tabs.presets', 'Presets') },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                  {t('myCustomActivities.title', 'My Custom Activities')}
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  {t('myCustomActivities.subtitle', 'Manage templates, view history, and track your progress')}
                </p>
              </div>
            </div>
          </div>
          <HydrationTrackerWidget />
        </div>

        <Tabs defaultValue="templates" className="w-full">
          {/* Scrollable tabs on mobile */}
          <ScrollArea className="w-full">
            <TabsList className="inline-flex h-12 w-full sm:w-auto bg-muted/50 p-1 gap-1">
              {tabs.map(({ value, icon: Icon, label, badge }) => (
                <TabsTrigger 
                  key={value}
                  value={value} 
                  className="flex items-center gap-2 px-3 sm:px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md whitespace-nowrap transition-all"
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline font-medium">{label}</span>
                  {badge !== undefined && badge > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs font-bold animate-pulse"
                    >
                      {badge}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" className="sm:hidden" />
          </ScrollArea>

          <div className="mt-6">
            <TabsContent value="templates" className="mt-0 animate-fade-in">
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

            <TabsContent value="received" className="mt-0 animate-fade-in">
              <ReceivedActivitiesList selectedSport={selectedSport} />
            </TabsContent>

            <TabsContent value="library" className="mt-0 animate-fade-in">
              <WorkoutTemplatesLibrary 
                selectedSport={selectedSport}
                onUseTemplate={handleUseTemplate}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-0 animate-fade-in">
              <ActivityHistoryList selectedSport={selectedSport} />
            </TabsContent>

            <TabsContent value="analytics" className="mt-0 animate-fade-in">
              <ActivityAnalytics selectedSport={selectedSport} />
            </TabsContent>

            <TabsContent value="hydration" className="mt-0 animate-fade-in">
              <HydrationReminderSettings />
            </TabsContent>

            <TabsContent value="presets" className="mt-0 animate-fade-in">
              <RunningPresetLibrary selectedSport={selectedSport} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
