import { useTranslation } from 'react-i18next';
import { Wind, Headphones, Scan, Pause } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MeditationLibrary from './MeditationLibrary';
import BodyScanGuide from './BodyScanGuide';
import PauseResetButton from './PauseResetButton';
import BoxBreathing from '@/components/mind-fuel/emotional-awareness/BoxBreathing';

export default function MindfulnessHome() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wind className="h-6 w-6 text-wellness-sky" />
            {t('mindfulness.title', 'Mindfulness')}
          </h2>
          <p className="text-muted-foreground">
            {t('mindfulness.subtitle', 'Calm your mind, focus your energy')}
          </p>
        </div>
        <PauseResetButton />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="meditation" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="meditation" className="flex items-center gap-2">
            <Headphones className="h-4 w-4" />
            <span className="hidden sm:inline">{t('mindfulness.tabs.meditation', 'Meditate')}</span>
          </TabsTrigger>
          <TabsTrigger value="bodyscan" className="flex items-center gap-2">
            <Scan className="h-4 w-4" />
            <span className="hidden sm:inline">{t('mindfulness.tabs.bodyScan', 'Body Scan')}</span>
          </TabsTrigger>
          <TabsTrigger value="breathing" className="flex items-center gap-2">
            <Wind className="h-4 w-4" />
            <span className="hidden sm:inline">{t('mindfulness.tabs.breathing', 'Breathing')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meditation">
          <MeditationLibrary />
        </TabsContent>

        <TabsContent value="bodyscan">
          <BodyScanGuide />
        </TabsContent>

        <TabsContent value="breathing">
          <BoxBreathing />
        </TabsContent>
      </Tabs>

      {/* Quick Tips */}
      <div className="p-4 bg-wellness-sky/10 rounded-xl">
        <h4 className="font-medium text-sm mb-2">
          {t('mindfulness.quickTips.title', 'Mindfulness Tips')}
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• {t('mindfulness.quickTips.tip1', 'Start with just 2-5 minutes per day')}</li>
          <li>• {t('mindfulness.quickTips.tip2', 'Consistency matters more than duration')}</li>
          <li>• {t('mindfulness.quickTips.tip3', 'Use the Pause button anytime you feel overwhelmed')}</li>
          <li>• {t('mindfulness.quickTips.tip4', 'Focus on your breath, let thoughts pass')}</li>
        </ul>
      </div>
    </div>
  );
}
