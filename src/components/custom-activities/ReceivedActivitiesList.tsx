import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Inbox, ChevronDown, History, Loader2, Sparkles } from 'lucide-react';
import { useReceivedActivities } from '@/hooks/useReceivedActivities';
import { useCustomActivities } from '@/hooks/useCustomActivities';
import { ReceivedActivityCard } from './ReceivedActivityCard';
import { CustomActivityBuilderDialog } from './CustomActivityBuilderDialog';
import { CustomActivityTemplate } from '@/types/customActivity';
import { SentActivityTemplate, LockableField } from '@/types/sentActivity';

interface ReceivedActivitiesListProps {
  selectedSport: 'baseball' | 'softball';
}

export function ReceivedActivitiesList({ selectedSport }: ReceivedActivitiesListProps) {
  const { t } = useTranslation();
  const { pendingActivities, historyActivities, loading, acceptActivity, rejectActivity } = useReceivedActivities();
  const { createTemplate, updateTemplate, refetch: refetchTemplates } = useCustomActivities(selectedSport);
  
  const [acceptingActivity, setAcceptingActivity] = useState<SentActivityTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<CustomActivityTemplate | null>(null);
  const [lockedFields, setLockedFields] = useState<LockableField[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleAccept = async (activity: SentActivityTemplate) => {
    setAcceptingActivity(activity);
    setLockedFields(activity.locked_fields);
    
    // Create initial template from snapshot
    const newTemplate = await acceptActivity(activity.id, createTemplate);
    if (newTemplate) {
      setEditingTemplate(newTemplate);
    } else {
      setAcceptingActivity(null);
    }
  };

  const handleReject = async (activityId: string) => {
    await rejectActivity(activityId);
  };

  const handleSaveEdit = async (data: Omit<CustomActivityTemplate, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!editingTemplate) return false;
    const success = await updateTemplate(editingTemplate.id, data);
    if (success) {
      setEditingTemplate(null);
      setAcceptingActivity(null);
      setLockedFields([]);
      // Refetch templates to ensure the new activity appears in Templates tab
      await refetchTemplates();
    }
    return success;
  };

  const handleCloseDialog = () => {
    setEditingTemplate(null);
    setAcceptingActivity(null);
    setLockedFields([]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t('common.loading', 'Loading...')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Pending Activities */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Inbox className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              {t('sentActivity.pending', 'Pending')}
              {pendingActivities.length > 0 && (
                <span className="relative flex h-6 w-6 items-center justify-center">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-primary/40" />
                  <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {pendingActivities.length}
                  </span>
                </span>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('sentActivity.pendingDescription', 'Activities awaiting your response')}
            </p>
          </div>
        </div>

        {pendingActivities.length === 0 ? (
          <Card className="border-2 border-dashed bg-gradient-to-br from-muted/30 to-transparent">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Inbox className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">
                {t('sentActivity.noPending', 'No pending activities from coaches')}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
                {t('sentActivity.noPendingHint', 'Activities sent by your coaches will appear here')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingActivities.map((activity, index) => (
              <div 
                key={activity.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ReceivedActivityCard
                  activity={activity}
                  onAccept={() => handleAccept(activity)}
                  onReject={() => handleReject(activity.id)}
                  isPending={true}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {historyActivities.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between gap-2 h-14 px-4 border-2 border-dashed hover:border-solid hover:bg-muted/50 transition-all"
            >
              <span className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <History className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="font-semibold">{t('sentActivity.history', 'History')}</span>
                <span className="text-muted-foreground font-normal">({historyActivities.length})</span>
              </span>
              <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${historyOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {historyActivities.map(activity => (
                <ReceivedActivityCard
                  key={activity.id}
                  activity={activity}
                  onAccept={() => {}}
                  onReject={() => {}}
                  isPending={false}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Edit Dialog with Locked Fields */}
      {editingTemplate && (
        <CustomActivityBuilderDialog
          open={true}
          onOpenChange={(open) => !open && handleCloseDialog()}
          template={editingTemplate}
          onSave={handleSaveEdit}
          selectedSport={selectedSport}
          lockedFields={lockedFields}
          isFromCoach={true}
          coachName={acceptingActivity?.sender?.full_name}
        />
      )}
    </div>
  );
}
