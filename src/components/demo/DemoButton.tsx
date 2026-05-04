import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function DemoButton() {
  const navigate = useNavigate();
  return (
    <Button variant="outline" size="sm" onClick={() => navigate('/demo')} className="gap-1.5 font-bold">
      <Sparkles className="h-4 w-4" /> Demo
    </Button>
  );
}
