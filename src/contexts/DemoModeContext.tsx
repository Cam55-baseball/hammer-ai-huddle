import { createContext, useContext, ReactNode } from 'react';

const DemoModeContext = createContext<boolean>(false);

export function DemoModeProvider({ value = true, children }: { value?: boolean; children: ReactNode }) {
  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): boolean {
  return useContext(DemoModeContext);
}
