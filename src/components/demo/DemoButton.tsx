import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useDemoProgress } from '@/hooks/useDemoProgress';

// Always-on entry button. Label is fixed as "Demo" regardless of progress state;
// destination still resumes mid-flow when applicable.
export function DemoButton() {
  const navigate = useNavigate();
  const { progress } = useDemoProgress();

  const path =
    progress?.demo_state === 'in_progress'
      ? progress.resume_path || '/demo'
      : '/demo';

  return (
    <Button variant="outline" size="sm" onClick={() => navigate(path)} className="gap-1.5 font-bold">
      <Sparkles className="h-4 w-4" /> Demo
    </Button>
  );
}
