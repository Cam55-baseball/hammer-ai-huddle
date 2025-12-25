import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Clock, Bell, Pencil, Calendar, Dumbbell, Utensils, Play, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GamePlanTask } from '@/hooks/useGamePlan';
import { getActivityIcon } from '@/components/custom-activities';

interface CustomActivityDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: GamePlanTask | null;
  taskTime: string | null;
  taskReminder: number | null;
  onComplete: () => void;
  onEdit: () => void;
  onSaveTime: (time: string | null, reminder: number | null) => void;
}

export function CustomActivityDetailDialog({
  open,
  onOpenChange,
  task,
  taskTime,
  taskReminder,
  onComplete,
  onEdit,
  onSaveTime,
}: CustomActivityDetailDialogProps) {
  const { t } = useTranslation();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(taskTime || '');
  const [tempReminder, setTempReminder] = useState<number | null>(taskReminder);

  if (!task || !task.customActivityData) return null;

  const template = task.customActivityData.template;
  const IconComponent = getActivityIcon(template.icon);
  const customColor = template.color || '#10b981';

  const formatTimeDisplay = (time: string | null) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const handleSaveTime = () => {
    onSaveTime(tempTime || null, tempReminder);
    setShowTimePicker(false);
  };

  const handleRemoveTime = () => {
    setTempTime('');
    setTempReminder(null);
    onSaveTime(null, null);
    setShowTimePicker(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Header with color accent */}
        <div 
          className="p-6 pb-4"
          style={{ backgroundColor: `${customColor}20` }}
        >
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: customColor }}
              >
                <IconComponent className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-black text-foreground truncate">
                  {template.title}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t(`customActivity.types.${template.activity_type}`)}
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6 pt-2 space-y-4">
          {/* Description */}
          {template.description && (
            <p className="text-sm text-muted-foreground">{template.description}</p>
          )}

          {/* Duration & Intensity */}
          <div className="flex flex-wrap gap-3">
            {template.duration_minutes && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {template.duration_minutes} {t('customActivity.minutes')}
                </span>
              </div>
            )}
            {template.intensity && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium capitalize">
                  {t(`customActivity.intensity.${template.intensity}`)}
                </span>
              </div>
            )}
          </div>

          {/* Scheduled Time Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {t('customActivity.detail.scheduledFor')}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTempTime(taskTime || '');
                  setTempReminder(taskReminder);
                  setShowTimePicker(!showTimePicker);
                }}
                className="text-primary h-8"
              >
                {showTimePicker ? <X className="h-4 w-4" /> : <Clock className="h-4 w-4 mr-1" />}
                {showTimePicker ? t('common.cancel') : taskTime ? t('common.edit') : t('gamePlan.startTime.tapToSet')}
              </Button>
            </div>

            {/* Current time display */}
            {taskTime && !showTimePicker && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-medium text-primary">{formatTimeDisplay(taskTime)}</span>
                {taskReminder && (
                  <div className="flex items-center gap-1 ml-auto text-xs text-muted-foreground">
                    <Bell className="h-3 w-3" />
                    {t('gamePlan.reminder.minutesBefore', { minutes: taskReminder })}
                  </div>
                )}
              </div>
            )}

            {!taskTime && !showTimePicker && (
              <p className="text-sm text-muted-foreground italic">
                {t('customActivity.detail.noTimeSet')}
              </p>
            )}

            {/* Inline time picker */}
            <AnimatePresence>
              {showTimePicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">
                        {t('gamePlan.startTime.time')}
                      </label>
                      <Input
                        type="time"
                        value={tempTime}
                        onChange={(e) => setTempTime(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">
                        {t('gamePlan.reminder.remindMe')}
                      </label>
                      <Select 
                        value={tempReminder?.toString() || 'none'} 
                        onValueChange={(v) => setTempReminder(v === 'none' ? null : parseInt(v))}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder={t('gamePlan.reminder.noReminder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('gamePlan.reminder.noReminder')}</SelectItem>
                          <SelectItem value="5">{t('gamePlan.reminder.minutesBefore', { minutes: 5 })}</SelectItem>
                          <SelectItem value="10">{t('gamePlan.reminder.minutesBefore', { minutes: 10 })}</SelectItem>
                          <SelectItem value="15">{t('gamePlan.reminder.minutesBefore', { minutes: 15 })}</SelectItem>
                          <SelectItem value="20">{t('gamePlan.reminder.minutesBefore', { minutes: 20 })}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-2">
                      {taskTime && (
                        <Button variant="outline" size="sm" onClick={handleRemoveTime} className="flex-1">
                          {t('gamePlan.startTime.removeTime')}
                        </Button>
                      )}
                      <Button size="sm" onClick={handleSaveTime} className="flex-1">
                        {t('common.save')}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onEdit}
              className="flex-1 gap-2"
            >
              <Pencil className="h-4 w-4" />
              {t('customActivity.detail.editActivity')}
            </Button>
            <Button
              onClick={() => {
                onComplete();
                onOpenChange(false);
              }}
              className={cn(
                "flex-1 gap-2 font-bold",
                task.completed 
                  ? "bg-muted text-muted-foreground hover:bg-muted" 
                  : "bg-green-600 hover:bg-green-700 text-white"
              )}
              style={!task.completed ? { backgroundColor: customColor } : undefined}
            >
              <Check className="h-4 w-4" />
              {task.completed 
                ? t('customActivity.detail.markedComplete') 
                : t('customActivity.detail.markComplete')
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
