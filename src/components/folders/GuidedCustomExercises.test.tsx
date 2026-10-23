import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GuidedCustomExercises } from './GuidedCustomExercises';
import type { ActivityFolderItem } from '@/types/activityFolder';
const item = { id: 'accepted-card', title: 'Coach work', item_type: 'workout' } as ActivityFolderItem;
afterEach(() => { cleanup(); sessionStorage.clear(); vi.useRealTimers(); });
describe('coach-sent canonical guided logging', () => {
  it('saves entered reps with the declared two sets and waits the declared 45 seconds', async () => {
    vi.useFakeTimers(); const save = vi.fn(async (_data: unknown) => {});
    render(<GuidedCustomExercises storageKey="coach-proof" exercises={[{ id: 'rep', name: 'Coach drill', type: 'baseball', sets: 2, reps: 8, rest: 45 }]} item={item} performanceData={undefined} onSave={save} />);
    fireEvent.click(screen.getByRole('button', { name: /^Start$/ }));
    fireEvent.change(screen.getAllByPlaceholderText('Reps')[0], { target: { value: '8' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /^Next$/ })));
    expect(save.mock.calls[0]?.[0]).toMatchObject({ exerciseSets: { rep: { sets: [{ set: 1, reps: 8 }, { set: 2 }] } } });
    expect(JSON.parse(sessionStorage.getItem('coach-proof') ?? '{}')).toMatchObject({ row: 0, restSeconds: 45 });
    await act(async () => vi.advanceTimersByTime(44900));
    expect(JSON.parse(sessionStorage.getItem('coach-proof') ?? '{}').row).toBe(0);
    await act(async () => vi.advanceTimersByTime(100));
    expect(JSON.parse(sessionStorage.getItem('coach-proof') ?? '{}').row).toBe(1);
  });
  it('preserves hundredths for a declared hold and blocks advancement when the canonical save fails', async () => {
    const save = vi.fn(async (_data: unknown) => { throw new Error('offline'); });
    render(<GuidedCustomExercises storageKey="coach-proof" exercises={[{ id: 'hold', name: 'Hold', type: 'core', sets: 1, duration: 1.47, rest: 30 }]} item={item} performanceData={undefined} onSave={save} />);
    fireEvent.click(screen.getByRole('button', { name: /^Start$/ }));
    fireEvent.change(screen.getByPlaceholderText('Sec'), { target: { value: '1.47' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /^Next$/ })));
    expect(save.mock.calls[0]?.[0]).toMatchObject({ exerciseSets: { hold: { sets: [{ time: 1.47, time_unit: 'sec' }] } } });
    expect(JSON.parse(sessionStorage.getItem('coach-proof') ?? '{}')).toMatchObject({ row: 0, restingUntil: null });
    expect(screen.getByRole('alert')).toBeTruthy();
  });
  it('does not mark a skipped empty set as performed', async () => {
    const save = vi.fn(async (_data: unknown) => {});
    render(<GuidedCustomExercises storageKey="coach-proof" exercises={[{ id: 'rep', name: 'Coach drill', type: 'baseball', sets: 2, reps: 8, rest: 45 }]} item={item} performanceData={undefined} onSave={save} />);
    fireEvent.click(screen.getByRole('button', { name: /^Start$/ }));
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /^Skip$/ })));
    expect(save.mock.calls[0]?.[0]).toMatchObject({ exerciseSets: { rep: { sets: [{ set: 1, reps: undefined }, { set: 2, reps: undefined }] } } });
    expect(save.mock.calls[0]?.[0]).not.toHaveProperty('checkboxStates');
    expect(JSON.parse(sessionStorage.getItem('coach-proof') ?? '{}').row).toBe(1);
  });
});