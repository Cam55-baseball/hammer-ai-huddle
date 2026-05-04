import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useDemoProgress } from '@/hooks/useDemoProgress';

// Adaptive entry button: shows "Start Here" for new users, "Resume Demo" mid-flow, "Explore" after.
export function DemoButton() {
  const navigate = useNavigate();
  const { progress } = useDemoProgress();

  let label = 'Demo';
  let path = '/demo';
  if (progress) {
    if (progress.demo_state === 'pending') {
      label = 'Start Here';
      path = '/start-here';
    } else if (progress.demo_state === 'in_progress') {
      label = 'Resume Demo';
      path = progress.resume_path || '/demo';
    } else {
      label = 'Explore';
      path = '/demo';
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={() => navigate(path)} className="gap-1.5 font-bold">
      <Sparkles className="h-4 w-4" /> {label}
    </Button>
  );
}
