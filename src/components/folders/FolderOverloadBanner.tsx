import { useState } from 'react';
import { AlertTriangle, X, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OverloadWarning } from '@/hooks/useFolderOverloadCheck';

interface FolderOverloadBannerProps {
  warnings: OverloadWarning[];
}

export function FolderOverloadBanner({ warnings }: FolderOverloadBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const relevant = warnings.filter(w => w.type === 'folder_overload');
  if (relevant.length === 0 || dismissed) return null;

  const hasWarning = relevant.some(w => w.severity === 'warning');

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border text-sm',
      hasWarning
        ? 'bg-destructive/10 border-destructive/30 text-destructive'
        : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400'
    )}>
      {hasWarning ? <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" /> : <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />}
      <div className="flex-1 space-y-1">
        {relevant.map((w, i) => (
          <div key={i}>
            <p className="font-medium">{w.message}</p>
            {w.suggestion && <p className="text-xs opacity-80">{w.suggestion}</p>}
          </div>
        ))}
      </div>
      <button onClick={() => setDismissed(true)} className="flex-shrink-0 opacity-60 hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
