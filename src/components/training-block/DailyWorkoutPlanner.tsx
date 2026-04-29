import { useState } from 'react';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { useBlockWorkoutGenerator } from '@/hooks/useBlockWorkoutGenerator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarIcon, Sparkles, Save, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { BlockType, BlockIntent } from '@/types/eliteWorkout';

const FOCUS_OPTIONS: Array<{ value: string; label: string; type: BlockType; intent: BlockIntent }> = [
  { value: 'full_body', label: 'Full Body Strength', type: 'strength_output', intent: 'max_output' },
  { value: 'lower_body', label: 'Lower Body Power', type: 'power_speed', intent: 'max_output' },
  { value: 'upper_body', label: 'Upper Body Strength', type: 'strength_output', intent: 'accumulation' },
  { value: 'rotational', label: 'Rotational Power', type: 'power_speed', intent: 'elastic' },
  { value: 'sport_specific', label: 'Sport-Specific Skill', type: 'skill_transfer', intent: 'submax_technical' },
  { value: 'capacity', label: 'Conditioning / Capacity', type: 'capacity', intent: 'accumulation' },
  { value: 'recovery', label: 'Recovery / Mobility', type: 'recovery', intent: 'cns_downregulation' },
];

/**
 * DailyWorkoutPlanner — single-session AI workout for any chosen date.
 * Saves the result as a calendar event so it appears on the Game Plan for that day.
 */
export function DailyWorkoutPlanner() {
  const { user } = useAuth();
  const { sport } = useSportTheme();
  const queryClient = useQueryClient();
  const { generateExercises, isGenerating, result, clearResult, subscriptionReady } = useBlockWorkoutGenerator();

  const [date, setDate] = useState<Date>(new Date());
  const [focus, setFocus] = useState<string>('full_body');

  const selected = FOCUS_OPTIONS.find(f => f.value === focus) ?? FOCUS_OPTIONS[0];

  const handleGenerate = async () => {
    await generateExercises({
      blockType: selected.type,
      blockIntent: selected.intent,
      blockFocus: selected.value,
      sport: (sport === 'softball' ? 'softball' : 'baseball') as 'baseball' | 'softball',
    });
  };

  const saveToCalendar = useMutation({
    mutationFn: async () => {
      if (!user || !result) throw new Error('Missing data');
      const dateStr = format(date, 'yyyy-MM-dd');
      const exerciseList = result.exercises
        .map(e => `${e.name} — ${e.sets ?? 3}×${e.reps ?? 8}`)
        .join('\n');

      const { error } = await supabase.from('calendar_events').insert({
        user_id: user.id,
        event_date: dateStr,
        event_type: 'training_block',
        title: `Hammer Daily — ${selected.label}`,
        description: `${result.exercises.length} exercises · ~${result.estimatedDuration} min\n\n${exerciseList}`,
        sport: sport || 'baseball',
        color: '#6366f1',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['game-plan'] });
      toast.success(`Saved to your Game Plan for ${format(date, 'MMM d')}`);
      clearResult();
    },
    onError: () => toast.error('Failed to save workout'),
  });

  if (!subscriptionReady) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Dumbbell className="h-5 w-5 text-primary" />
            Daily Workout Plan
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate a single Hammer workout for any day. It lands on your Game Plan automatically.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={d => d && setDate(d)}
                    disabled={d => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Focus</Label>
              <Select value={focus} onValueChange={setFocus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FOCUS_OPTIONS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            size="lg"
            className="w-full gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? 'Generating…' : 'Generate Workout'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{selected.label}</CardTitle>
              <Badge variant="outline">~{result.estimatedDuration} min</Badge>
            </div>
            {result.reasoning && (
              <p className="text-xs text-muted-foreground">{result.reasoning}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {result.exercises.map((ex, i) => (
              <div key={ex.id || i} className="flex items-center justify-between text-sm py-2 px-3 rounded bg-muted/40">
                <span className="font-medium">{ex.name}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{ex.sets ?? 3}×{ex.reps ?? 8}</span>
                  {ex.cns_demand && <Badge variant="outline" className="text-[10px] h-4">{ex.cns_demand}</Badge>}
                </div>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => saveToCalendar.mutate()}
                disabled={saveToCalendar.isPending}
                className="flex-1 gap-2"
              >
                <Save className="h-4 w-4" />
                Save to {format(date, 'MMM d')}
              </Button>
              <Button variant="outline" onClick={clearResult}>Discard</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
