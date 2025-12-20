import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BoxBreathing from './BoxBreathing';
import SensoryGrounding from './SensoryGrounding';

interface GroundingExercisesProps {
  onExerciseComplete?: (type: string) => void;
}

export default function GroundingExercises({ onExerciseComplete }: GroundingExercisesProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('breathing');

  const handleBoxBreathingComplete = (cycles: number) => {
    onExerciseComplete?.('box_breathing');
  };

  const handleSensoryComplete = () => {
    onExerciseComplete?.('sensory_grounding');
  };

  return (
    <Card className="border-wellness-sage/30">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">🧘</span>
          {t('emotionalAwareness.grounding.title', 'Grounding Exercises')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('emotionalAwareness.grounding.subtitle', 'Techniques to calm your mind and body')}
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="breathing" className="gap-2">
              <span>📦</span>
              {t('emotionalAwareness.grounding.boxBreathing.tab', 'Box Breathing')}
            </TabsTrigger>
            <TabsTrigger value="sensory" className="gap-2">
              <span>🌈</span>
              {t('emotionalAwareness.grounding.sensory.tab', '5-4-3-2-1')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="breathing" className="mt-0">
            <BoxBreathing onComplete={handleBoxBreathingComplete} />
          </TabsContent>
          
          <TabsContent value="sensory" className="mt-0">
            <SensoryGrounding onComplete={handleSensoryComplete} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
