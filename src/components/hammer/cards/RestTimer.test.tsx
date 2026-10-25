import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {RestTimer} from './RestTimer';
afterEach(()=>{cleanup();vi.useRealTimers();});
describe('standalone rest controls',()=>{
 it('pauses at 1.47 elapsed and resumes without counting five paused seconds',()=>{
  vi.useFakeTimers();render(<RestTimer seconds={30}/>);
  fireEvent.click(screen.getByRole('button',{name:'Start rest timer'}));
  act(()=>vi.advanceTimersByTime(1470));
  fireEvent.click(screen.getByRole('button',{name:'Pause rest timer'}));
  act(()=>vi.advanceTimersByTime(5000));
  expect(screen.getByText('0:28.53')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Resume rest timer'}));
  act(()=>vi.advanceTimersByTime(530));
  expect(screen.getByText('0:28.00')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Stop timer'}));
  expect(screen.getByText('0:30.00')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Restart timer'}));
  act(()=>vi.advanceTimersByTime(100));
  expect(screen.getByText('0:29.90')).toBeTruthy();
 });
 it('cannot expose standalone controls on the canonical guided rest clock',()=>{
  render(<RestTimer seconds={30} initialStartedAt={Date.now()} managed/>);
  expect(screen.queryAllByRole('button')).toHaveLength(0);
 });
});