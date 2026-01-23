import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDeletedActivities } from '@/hooks/useDeletedActivities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Trash2, 
  RotateCcw, 
  Clock, 
  AlertTriangle,
  Dumbbell,
  Flame,
  Heart,
  Zap,
  Target,
  Trophy,
  Timer,
  Activity,
  Footprints,
  Utensils,
  Moon,
  Sun,
  Coffee,
  Apple,
  Salad,
  Pill,
  Bike,
  Users,
  Clipboard,
  Pencil,
  Star,
  Sparkles
} from 'lucide-react';
import { GiBaseballBat } from 'react-icons/gi';
import { formatDistanceToNow } from 'date-fns';

interface RecentlyDeletedListProps {
  selectedSport: 'baseball' | 'softball';
  onRestore?: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  dumbbell: Dumbbell,
  flame: Flame,
  heart: Heart,
  zap: Zap,
  target: Target,
  trophy: Trophy,
  timer: Timer,
  activity: Activity,
  footprints: Footprints,
  utensils: Utensils,
  moon: Moon,
  sun: Sun,
  coffee: Coffee,
  apple: Apple,
  salad: Salad,
  pill: Pill,
  bike: Bike,
  baseball: GiBaseballBat,
  users: Users,
  clipboard: Clipboard,
  pencil: Pencil,
  star: Star,
  sparkles: Sparkles,
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  workout: 'Workout',
  running: 'Running',
  meal: 'Meal',
  warmup: 'Warm-up',
  recovery: 'Recovery',
  practice: 'Practice',
  short_practice: 'Short Practice',
  free_session: 'Free Session',
};

export function RecentlyDeletedList({ selectedSport, onRestore }: RecentlyDeletedListProps) {
  const { t } = useTranslation();
  const {
    deletedTemplates,
    loading,
    restoreTemplate,
    permanentlyDeleteTemplate,
    emptyTrash,
    getDaysRemaining
  } = useDeletedActivities(selectedSport);

  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [emptyingTrash, setEmptyingTrash] = useState(false);

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    const success = await restoreTemplate(id);
    setRestoringId(null);
    if (success && onRestore) {
      onRestore();
    }
  };

  const handlePermanentDelete = async (id: string) => {
    setDeletingId(id);
    await permanentlyDeleteTemplate(id);
    setDeletingId(null);
  };

  const handleEmptyTrash = async () => {
    setEmptyingTrash(true);
    await emptyTrash();
    setEmptyingTrash(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (deletedTemplates.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Trash2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {t('customActivity.noDeletedActivities', 'No Recently Deleted Activities')}
          </h3>
          <p className="text-muted-foreground text-sm max-w-md">
            {t('customActivity.noDeletedActivitiesDesc', 'When you delete activities, they will appear here for 30 days before being permanently removed.')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Empty Trash button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {t('customActivity.recentlyDeleted', 'Recently Deleted')}
          </h2>
          <Badge variant="secondary" className="ml-2">
            {deletedTemplates.length}
          </Badge>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={emptyingTrash}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t('customActivity.emptyTrash', 'Empty Trash')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t('customActivity.emptyTrashConfirmTitle', 'Empty Trash?')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('customActivity.emptyTrashConfirmDesc', 'This will permanently delete all {{count}} activities. This action cannot be undone.', { count: deletedTemplates.length })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleEmptyTrash} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('customActivity.deleteForever', 'Delete Forever')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-600 dark:text-amber-400">
            {t('customActivity.deletionWarning', 'Activities are permanently deleted after 30 days')}
          </p>
          <p className="text-muted-foreground mt-1">
            {t('customActivity.deletionWarningDesc', 'Restore activities you want to keep before they expire.')}
          </p>
        </div>
      </div>

      {/* Deleted templates grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {deletedTemplates.map((template) => {
          const IconComponent = ICON_MAP[template.icon] || Activity;
          const daysRemaining = getDaysRemaining(template.deleted_permanently_at);
          const isExpiringSoon = daysRemaining <= 7;
          const deletedAgo = template.deleted_at 
            ? formatDistanceToNow(new Date(template.deleted_at), { addSuffix: true })
            : '';

          return (
            <Card 
              key={template.id} 
              className="relative overflow-hidden opacity-75 hover:opacity-100 transition-opacity"
            >
              {/* Faded overlay */}
              <div className="absolute inset-0 bg-background/50 pointer-events-none" />
              
              <CardContent className="relative p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div 
                    className="p-2 rounded-lg opacity-60"
                    style={{ backgroundColor: `${template.color}20` }}
                  >
                    <IconComponent 
                      className="h-5 w-5" 
                      style={{ color: template.color }} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate line-through text-muted-foreground">
                      {template.display_nickname || template.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {ACTIVITY_TYPE_LABELS[template.activity_type] || template.activity_type}
                    </p>
                  </div>
                </div>

                {/* Deletion info */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{t('customActivity.deletedTime', 'Deleted {{time}}', { time: deletedAgo })}</span>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs ${isExpiringSoon ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    <AlertTriangle className={`h-3.5 w-3.5 ${isExpiringSoon ? 'animate-pulse' : ''}`} />
                    <span>
                      {daysRemaining === 0 
                        ? t('customActivity.expiringToday', 'Expiring today!')
                        : t('customActivity.expiresIn', 'Permanently deleted in {{days}} days', { days: daysRemaining })
                      }
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleRestore(template.id)}
                    disabled={restoringId === template.id}
                  >
                    <RotateCcw className={`h-4 w-4 mr-1.5 ${restoringId === template.id ? 'animate-spin' : ''}`} />
                    {t('customActivity.restore', 'Restore')}
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={deletingId === template.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {t('customActivity.permanentDeleteTitle', 'Delete Forever?')}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('customActivity.permanentDeleteDesc', 'This will permanently delete "{{name}}". This action cannot be undone.', { name: template.title })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handlePermanentDelete(template.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('customActivity.deleteForever', 'Delete Forever')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
