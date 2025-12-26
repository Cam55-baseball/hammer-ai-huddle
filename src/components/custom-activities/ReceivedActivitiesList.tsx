import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Inbox, ChevronDown, History, Loader2 } from 'lucide-react';
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
  const { createTemplate, updateTemplate } = useCustomActivities(selectedSport);
  
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Activities */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          {t('sentActivity.pending', 'Pending')}
          {pendingActivities.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({pendingActivities.length})
            </span>
          )}
        </h3>

        {pendingActivities.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {t('sentActivity.noPending', 'No pending activities from coaches')}
              </p>
              <p className="text-sm text-muted-foreground/70">
                {t('sentActivity.noPendingHint', 'Activities sent by your coaches will appear here')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingActivities.map(activity => (
              <ReceivedActivityCard
                key={activity.id}
                activity={activity}
                onAccept={() => handleAccept(activity)}
                onReject={() => handleReject(activity.id)}
                isPending={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {historyActivities.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between gap-2">
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                {t('sentActivity.history', 'History')}
                <span className="text-muted-foreground">({historyActivities.length})</span>
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
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
