import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface UpgradePromptProps {
  featureName: string;
  featureDescription?: string;
  variant?: 'inline' | 'full';
}

export function UpgradePrompt({ featureName, featureDescription, variant = 'inline' }: UpgradePromptProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (variant === 'full') {
    return (
      <div className="flex items-center justify-center min-h-[300px] p-6">
        <Card className="max-w-md w-full border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
          <CardContent className="flex flex-col items-center text-center pt-8 pb-6 space-y-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">
                {t('subscription.unlock', 'Unlock {{feature}}', { feature: featureName })}
              </h3>
              <p className="text-sm text-muted-foreground">
                {featureDescription || t('subscription.upgradeDescription', 'Upgrade your plan to access {{feature}} and unlock your full potential.', { feature: featureName })}
              </p>
            </div>
            <Button 
              onClick={() => navigate('/select-modules')}
              className="w-full gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {t('subscription.viewPlans', 'View Plans')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Inline variant — subtle card for embedding inside existing UI
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-center gap-3 py-3 px-4">
        <Lock className="h-5 w-5 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {t('subscription.unlock', 'Unlock {{feature}}', { feature: featureName })}
          </p>
          {featureDescription && (
            <p className="text-xs text-muted-foreground truncate">{featureDescription}</p>
          )}
        </div>
        <Button size="sm" variant="default" onClick={() => navigate('/select-modules')} className="flex-shrink-0">
          <Sparkles className="h-3 w-3 mr-1" />
          {t('subscription.upgrade', 'Upgrade')}
        </Button>
      </CardContent>
    </Card>
  );
}
