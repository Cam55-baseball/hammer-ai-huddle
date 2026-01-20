import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { CreateCalendarEvent } from '@/hooks/useCalendar';
import { toast } from 'sonner';

interface AddCalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  onAdd: (event: CreateCalendarEvent) => Promise<boolean>;
  sport: 'baseball' | 'softball';
}

const EVENT_TYPES = [
  { value: 'event', label: 'General Event' },
  { value: 'game', label: 'Game Day' },
  { value: 'practice', label: 'Practice' },
  { value: 'training', label: 'Training' },
  { value: 'rest', label: 'Rest Day' },
  { value: 'travel', label: 'Travel' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'other', label: 'Other' },
];

const EVENT_COLORS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#22c55e', label: 'Green' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#ef4444', label: 'Red' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#14b8a6', label: 'Teal' },
];

export function AddCalendarEventDialog({
  open,
  onOpenChange,
  date,
  onAdd,
  sport,
}: AddCalendarEventDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('event');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState('#3b82f6');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(15);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEventType('event');
    setStartTime('');
    setEndTime('');
    setAllDay(false);
    setColor('#3b82f6');
    setReminderEnabled(false);
    setReminderMinutes(15);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error(t('calendar.errors.titleRequired', 'Please enter a title'));
      return;
    }

    setLoading(true);
    try {
      const event: CreateCalendarEvent = {
        event_date: format(date, 'yyyy-MM-dd'),
        event_type: eventType,
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: allDay ? undefined : startTime || undefined,
        end_time: allDay ? undefined : endTime || undefined,
        all_day: allDay,
        color,
        reminder_enabled: reminderEnabled,
        reminder_minutes: reminderEnabled ? reminderMinutes : undefined,
        sport,
      };

      const success = await onAdd(event);
      if (success) {
        toast.success(t('calendar.eventAdded', 'Event added'));
        resetForm();
        onOpenChange(false);
      } else {
        toast.error(t('calendar.errors.addFailed', 'Failed to add event'));
      }
    } catch (error) {
      console.error('Error adding event:', error);
      toast.error(t('calendar.errors.addFailed', 'Failed to add event'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('calendar.addEvent', 'Add Event')}
          </DialogTitle>
          <DialogDescription>
            {format(date, 'EEEE, MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh] pr-4">
        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('calendar.form.title', 'Title')} *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('calendar.form.titlePlaceholder', 'Event title')}
              autoFocus
            />
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label>{t('calendar.form.type', 'Type')}</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {t(`calendar.types.${type.value}`, type.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('calendar.form.description', 'Description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('calendar.form.descriptionPlaceholder', 'Optional details')}
              rows={2}
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="allDay">{t('calendar.form.allDay', 'All Day')}</Label>
            <Switch
              id="allDay"
              checked={allDay}
              onCheckedChange={setAllDay}
            />
          </div>

          {/* Time Selection */}
          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startTime" className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {t('calendar.form.startTime', 'Start')}
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">{t('calendar.form.endTime', 'End')}</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Color */}
          <div className="space-y-2">
            <Label>{t('calendar.form.color', 'Color')}</Label>
            <div className="flex gap-2 flex-wrap">
              {EVENT_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c.value ? 'ring-2 ring-primary ring-offset-2 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Reminder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="reminder">{t('calendar.form.reminder', 'Reminder')}</Label>
              <Switch
                id="reminder"
                checked={reminderEnabled}
                onCheckedChange={setReminderEnabled}
              />
            </div>
            
            {reminderEnabled && (
              <Select 
                value={reminderMinutes.toString()} 
                onValueChange={(v) => setReminderMinutes(parseInt(v, 10))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 {t('calendar.minutes', 'minutes before')}</SelectItem>
                  <SelectItem value="10">10 {t('calendar.minutes', 'minutes before')}</SelectItem>
                  <SelectItem value="15">15 {t('calendar.minutes', 'minutes before')}</SelectItem>
                  <SelectItem value="30">30 {t('calendar.minutes', 'minutes before')}</SelectItem>
                  <SelectItem value="60">1 {t('calendar.hour', 'hour before')}</SelectItem>
                </SelectContent>
              </Select>
          )}
          </div>
        </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('common.loading', 'Adding...')}
              </>
            ) : (
              t('calendar.addEvent', 'Add Event')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
