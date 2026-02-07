import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SessionFocus, FOCUS_MESSAGE_FALLBACKS } from '@/data/speedLabProgram';

interface SpeedFocusCardProps {
  focus: SessionFocus;
  onContinue: () => void;
}

export function SpeedFocusCard({ focus, onContinue }: SpeedFocusCardProps) {
  const { t } = useTranslation();

  const message = t(
    `speedLab.focusMessages.${focus.messageKey}`,
    FOCUS_MESSAGE_FALLBACKS[focus.messageKey] || ''
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
      <Card className="w-full max-w-sm mx-auto border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6">
          <div className="text-7xl animate-in zoom-in duration-500">{focus.icon}</div>
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">
              {t('speedLab.focus.title', "Today's Speed Focus")}
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              {message}
            </p>
          </div>
          <p className="text-xs text-muted-foreground italic text-center">
            {t('speedLab.focus.fascia', 'Fast bodies are springy bodies.')}
          </p>
        </CardContent>
      </Card>
      <Button
        className="w-full max-w-sm mt-6 h-14 text-lg font-bold"
        size="lg"
        onClick={onContinue}
      >
        {t('speedLab.focus.letsGo', "Let's Go")}
      </Button>
    </div>
  );
}
