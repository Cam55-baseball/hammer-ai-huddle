/**
 * Pure adapter: DerivedCalendarEvent (projection layer) → CalendarEvent (legacy UI shape).
 *
 * Keeps downstream components (CalendarDaySheet, CalendarView grid, AddCalendarEventDialog)
 * contract-stable while we transition the read path. No I/O, no side effects.
 */
import { Activity, Dumbbell, Flame, type LucideIcon } from 'lucide-react';
import type { CalendarEvent } from '@/hooks/useCalendar';
import type { DerivedCalendarEvent } from './buildCalendarEvents';
import { getOrderKey } from '@/hooks/useCalendarDayOrders';

const sourceColorFallback: Record<string, string> = {
  custom_activity: '#8b5cf6',
  custom_activity_template: '#8b5cf6',
  training_block: '#f97316',
  game_plan: '#3b82f6',
};

const sourceIcon = (source: DerivedCalendarEvent['source']): LucideIcon => {
  switch (source) {
    case 'training_block':
      return Dumbbell;
    case 'custom_activity':
    case 'custom_activity_template':
      return Activity;
    case 'game_plan':
      return Flame;
    default:
      return Activity;
  }
};

const sourceToType = (
  source: DerivedCalendarEvent['source'],
): CalendarEvent['type'] => {
  switch (source) {
    case 'custom_activity':
    case 'custom_activity_template':
      return 'custom_activity';
    case 'training_block':
      return 'program';
    case 'game_plan':
      return 'game_plan';
    default:
      return 'custom_activity';
  }
};

export function derivedToCalendarEvent(d: DerivedCalendarEvent): CalendarEvent {
  const meta = d.meta as {
    color?: string | null;
    sport?: string | null;
    startTime?: string | null;
    notes?: string | null;
    templateId?: string;
    blockId?: string;
    workoutType?: string;
  };

  const type = sourceToType(d.source);
  const color = meta.color || sourceColorFallback[d.source] || '#6b7280';
  const startTime = meta.startTime ?? null;

  // Stable id: derived ids already deterministic; reuse to keep React keys stable.
  const id = d.id;

  // Source string for legacy contract:
  //   custom_activity_template → `template-{templateId}` (matches legacy template events)
  //   custom_activity (log)    → `template-{templateId}` (matches legacy log events)
  //   training_block           → workoutType or 'training_block'
  //   game_plan                → 'game_plan'
  let legacySource = d.sourceId;
  if (d.source === 'custom_activity_template' && meta.templateId) {
    legacySource = `template-${meta.templateId}`;
  } else if (d.source === 'custom_activity' && meta.templateId) {
    legacySource = `template-${meta.templateId}`;
  } else if (d.source === 'training_block') {
    legacySource = meta.workoutType || 'training_block';
  } else if (d.source === 'game_plan') {
    legacySource = 'game_plan';
  }

  const event: CalendarEvent = {
    id,
    date: d.date,
    title: d.title,
    description: meta.notes ?? undefined,
    startTime,
    endTime: null,
    allDay: false,
    type,
    source: legacySource,
    color,
    icon: sourceIcon(d.source),
    completed: d.completed,
    editable: d.source === 'custom_activity', // only concrete logs are editable here
    deletable: d.source === 'custom_activity',
    sport: meta.sport ?? undefined,
  };
  event.orderKey = getOrderKey(event);
  return event;
}

/**
 * Merge derived events with legacy events.
 *
 * Strategy: derived layer is authoritative for its 4 sources
 * (custom_activity logs/templates, training_block workouts, game_plan_days).
 * Legacy events from those source types are dropped to avoid duplication;
 * all other legacy event types (athlete_event, meal, manual, scheduled_practice,
 * game_plan task_schedule defaults/gated, sub_module program rows) pass through unchanged.
 */
const DERIVED_LEGACY_TYPES = new Set<CalendarEvent['type']>([
  'custom_activity',
  'program',
]);

const isDerivedReplaceable = (e: CalendarEvent): boolean => {
  // Derived owns custom_activity (logs + template projections) entirely.
  if (e.type === 'custom_activity') return true;
  // For 'program', derived currently only knows training_block workouts —
  // which legacy doesn't surface as 'program' (those are sub_module_progress).
  // So leave legacy 'program' rows alone; training_block events are additive.
  return false;
};

export function mergeDerivedAndLegacyEvents(
  legacy: Record<string, CalendarEvent[]>,
  derived: DerivedCalendarEvent[],
): Record<string, CalendarEvent[]> {
  const out: Record<string, CalendarEvent[]> = {};
  for (const [date, list] of Object.entries(legacy)) {
    out[date] = list.filter((e) => !isDerivedReplaceable(e));
  }
  for (const d of derived) {
    const adapted = derivedToCalendarEvent(d);
    (out[d.date] ||= []).push(adapted);
  }
  return out;
}
