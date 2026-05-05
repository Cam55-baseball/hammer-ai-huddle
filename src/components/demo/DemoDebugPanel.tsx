interface Props {
  progress: unknown;
}

/**
 * Toggleable real-time state introspection for the demo system.
 * Enable via console: localStorage.setItem('demo_debug', '1') and reload.
 */
export function DemoDebugPanel({ progress }: Props) {
  if (typeof localStorage === 'undefined') return null;
  if (localStorage.getItem('demo_debug') !== '1') return null;

  return (
    <div className="fixed bottom-2 right-2 z-[9999] max-h-[40vh] w-[320px] overflow-auto rounded-md border border-border bg-card/95 p-2 text-[10px] shadow-lg backdrop-blur">
      <p className="mb-1 font-black uppercase tracking-wide text-muted-foreground">demo debug</p>
      <pre className="whitespace-pre-wrap break-all text-[10px] leading-tight">
        {JSON.stringify(progress, null, 2)}
      </pre>
    </div>
  );
}
