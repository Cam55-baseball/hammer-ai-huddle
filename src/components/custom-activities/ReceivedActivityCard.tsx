import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Lock, MessageSquare, Clock } from 'lucide-react';
import { SentActivityTemplate } from '@/types/sentActivity';
import { getActivityIcon } from './IconPicker';
import { hexToRgba } from '@/hooks/useUserColors';
import { formatDistanceToNow } from 'date-fns';

interface ReceivedActivityCardProps {
  activity: SentActivityTemplate;
  onAccept: () => void;
  onReject: () => void;
  isPending?: boolean;
}

export function ReceivedActivityCard({ activity, onAccept, onReject, isPending = true }: ReceivedActivityCardProps) {
  const { t } = useTranslation();
  const template = activity.template_snapshot;
  const Icon = getActivityIcon(template.icon);
  const hasLockedFields = activity.locked_fields.length > 0;

  return (
    <Card 
      className="overflow-hidden transition-all hover:shadow-md"
      style={{ borderColor: hexToRgba(template.color, 0.5) }}
    >
      <CardContent className="p-4 space-y-4">
        {/* Header with sender info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={activity.sender?.avatar_url || undefined} />
            <AvatarFallback>
              {activity.sender?.full_name?.charAt(0) || 'C'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {t('sentActivity.sentBy', 'Sent by')} <span className="font-bold">{activity.sender?.full_name || 'Coach'}</span>
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(activity.sent_at), { addSuffix: true })}
            </p>
          </div>
          {!isPending && (
            <Badge variant={activity.status === 'accepted' ? 'default' : 'secondary'}>
              {activity.status === 'accepted' ? t('sentActivity.statusAccepted') : t('sentActivity.statusRejected')}
            </Badge>
          )}
        </div>

        {/* Activity preview */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
          <div 
            className="p-2 rounded-lg flex-shrink-0"
            style={{ backgroundColor: hexToRgba(template.color, 0.2) }}
          >
            {template.custom_logo_url ? (
              <img src={template.custom_logo_url} alt="" className="h-6 w-6 object-contain" />
            ) : (
              <Icon className="h-6 w-6" style={{ color: template.color }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold truncate">{template.title}</h4>
            <Badge variant="secondary" className="text-xs mt-1">
              {t(`customActivity.types.${template.activity_type}`)}
            </Badge>
            {template.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {template.description}
              </p>
            )}
          </div>
        </div>

        {/* Coach message */}
        {activity.message && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <MessageSquare className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm italic">&ldquo;{activity.message}&rdquo;</p>
          </div>
        )}

        {/* Locked fields indicator */}
        {hasLockedFields && (
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {t('sentActivity.lockedFieldsCount', { count: activity.locked_fields.length })}:
            </span>
            <div className="flex flex-wrap gap-1">
              {activity.locked_fields.slice(0, 3).map(field => (
                <Badge key={field} variant="outline" className="text-xs">
                  {t(`sentActivity.locks.${field}`)}
                </Badge>
              ))}
              {activity.locked_fields.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{activity.locked_fields.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {!hasLockedFields && isPending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {t('sentActivity.fullyEditable', 'Fully Editable')}
            </Badge>
          </div>
        )}

        {/* Action buttons - only for pending */}
        {isPending && (
          <div className="flex items-center gap-2 pt-2">
            <Button 
              variant="outline" 
              className="flex-1 gap-2 text-destructive hover:text-destructive"
              onClick={onReject}
            >
              <X className="h-4 w-4" />
              {t('sentActivity.reject', 'Reject')}
            </Button>
            <Button 
              className="flex-1 gap-2"
              onClick={onAccept}
            >
              <Check className="h-4 w-4" />
              {t('sentActivity.accept', 'Accept')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
