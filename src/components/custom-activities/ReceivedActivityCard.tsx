import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Lock, MessageSquare, Clock, Sparkles, GraduationCap, Search } from 'lucide-react';
import { SentActivityTemplate } from '@/types/sentActivity';
import { getActivityIcon } from './IconPicker';
import { hexToRgba } from '@/hooks/useUserColors';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

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
  const senderRole = activity.sender?.role || 'scout';
  const isCoach = senderRole === 'coach';

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-300 border-2",
        isPending && "hover:shadow-xl hover:scale-[1.01] hover:-translate-y-0.5"
      )}
      style={{ 
        borderColor: hexToRgba(template.color, 0.5),
        background: `linear-gradient(145deg, ${hexToRgba(template.color, 0.06)} 0%, transparent 50%)`
      }}
    >
      {/* Top accent bar */}
      <div 
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${template.color}, ${hexToRgba(template.color, 0.3)})` }}
      />
      
      <CardContent className="p-4 space-y-4">
        {/* Header with sender info */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-11 w-11 ring-2 ring-offset-2 ring-offset-background" style={{ 
              '--tw-ring-color': isCoach ? 'hsl(var(--primary))' : 'hsl(var(--secondary))' 
            } as React.CSSProperties}>
              <AvatarImage src={activity.sender?.avatar_url || undefined} />
              <AvatarFallback className="font-bold" style={{ backgroundColor: hexToRgba(template.color, 0.2) }}>
                {activity.sender?.full_name?.charAt(0) || 'C'}
              </AvatarFallback>
            </Avatar>
            {isPending && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center">
                <span className="animate-ping absolute h-full w-full rounded-full bg-primary/60" />
                <Sparkles className="h-3 w-3 text-primary relative" />
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium">
                {t('sentActivity.sentBy', 'Sent by')} <span className="font-bold text-foreground">{activity.sender?.full_name || 'Coach'}</span>
              </p>
              {/* Role badge */}
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs font-semibold gap-1",
                  isCoach 
                    ? "bg-primary/10 text-primary border-primary/30" 
                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                )}
              >
                {isCoach ? (
                  <>
                    <GraduationCap className="h-3 w-3" />
                    {t('sentActivity.fromCoach', 'From your Coach')}
                  </>
                ) : (
                  <>
                    <Search className="h-3 w-3" />
                    {t('sentActivity.fromScout', 'From a Scout')}
                  </>
                )}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(activity.sent_at), { addSuffix: true })}
            </p>
          </div>
          {!isPending && (
            <Badge 
              variant={activity.status === 'accepted' ? 'default' : 'secondary'}
              className={cn(
                "font-semibold",
                activity.status === 'accepted' && "bg-green-500/20 text-green-600 border border-green-500/30"
              )}
            >
              {activity.status === 'accepted' ? t('sentActivity.statusAccepted') : t('sentActivity.statusRejected')}
            </Badge>
          )}
        </div>

        {/* Activity preview */}
        <div 
          className="flex items-start gap-3 p-4 rounded-xl border-2 transition-all"
          style={{ 
            backgroundColor: hexToRgba(template.color, 0.08),
            borderColor: hexToRgba(template.color, 0.2)
          }}
        >
          <div 
            className="p-2.5 rounded-xl flex-shrink-0 shadow-md"
            style={{ 
              backgroundColor: hexToRgba(template.color, 0.25),
              boxShadow: `0 4px 12px ${hexToRgba(template.color, 0.25)}`
            }}
          >
            {template.custom_logo_url ? (
              <img src={template.custom_logo_url} alt="" className="h-7 w-7 object-contain" />
            ) : (
              <Icon className="h-7 w-7" style={{ color: template.color }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-base line-clamp-1">{template.title}</h4>
            <Badge 
              variant="secondary" 
              className="text-xs mt-1.5 font-semibold"
              style={{ 
                backgroundColor: hexToRgba(template.color, 0.15),
                color: template.color
              }}
            >
              {t(`customActivity.types.${template.activity_type}`)}
            </Badge>
            {template.description && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                {template.description}
              </p>
            )}
          </div>
        </div>

        {/* Coach message */}
        {activity.message && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
            <MessageSquare className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm italic leading-relaxed">&ldquo;{activity.message}&rdquo;</p>
          </div>
        )}

        {/* Locked fields indicator */}
        {hasLockedFields && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="text-xs font-medium">
                {t('sentActivity.lockedFieldsCount', { count: activity.locked_fields.length })}:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activity.locked_fields.slice(0, 3).map(field => (
                <Badge key={field} variant="outline" className="text-xs bg-muted/50">
                  {t(`sentActivity.locks.${field}`)}
                </Badge>
              ))}
              {activity.locked_fields.length > 3 && (
                <Badge variant="outline" className="text-xs bg-muted/50">
                  +{activity.locked_fields.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {!hasLockedFields && isPending && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/30 text-green-600 font-medium">
              <Check className="h-3 w-3 mr-1" />
              {t('sentActivity.fullyEditable', 'Fully Editable')}
            </Badge>
          </div>
        )}

        {/* Action buttons - only for pending */}
        {isPending && (
          <div className="flex items-center gap-3 pt-3 border-t border-border/50">
            <Button 
              variant="outline" 
              className="flex-1 gap-2 font-semibold border-2 hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-all"
              onClick={onReject}
            >
              <X className="h-4 w-4" />
              {t('sentActivity.reject', 'Reject')}
            </Button>
            <Button 
              className="flex-1 gap-2 font-semibold shadow-lg transition-all hover:scale-[1.02]"
              style={{ 
                background: `linear-gradient(135deg, ${template.color}, ${hexToRgba(template.color, 0.8)})`,
                boxShadow: `0 4px 14px ${hexToRgba(template.color, 0.4)}`
              }}
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
