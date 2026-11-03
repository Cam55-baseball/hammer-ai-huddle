import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StartHammersTodayCardView } from './StartHammersTodayCard';
it('cannot invoke Start while the current required-detail read failed',()=>{
 const start=vi.fn();
 render(<MemoryRouter><StartHammersTodayCardView onStart={start} starting={false} error={null} locked missing={[{key:'health',label:'Anything hurt right now?',to:'/dashboard'}]} positions={['SS']} sport="baseball" age={15}/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button'));
 expect(start).not.toHaveBeenCalled();
});
