import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrillContainerProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  children: ReactNode;
  timer?: ReactNode;
  metrics?: ReactNode;
  fatigueLevel?: number;
  onExit: () => void;
  className?: string;
}

export function DrillContainer({
  title,
  description,
  icon: Icon,
  children,
  timer,
  metrics,
  fatigueLevel = 0,
  onExit,
  className,
}: DrillContainerProps) {
  const { t } = useTranslation();
  
  // Apply fatigue-adaptive contrast reduction
  const fatigueOpacity = fatigueLevel > 70 ? 0.7 : fatigueLevel > 50 ? 0.85 : 1;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden border-2 border-tex-vision-primary/50 bg-tex-vision-primary-dark",
        className
      )}
      style={{ opacity: fatigueOpacity }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-tex-vision-primary/5 to-transparent pointer-events-none" />
      
      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-tex-vision-primary/20 border border-tex-vision-primary/30">
              <Icon className="h-6 w-6 text-tex-vision-primary-light" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-tex-vision-text">
                {title}
              </h2>
              {description && (
                <p className="text-sm text-tex-vision-text-muted">
                  {description}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {timer}
            <Button
              variant="ghost"
              size="icon"
              onClick={onExit}
              className="h-9 w-9 rounded-full bg-tex-vision-primary/10 hover:bg-tex-vision-primary/20 text-tex-vision-text"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative flex flex-col text-tex-vision-text">
        {/* Main drill content - takes available space */}
        <div className="flex-1 min-h-[300px] flex items-center justify-center">
          {children}
        </div>
        
        {/* Metrics - fixed at bottom, never overlapping game content */}
        {metrics && (
          <div className="pt-3 mt-2 border-t border-tex-vision-primary/20">
            {metrics}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
