import { createContext, useContext, useMemo, ReactNode } from 'react';

export interface DemoModeShape {
  isDemo: boolean;
  isPreview: boolean;
  tier?: string;
  submodule?: string;
}

const DEFAULT: DemoModeShape = { isDemo: false, isPreview: false };
const DemoModeContext = createContext<DemoModeShape>(DEFAULT);

interface ProviderProps {
  /** Strict shape. Booleans are accepted as a convenience and treated as { isDemo, isPreview }. */
  value: DemoModeShape | boolean;
  children: ReactNode;
}

export function DemoModeProvider({ value, children }: ProviderProps) {
  const shape = useMemo<DemoModeShape>(() => {
    if (typeof value === 'boolean') return { isDemo: value, isPreview: value };
    return {
      isDemo: !!value.isDemo,
      isPreview: value.isPreview ?? !!value.isDemo,
      tier: value.tier,
      submodule: value.submodule,
    };
  }, [value]);
  return <DemoModeContext.Provider value={shape}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): DemoModeShape {
  return useContext(DemoModeContext);
}

/** Throws if called inside a demo subtree — use on real-data routes to defend against leaks. */
export function useAssertNotDemo(label = 'real-data hook'): void {
  const { isDemo } = useContext(DemoModeContext);
  if (isDemo) {
    const msg = `[demo-leak] ${label} mounted under DemoModeProvider`;
    if (import.meta.env.DEV) throw new Error(msg);
    console.error(msg);
  }
}
