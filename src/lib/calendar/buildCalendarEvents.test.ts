import { describe, it, expect } from 'vitest';
import {
  buildCalendarEvents,
  indexByDate,
  type BuildCalendarEventsInput,
} from './buildCalendarEvents';

const baseInput = (): BuildCalendarEventsInput => ({
  gamePlanDays: [],
  logs: [],
  templates: [],
  blocks: [],
  blockWorkouts: [],
});

describe('buildCalendarEvents', () => {
  it('is idempotent: same input → identical output', () => {
    const input: BuildCalendarEventsInput = {
      ...baseInput(),
      templates: [{ id: 't1', title: 'Mobility', deleted_at: null }],
      logs: [
        { id: 'l1', entry_date: '2025-01-15', template_id: 't1', completed: true },
        { id: 'l2', entry_date: '2025-01-16', template_id: 't1', completed: false },
      ],
    };
    const a = buildCalendarEvents(input);
    const b = buildCalendarEvents(input);
    expect(a).toEqual(b);
    expect(a.map((e) => e.id)).toEqual(b.map((e) => e.id));
  });

  it('still surfaces orphan logs and logs whose template was soft-deleted', () => {
    const events = buildCalendarEvents({
      ...baseInput(),
      templates: [
        { id: 'live', title: 'Live', deleted_at: null },
        { id: 'gone', title: 'Gone Activity', deleted_at: '2025-01-01' },
      ],
      logs: [
        { id: 'l1', entry_date: '2025-01-15', template_id: 'live', completed: false },
        { id: 'l2', entry_date: '2025-01-15', template_id: 'gone', completed: true },
        { id: 'l3', entry_date: '2025-01-15', template_id: null, completed: true, notes: 'Quick stretch' },
      ],
    });
    const ids = events.map((e) => e.sourceId).sort();
    expect(ids).toEqual(['l1', 'l2', 'l3']);
    const orphan = events.find((e) => e.sourceId === 'l3')!;
    expect(orphan.title).toBe('Quick stretch');
    expect((orphan.meta as any).orphan).toBe(true);
    const deleted = events.find((e) => e.sourceId === 'l2')!;
    expect(deleted.title).toBe('Gone Activity');
    expect((deleted.meta as any).templateDeleted).toBe(true);
  });

  it('falls back to performance_data.module then "Quick Log" for orphan logs', () => {
    const events = buildCalendarEvents({
      ...baseInput(),
      logs: [
        { id: 'l1', entry_date: '2025-01-15', template_id: null, completed: true, performance_data: { module: 'mobility' } },
        { id: 'l2', entry_date: '2025-01-15', template_id: null, completed: true },
      ],
    });
    expect(events.find((e) => e.sourceId === 'l1')!.title).toBe('Mobility');
    expect(events.find((e) => e.sourceId === 'l2')!.title).toBe('Quick Log');
  });

  it('does NOT project recurring soft-deleted templates', () => {
    const events = buildCalendarEvents({
      ...baseInput(),
      templates: [
        {
          id: 'gone',
          title: 'Gone',
          deleted_at: '2025-01-01',
          display_on_game_plan: true,
          recurring_days: [1, 2, 3, 4, 5],
        },
      ],
      rangeStart: '2025-01-13',
      rangeEnd: '2025-01-17',
    });
    expect(events).toEqual([]);
  });

  it('projects recurring templates whether display_on_game_plan is null or true; suppresses only when false', () => {
    const mk = (id: string, display_on_game_plan: boolean | null) => ({
      id,
      title: id,
      deleted_at: null,
      display_on_game_plan,
      recurring_days: [1], // Monday
    });
    const events = buildCalendarEvents({
      ...baseInput(),
      templates: [mk('a', null), mk('b', true), mk('c', false)],
      rangeStart: '2025-01-13', // Monday
      rangeEnd: '2025-01-13',
    });
    const ids = events.map((e) => e.sourceId).sort();
    expect(ids).toEqual(['a', 'b']);
  });

  it('excludes archived training blocks', () => {
    const events = buildCalendarEvents({
      ...baseInput(),
      blocks: [
        { id: 'b1', status: 'active' },
        { id: 'b2', status: 'archived' },
      ],
      blockWorkouts: [
        {
          id: 'w1',
          block_id: 'b1',
          scheduled_date: '2025-01-15',
          status: 'scheduled',
          workout_type: 'strength',
          day_label: 'Day 1',
          week_number: 1,
        },
        {
          id: 'w2',
          block_id: 'b2',
          scheduled_date: '2025-01-15',
          status: 'scheduled',
          workout_type: 'strength',
          day_label: 'Day 1',
          week_number: 1,
        },
      ],
    });
    expect(events.map((e) => e.sourceId)).toEqual(['w1']);
  });

  it('flips completion when block_workout.status=completed', () => {
    const events = buildCalendarEvents({
      ...baseInput(),
      blocks: [{ id: 'b1', status: 'active' }],
      blockWorkouts: [
        {
          id: 'w1',
          block_id: 'b1',
          scheduled_date: '2025-01-15',
          status: 'completed',
          workout_type: 'strength',
          day_label: 'Day 1',
          week_number: 1,
        },
      ],
    });
    expect(events[0].completed).toBe(true);
  });

  it('marks partial when game_plan_day not complete but some logs done', () => {
    const events = buildCalendarEvents({
      ...baseInput(),
      gamePlanDays: [{ date: '2025-01-15', is_completed: false }],
      templates: [{ id: 't1', title: 'A', deleted_at: null }],
      logs: [
        { id: 'l1', entry_date: '2025-01-15', template_id: 't1', completed: true },
        { id: 'l2', entry_date: '2025-01-15', template_id: 't1', completed: false },
      ],
    });
    const partials = events.filter((e) => e.partial);
    expect(partials.length).toBeGreaterThan(0);
  });

  it('does not mark partial when day fully completed', () => {
    const events = buildCalendarEvents({
      ...baseInput(),
      gamePlanDays: [{ date: '2025-01-15', is_completed: true }],
      templates: [{ id: 't1', title: 'A', deleted_at: null }],
      logs: [{ id: 'l1', entry_date: '2025-01-15', template_id: 't1', completed: true }],
    });
    expect(events.every((e) => !e.partial)).toBe(true);
  });

  it('projects recurring templates only on matching weekdays within range', () => {
    // 2025-01-13 is Monday (dow=1), 2025-01-14 Tue (dow=2)
    const events = buildCalendarEvents({
      ...baseInput(),
      templates: [
        {
          id: 't1',
          title: 'Mon-Wed-Fri',
          deleted_at: null,
          display_on_game_plan: true,
          recurring_days: [1, 3, 5],
        },
      ],
      rangeStart: '2025-01-13',
      rangeEnd: '2025-01-19',
    });
    const dates = events.map((e) => e.date).sort();
    expect(dates).toEqual(['2025-01-13', '2025-01-15', '2025-01-17']);
  });

  it('suppresses template projection when a log exists for that template+date', () => {
    const events = buildCalendarEvents({
      ...baseInput(),
      templates: [
        {
          id: 't1',
          title: 'Daily',
          deleted_at: null,
          display_on_game_plan: true,
          recurring_days: [1, 2, 3, 4, 5, 6, 0],
        },
      ],
      logs: [{ id: 'l1', entry_date: '2025-01-13', template_id: 't1', completed: true }],
      rangeStart: '2025-01-13',
      rangeEnd: '2025-01-13',
    });
    expect(events).toHaveLength(1);
    expect(events[0].source).toBe('custom_activity'); // log wins, not template projection
  });

  it('produces deterministic IDs', () => {
    const events = buildCalendarEvents({
      ...baseInput(),
      blocks: [{ id: 'b1', status: 'active' }],
      blockWorkouts: [
        {
          id: 'w1',
          block_id: 'b1',
          scheduled_date: '2025-01-15',
          status: 'scheduled',
          workout_type: 'strength',
          day_label: 'Day 1',
          week_number: 1,
        },
      ],
    });
    expect(events[0].id).toBe('training_block:w1:2025-01-15');
  });

  it('indexByDate groups events correctly', () => {
    const events = buildCalendarEvents({
      ...baseInput(),
      templates: [{ id: 't1', title: 'A', deleted_at: null }],
      logs: [
        { id: 'l1', entry_date: '2025-01-15', template_id: 't1', completed: false },
        { id: 'l2', entry_date: '2025-01-16', template_id: 't1', completed: false },
      ],
    });
    const idx = indexByDate(events);
    expect(idx['2025-01-15']).toHaveLength(1);
    expect(idx['2025-01-16']).toHaveLength(1);
  });
});
