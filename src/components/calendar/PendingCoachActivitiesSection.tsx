import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, X, Lock, ChevronDown, UserCheck } from 'lucide-react';
import { useReceivedActivities } from '@/hooks/useReceivedActivities';
import { useCustomActivities } from '@/hooks/useCustomActivities';
import { SentActivityTemplate } from '@/types/sentActivity';
import { getActivityIcon } from '@/components/custom-activities';
import { hexToRgba } from '@/hooks/useUserColors';
import { cn } from '@/lib/utils';

interface PendingCoachActivitiesSectionProps {
  selectedSport: 'baseball' | 'softball';
  onActivityAccepted?: () => void;
}

export function PendingCoachActivitiesSection({ 
  selectedSport, 
  onActivityAccepted 
}: PendingCoachActivitiesSectionProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const { pendingActivities, pendingCount, acceptActivity, rejectActivity } = useReceivedActivities();
  const { createTemplate, refetch: refetchActivities } = useCustomActivities(selectedSport);

  const handleAccept = async (activity: SentActivityTemplate) => {
    setProcessingId(activity.id);
    try {
      const template = await acceptActivity(activity.id, createTemplate);
      if (template) {
        refetchActivities();
        onActivityAccepted?.();
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (activityId: string) => {
    setProcessingId(activityId);
    try {
      await rejectActivity(activityId);
    } finally {
      setProcessingId(null);
    }
  };

  if (pendingCount === 0) {
    return null;
  }

  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardContent className="p-4 cursor-pointer hover:bg-blue-500/10 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <UserCheck className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    {t('calendar.pendingFromCoach', 'Pending from Coach')}
                    <Badge className="bg-blue-500 text-white text-xs">
                      {pendingCount}
                    </Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t('calendar.pendingCoachDescription', 'Activities waiting for your approval')}
                  </p>
                </div>
              </div>
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            </div>
          </CardContent>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            {pendingActivities.map(activity => {
              const template = activity.template_snapshot;
              const Icon = getActivityIcon(template.icon);
              const isCoach = activity.sender?.role === 'coach';
              const hasLockedFields = activity.locked_fields && activity.locked_fields.length > 0;
              const isProcessing = processingId === activity.id;

              return (
                <div 
                  key={activity.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
                    "bg-gradient-to-r from-background/80 to-transparent",
                    isProcessing && "opacity-50"
                  )}
                  style={{ 
                    borderColor: hexToRgba(template.color || '#3b82f6', 0.4),
                  }}
                >
                  {/* Icon */}
                  <div 
                    className="p-2 rounded-lg flex-shrink-0" 
                    style={{ backgroundColor: hexToRgba(template.color || '#3b82f6', 0.2) }}
                  >
                    <Icon className="h-5 w-5" style={{ color: template.color || '#3b82f6' }} />
                  </div>
                  
                  {/* Title & Sender */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm line-clamp-1 text-foreground">{template.title}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground truncate">
                        {t('sentActivity.from', 'From')} {activity.sender?.full_name || t('sentActivity.unknown', 'Unknown')}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          isCoach 
                            ? "border-blue-500/50 text-blue-400" 
                            : "border-amber-500/50 text-amber-400"
                        )}
                      >
                        {isCoach ? t('roles.coach', 'Coach') : t('roles.scout', 'Scout')}
                      </Badge>
                      {hasLockedFields && (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button 
                      size="icon" 
                      variant="ghost"
                      disabled={isProcessing}
                      onClick={() => handleReject(activity.id)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm"
                      disabled={isProcessing}
                      onClick={() => handleAccept(activity)}
                      className="h-8 px-3 gap-1.5 font-bold"
                      style={{ 
                        backgroundColor: template.color || '#3b82f6',
                        color: 'white'
                      }}
                    >
                      <Check className="h-4 w-4" />
                      {t('sentActivity.accept', 'Accept')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
