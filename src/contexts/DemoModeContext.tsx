import { createContext, useContext, ReactNode } from 'react';

export interface DemoModeShape {
  isDemo: boolean;
  isPreview: boolean;
  tier?: string;
  submodule?: string;
}

const DemoModeContext = createContext<DemoModeShape>({ isDemo: false, isPreview: false });

interface ProviderProps {
  value?: Partial<DemoModeShape> | boolean;
  children: ReactNode;
}

export function DemoModeProvider({ value = true, children }: ProviderProps) {
  const shape: DemoModeShape =
    typeof value === 'boolean'
      ? { isDemo: value, isPreview: value }
      : { isDemo: value.isDemo ?? true, isPreview: value.isPreview ?? true, tier: value.tier, submodule: value.submodule };
  return <DemoModeContext.Provider value={shape}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): DemoModeShape {
  return useContext(DemoModeContext);
}
