import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMyCoachWorkouts } from '@/hooks/useCoachPrescriptions';
import { useWorkoutStaff } from '@/hooks/useWorkoutStaff';

/** A notification is a self-scoped projection of pending canonical sends. */
export function CoachWorkoutNotification() {
  const { isStaff, ready } = useWorkoutStaff();
  if (!ready || isStaff) return null;
  return <PlayerWorkoutNotification/>;
}
function PlayerWorkoutNotification() {
  const { fromCoaches, error } = useMyCoachWorkouts();
  const [open, setOpen] = useState(false);
  return <DropdownMenu open={open} onOpenChange={setOpen}>
    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Coach workout notifications${fromCoaches.length ? `, ${fromCoaches.length} waiting` : ''}`} className="relative h-8 w-8">
      <Bell className="h-4 w-4" />{fromCoaches.length > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-destructive px-1 text-xs text-destructive-foreground">{fromCoaches.length}</span>}
    </Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="z-50 max-h-[70vh] w-[min(90vw,340px)] overflow-y-auto bg-background p-3 text-foreground">
      <p className="mb-2 text-sm font-bold">From your coach</p>
      {error ? <p role="alert" className="text-xs text-destructive">Couldn't load coach workouts. Try again.</p> : fromCoaches.length === 0 ? <p className="text-xs text-muted-foreground">No workouts waiting.</p> : fromCoaches.map(rx => <Link key={rx.id} to="/my-custom-activities" onClick={() => setOpen(false)} className="block border-t border-border py-3 text-sm">
        <p className="font-medium break-words">{rx.sender_name ? `Coach ${rx.sender_name}` : 'Your coach'} sent you a {rx.category === 'lift' ? 'lifting' : rx.category} workout {rx.schedule_type === 'any_day' ? 'for any day' : `for ${new Date(`${rx.plan_date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long' })}`}</p><p className="text-xs text-muted-foreground">{rx.title} · {rx.plan_date} · Coach workouts</p>
      </Link>)}
    </DropdownMenuContent>
  </DropdownMenu>;
}