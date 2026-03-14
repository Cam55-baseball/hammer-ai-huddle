import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { User, Target, CalendarDays, BarChart3, Dumbbell, ChevronRight, Check, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StartHereGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const steps = [
  {
    icon: User,
    title: 'Complete Your Profile',
    description: 'Set your sport, position, and handedness for personalized training.',
    route: '/settings',
    color: 'text-blue-400',
  },
  {
    icon: Dumbbell,
    title: 'Log Your First Session',
    description: 'Head to Practice Hub and log hitting, pitching, or fielding reps.',
    route: '/practice',
    color: 'text-green-400',
  },
  {
    icon: Target,
    title: 'Check Your Game Plan',
    description: 'Your daily Game Plan shows what to work on today — check it every day.',
    route: '/',
    color: 'text-primary',
  },
  {
    icon: CalendarDays,
    title: 'Set Up Your Calendar',
    description: 'Schedule games, practices, and rest days to keep your plan on track.',
    route: '/calendar',
    color: 'text-amber-400',
  },
  {
    icon: BarChart3,
    title: 'Track Your Progress',
    description: 'Visit Analytics to see your development trends and MPI scores.',
    route: '/analytics',
    color: 'text-violet-400',
  },
];

export function StartHereGuide({ open, onOpenChange }: StartHereGuideProps) {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  const handleGoTo = (route: string) => {
    onOpenChange(false);
    navigate(route);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Start Here
          </DialogTitle>
          <DialogDescription>
            Follow these steps to get the most out of your training.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === activeStep;
            return (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                  isActive
                    ? 'bg-primary/10 border-primary/40'
                    : 'border-border hover:bg-accent/30'
                )}
              >
                <div className={cn('p-2 rounded-lg bg-muted/50', step.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{step.title}</p>
                  {isActive && (
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground font-bold">{i + 1}</span>
              </button>
            );
          })}
        </div>

        <Button
          onClick={() => handleGoTo(steps[activeStep].route)}
          className="w-full gap-2"
        >
          Go to {steps[activeStep].title}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
