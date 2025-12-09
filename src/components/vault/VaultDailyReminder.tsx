import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Lock, BookOpen, Sparkles, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VaultDailyReminderProps {
  daysUntilRecap: number;
  recapProgress: number; // 0-100
  isLocked?: boolean;
}

export function VaultDailyReminder({
  daysUntilRecap,
  recapProgress,
  isLocked = false,
}: VaultDailyReminderProps) {
  const { t } = useTranslation();

  if (isLocked) {
    return (
      <Card className="relative overflow-hidden border-muted bg-muted/30">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10" />
        <CardContent className="relative p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 rounded-full bg-muted/50 border border-border">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">{t('vault.locked.title')}</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {t('vault.locked.description')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-primary/30">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <CardContent className="relative p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">{t('vault.reminder.title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('vault.reminder.subtitle')}
              </p>
            </div>
          </div>
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
        </div>

        {/* Countdown Display */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
              {daysUntilRecap}
            </div>
            <div className="absolute -right-2 -top-1">
              <CalendarCheck className="h-6 w-6 text-primary/60" />
            </div>
          </div>
        </div>
        <p className="text-center text-sm font-medium">
          {daysUntilRecap === 1
            ? t('vault.reminder.dayUntilRecap')
            : t('vault.reminder.daysUntilRecap', { days: daysUntilRecap })}
        </p>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('vault.reminder.recapProgress')}</span>
            <span className="font-medium text-primary">{Math.round(recapProgress)}%</span>
          </div>
          <Progress value={recapProgress} className="h-3" />
        </div>

        {/* Motivational Message */}
        <div className={cn(
          "p-4 rounded-lg text-center",
          "bg-gradient-to-r from-primary/10 to-primary/5",
          "border border-primary/20"
        )}>
          <p className="text-sm font-medium italic text-primary">
            "{t('vault.reminder.stayConsistent')}"
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
