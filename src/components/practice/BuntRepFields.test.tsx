import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/hooks/useSportConfig', () => ({useSportConfig:()=>({pitchTypes:[]})}));
import { BuntRepFields } from './BuntRepFields';
afterEach(cleanup);
describe('side-specific entered bunt outcomes', () => {
  it('records false and unknown distinctly, without inventing a success from contact quality', () => {
    const change=vi.fn();
    render(<BuntRepFields value={{}} onChange={change} batterSide="R" mode="quick" />);
    fireEvent.click(screen.getByRole('button',{name:'No'}));
    expect(change).toHaveBeenLastCalledWith('bunt_success',false);
    fireEvent.click(screen.getByRole('button',{name:'Not entered'}));
    expect(change).toHaveBeenLastCalledWith('bunt_success',undefined);
  });
  it('switch left-side choices exclude push while right-side records its own type', () => {
    const change=vi.fn();
    const view=render(<BuntRepFields value={{}} onChange={change} batterSide="L" switchHitter mode="quick" />);
    expect(screen.queryByRole('button',{name:/Push bunt/})).toBeNull();
    view.rerender(<BuntRepFields value={{}} onChange={change} batterSide="R" switchHitter mode="quick" />);
    fireEvent.click(screen.getByRole('button',{name:/Push bunt/}));
    expect(change).toHaveBeenLastCalledWith('bunt_type','push');
  });
});