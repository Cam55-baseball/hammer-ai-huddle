import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pause, Play, Zap } from 'lucide-react';

export type ProgramStatus = 'not_started' | 'active' | 'paused';

interface ProgramStatusBannerProps {
  status: ProgramStatus;
  programName: string;
  programIcon?: React.ReactNode;
  programDescription?: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  loading?: boolean;
}

/** "Not started" landing card — shown instead of the full program UI. */
export function ProgramStartCard({
  programName,
  programIcon,
  programDescription,
  onStart,
  loading,
}: Pick<ProgramStatusBannerProps, 'programName' | 'programIcon' | 'programDescription' | 'onStart' | 'loading'>) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-sm border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6">
          <div className="bg-primary/10 rounded-full p-5">
            {programIcon || <Zap className="h-10 w-10 text-primary" />}
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">{programName}</h1>
            <p className="text-sm text-muted-foreground">
              {programDescription ||
                t(
                  'programStatus.startDescription',
                  'Start your structured training program to add workouts to your Game Plan.'
                )}
            </p>
          </div>
          <Button
            onClick={onStart}
            disabled={loading}
            className="w-full h-14 text-lg font-bold gap-2"
            size="lg"
          >
            <Play className="h-5 w-5" />
            {t('programStatus.startProgram', 'Start Program')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** Paused banner — shown above the read-only program content. */
export function ProgramPausedBanner({
  onResume,
  loading,
}: Pick<ProgramStatusBannerProps, 'onResume' | 'loading'>) {
  const { t } = useTranslation();

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardContent className="py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Pause className="h-5 w-5 text-amber-500" />
          <p className="text-sm font-medium">
            {t(
              'programStatus.pausedMessage',
              'Your program is paused. Resume anytime to continue your progression.'
            )}
          </p>
        </div>
        <Button onClick={onResume} disabled={loading} size="sm" className="gap-2 shrink-0">
          <Play className="h-4 w-4" />
          {t('programStatus.resumeProgram', 'Resume Program')}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Small pause button to embed in the page header when the program is active. */
export function ProgramPauseButton({
  onPause,
  loading,
}: Pick<ProgramStatusBannerProps, 'onPause' | 'loading'>) {
  const { t } = useTranslation();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onPause}
      disabled={loading}
      className="gap-1 text-xs"
    >
      <Pause className="h-3 w-3" />
      {t('programStatus.pauseProgram', 'Pause Program')}
    </Button>
  );
}
