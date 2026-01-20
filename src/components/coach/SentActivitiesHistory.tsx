import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Clock, CheckCircle2, XCircle, Send, MessageSquare } from 'lucide-react';
import { useSentActivitiesHistory, SentActivityRecord } from '@/hooks/useSentActivitiesHistory';
import { getActivityIcon } from '@/components/custom-activities/IconPicker';
import { hexToRgba } from '@/hooks/useUserColors';
import { format } from 'date-fns';

export function SentActivitiesHistory() {
  const { t } = useTranslation();
  const { 
    sentActivities, 
    loading, 
    statusFilter, 
    setStatusFilter, 
    fetchSentActivities 
  } = useSentActivitiesHistory();

  useEffect(() => {
    fetchSentActivities();
  }, [fetchSentActivities]);

  const getStatusBadge = (status: SentActivityRecord['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600 bg-yellow-500/10">
            <Clock className="h-3 w-3" />
            {t('sentActivity.status.pending', 'Pending')}
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="outline" className="gap-1 border-green-500 text-green-600 bg-green-500/10">
            <CheckCircle2 className="h-3 w-3" />
            {t('sentActivity.status.accepted', 'Accepted')}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="gap-1 border-red-500 text-red-600 bg-red-500/10">
            <XCircle className="h-3 w-3" />
            {t('sentActivity.status.rejected', 'Rejected')}
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            {t('coach.sentActivities', 'Sent Activities')}
          </CardTitle>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
              <SelectItem value="pending">{t('sentActivity.status.pending', 'Pending')}</SelectItem>
              <SelectItem value="accepted">{t('sentActivity.status.accepted', 'Accepted')}</SelectItem>
              <SelectItem value="rejected">{t('sentActivity.status.rejected', 'Rejected')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sentActivities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {statusFilter === 'all' 
                ? t('coach.noSentActivities', 'No activities sent yet')
                : t('coach.noActivitiesWithStatus', 'No {{status}} activities', { status: statusFilter })}
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {sentActivities.map((activity) => {
                const Icon = getActivityIcon(activity.template_snapshot.icon);
                const color = activity.template_snapshot.color || '#10b981';
                
                return (
                  <div 
                    key={activity.id}
                    className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    {/* Activity Icon */}
                    <div 
                      className="flex-shrink-0 p-2 rounded-lg"
                      style={{ backgroundColor: hexToRgba(color, 0.2) }}
                    >
                      {activity.template_snapshot.custom_logo_url ? (
                        <img 
                          src={activity.template_snapshot.custom_logo_url} 
                          alt="" 
                          className="h-6 w-6 object-contain" 
                        />
                      ) : (
                        <Icon className="h-6 w-6" style={{ color }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h4 className="font-semibold truncate">
                            {activity.template_snapshot.title}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>→</span>
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={activity.recipient?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {activity.recipient?.full_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">
                              {activity.recipient?.full_name || 'Unknown Player'}
                            </span>
                          </div>
                        </div>
                        {getStatusBadge(activity.status)}
                      </div>

                      {/* Message preview */}
                      {activity.message && (
                        <div className="flex items-start gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{activity.message}</span>
                        </div>
                      )}

                      {/* Dates */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {t('sentActivity.sentOn', 'Sent')}: {format(new Date(activity.sent_at), 'MMM d, yyyy')}
                        </span>
                        {activity.responded_at && (
                          <span>
                            {activity.status === 'accepted' 
                              ? t('sentActivity.acceptedOn', 'Accepted')
                              : t('sentActivity.rejectedOn', 'Rejected')}: {format(new Date(activity.responded_at), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
