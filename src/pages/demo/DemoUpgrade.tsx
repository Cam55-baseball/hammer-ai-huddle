import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DemoLayout } from '@/components/demo/DemoLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { useDemoProgress } from '@/hooks/useDemoProgress';

export default function DemoUpgrade() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const from = params.get('from') ?? '';
  const { complete, logEvent } = useDemoProgress();

  useEffect(() => { void logEvent('unlock_click', from); }, [from, logEvent]);

  const handleContinue = async () => {
    await complete();
    navigate(`/select-modules?context=${encodeURIComponent(from)}`, { replace: true });
  };

  return (
    <DemoLayout showBack>
      <Card className="border-primary/40 bg-gradient-to-b from-primary/10 to-transparent">
        <CardContent className="space-y-4 p-6 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-primary" />
          <h2 className="text-xl font-black">Ready to unlock the real thing?</h2>
          <p className="text-sm text-muted-foreground">
            You've seen the preview. The full experience saves your reps, scores your sessions, and builds your roadmap.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={handleContinue} className="gap-2">
              <Sparkles className="h-4 w-4" /> See Plans
            </Button>
            <Button variant="ghost" onClick={() => navigate('/demo')}>Keep exploring demo</Button>
          </div>
        </CardContent>
      </Card>
    </DemoLayout>
  );
}
