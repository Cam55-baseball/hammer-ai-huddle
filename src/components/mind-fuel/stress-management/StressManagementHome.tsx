import { useTranslation } from 'react-i18next';
import { Brain, AlertTriangle, Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StressLevelTracker from './StressLevelTracker';
import BurnoutAssessment from './BurnoutAssessment';
import PanicCalmingProtocol from './PanicCalmingProtocol';

export default function StressManagementHome() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-wellness-lavender" />
          {t('stressManagement.title', 'Stress Management')}
        </h2>
        <p className="text-muted-foreground">
          {t('stressManagement.subtitle', 'Track, assess, and manage your stress levels')}
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="tracker" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="tracker" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">{t('stressManagement.tabs.tracker', 'Tracker')}</span>
          </TabsTrigger>
          <TabsTrigger value="burnout" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">{t('stressManagement.tabs.burnout', 'Burnout')}</span>
          </TabsTrigger>
          <TabsTrigger value="panic" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">{t('stressManagement.tabs.panic', 'Calm')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracker">
          <StressLevelTracker />
        </TabsContent>

        <TabsContent value="burnout">
          <BurnoutAssessment />
        </TabsContent>

        <TabsContent value="panic">
          <PanicCalmingProtocol />
        </TabsContent>
      </Tabs>

      {/* Quick Tips */}
      <div className="p-4 bg-wellness-lavender/10 rounded-xl">
        <h4 className="font-medium text-sm mb-2">
          {t('stressManagement.quickTips.title', 'Quick Stress Tips')}
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• {t('stressManagement.quickTips.tip1', 'Take regular breaks during intense training')}</li>
          <li>• {t('stressManagement.quickTips.tip2', 'Practice deep breathing before competition')}</li>
          <li>• {t('stressManagement.quickTips.tip3', 'Get adequate sleep for recovery')}</li>
          <li>• {t('stressManagement.quickTips.tip4', 'Stay connected with your support system')}</li>
        </ul>
      </div>
    </div>
  );
}
