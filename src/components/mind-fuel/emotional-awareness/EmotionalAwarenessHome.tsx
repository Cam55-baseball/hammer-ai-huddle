import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmotionCheckIn from './EmotionCheckIn';
import GroundingExercises from './GroundingExercises';
import TriggerTracker from './TriggerTracker';
import EmotionWheel from './EmotionWheel';

export default function EmotionalAwarenessHome() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('check-in');

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-gradient-to-br from-wellness-lavender/30 via-wellness-sage/20 to-wellness-sky/20 rounded-xl p-6 text-center">
        <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <span>🎭</span>
          {t('emotionalAwareness.title', 'Emotional Awareness')}
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          {t('emotionalAwareness.subtitle', 'Understand, track, and regulate your emotions with guided exercises and insights')}
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="check-in" className="text-xs sm:text-sm gap-1 sm:gap-2">
            <span className="hidden sm:inline">💭</span>
            {t('emotionalAwareness.tabs.checkIn', 'Check-In')}
          </TabsTrigger>
          <TabsTrigger value="explore" className="text-xs sm:text-sm gap-1 sm:gap-2">
            <span className="hidden sm:inline">🎡</span>
            {t('emotionalAwareness.tabs.explore', 'Explore')}
          </TabsTrigger>
          <TabsTrigger value="grounding" className="text-xs sm:text-sm gap-1 sm:gap-2">
            <span className="hidden sm:inline">🧘</span>
            {t('emotionalAwareness.tabs.grounding', 'Grounding')}
          </TabsTrigger>
          <TabsTrigger value="triggers" className="text-xs sm:text-sm gap-1 sm:gap-2">
            <span className="hidden sm:inline">🎯</span>
            {t('emotionalAwareness.tabs.triggers', 'Triggers')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="check-in" className="mt-0 space-y-6">
          <EmotionCheckIn />
        </TabsContent>

        <TabsContent value="explore" className="mt-0 space-y-6">
          <EmotionWheel />
        </TabsContent>

        <TabsContent value="grounding" className="mt-0 space-y-6">
          <GroundingExercises />
        </TabsContent>

        <TabsContent value="triggers" className="mt-0 space-y-6">
          <TriggerTracker />
        </TabsContent>
      </Tabs>

      {/* Quick Tips */}
      <div className="bg-muted/30 rounded-xl p-4">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <span>💡</span>
          {t('emotionalAwareness.quickTips.title', 'Quick Tips')}
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• {t('emotionalAwareness.quickTips.tip1', 'Check in with yourself at least once daily')}</li>
          <li>• {t('emotionalAwareness.quickTips.tip2', 'Use grounding exercises when feeling overwhelmed')}</li>
          <li>• {t('emotionalAwareness.quickTips.tip3', 'Track triggers to understand your emotional patterns')}</li>
          <li>• {t('emotionalAwareness.quickTips.tip4', "All emotions are valid - there's no wrong way to feel")}</li>
        </ul>
      </div>
    </div>
  );
}
