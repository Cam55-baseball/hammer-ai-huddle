import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Lock } from 'lucide-react';
import { SentActivityTemplate } from '@/types/sentActivity';
import { getActivityIcon } from '@/components/custom-activities';
import { hexToRgba } from '@/hooks/useUserColors';
import { cn } from '@/lib/utils';

interface PendingCoachActivityCardProps {
  activity: SentActivityTemplate;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

export function PendingCoachActivityCard({ activity, onAccept, onReject }: PendingCoachActivityCardProps) {
  const { t } = useTranslation();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  
  const template = activity.template_snapshot;
  const Icon = getActivityIcon(template.icon);
  const isCoach = activity.sender?.role === 'coach';
  const hasLockedFields = activity.locked_fields && activity.locked_fields.length > 0;

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await onAccept();
    } finally {
      setIsAccepting(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await onReject();
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all",
        "bg-gradient-to-r from-blue-500/10 to-transparent",
        "hover:from-blue-500/15"
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
          disabled={isRejecting || isAccepting}
          onClick={handleReject}
          className="h-8 w-8 text-destructive hover:bg-destructive/10"
        >
          <X className="h-4 w-4" />
        </Button>
        <Button 
          size="sm"
          disabled={isAccepting || isRejecting}
          onClick={handleAccept}
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
}
