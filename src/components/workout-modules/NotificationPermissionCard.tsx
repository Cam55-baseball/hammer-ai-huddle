import React from 'react';
import { Bell, BellOff, BellRing, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

interface NotificationPermissionCardProps {
  permission: NotificationPermission | 'unsupported';
  isSupported: boolean;
  onRequestPermission: () => Promise<boolean>;
}

export function NotificationPermissionCard({
  permission,
  isSupported,
  onRequestPermission,
}: NotificationPermissionCardProps) {
  const { t } = useTranslation();
  const [isRequesting, setIsRequesting] = React.useState(false);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      await onRequestPermission();
    } finally {
      setIsRequesting(false);
    }
  };

  const getStatusConfig = () => {
    if (!isSupported) {
      return {
        icon: BellOff,
        badge: t('workoutModules.notifications.notificationsUnsupported', 'Unsupported'),
        badgeClass: 'bg-muted text-muted-foreground',
        iconClass: 'text-muted-foreground',
        message: t('workoutModules.notifications.notificationsUnsupportedMessage', "Your browser doesn't support notifications"),
        showButton: false,
      };
    }

    switch (permission) {
      case 'granted':
        return {
          icon: BellRing,
          badge: t('workoutModules.notifications.notificationsEnabled', 'Enabled'),
          badgeClass: 'bg-green-500/20 text-green-600 dark:text-green-400',
          iconClass: 'text-green-500',
          message: t('workoutModules.notifications.notificationsEnabledMessage', "You'll receive a notification when your next workout unlocks"),
          showButton: false,
        };
      case 'denied':
        return {
          icon: BellOff,
          badge: t('workoutModules.notifications.notificationsBlocked', 'Blocked'),
          badgeClass: 'bg-destructive/20 text-destructive',
          iconClass: 'text-destructive',
          message: t('workoutModules.notifications.notificationsBlockedHelp', 'To enable notifications, please update your browser settings'),
          showButton: false,
        };
      default:
        return {
          icon: Bell,
          badge: t('workoutModules.notifications.notificationsDisabled', 'Disabled'),
          badgeClass: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
          iconClass: 'text-yellow-500',
          message: t('workoutModules.notifications.notificationsDescription', 'Get notified when your next workout unlocks'),
          showButton: true,
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-background ${config.iconClass}`}>
            <IconComponent className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm">
                {t('workoutModules.notifications.notificationsTitle', 'Workout Notifications')}
              </h4>
              <Badge variant="secondary" className={`text-xs ${config.badgeClass}`}>
                {config.badge}
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground mt-1">
              {config.message}
            </p>

            {config.showButton && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className="mt-2 h-8 text-xs"
              >
                <Bell className="h-3 w-3 mr-1.5" />
                {t('workoutModules.notifications.enableNotifications', 'Enable Notifications')}
              </Button>
            )}

            {permission === 'denied' && (
              <div className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{t('workoutModules.notifications.browserSettingsHelp', 'Click the lock icon in your browser address bar to change notification settings')}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
