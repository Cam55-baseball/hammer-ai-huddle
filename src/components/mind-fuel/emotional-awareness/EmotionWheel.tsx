import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmotionData {
  id: string;
  color: string;
  secondaryEmotions: string[];
}

const primaryEmotions: EmotionData[] = [
  { id: 'joy', color: 'bg-yellow-400', secondaryEmotions: ['happy', 'cheerful', 'proud', 'optimistic'] },
  { id: 'trust', color: 'bg-emerald-400', secondaryEmotions: ['accepting', 'admiring', 'secure', 'valued'] },
  { id: 'fear', color: 'bg-violet-400', secondaryEmotions: ['scared', 'anxious', 'insecure', 'nervous'] },
  { id: 'surprise', color: 'bg-orange-400', secondaryEmotions: ['amazed', 'confused', 'stunned', 'shocked'] },
  { id: 'sadness', color: 'bg-sky-400', secondaryEmotions: ['lonely', 'disappointed', 'hopeless', 'grief'] },
  { id: 'disgust', color: 'bg-teal-400', secondaryEmotions: ['disapproving', 'disappointed', 'awful', 'repelled'] },
  { id: 'anger', color: 'bg-red-400', secondaryEmotions: ['frustrated', 'irritated', 'hostile', 'annoyed'] },
  { id: 'anticipation', color: 'bg-pink-400', secondaryEmotions: ['interested', 'eager', 'excited', 'vigilant'] },
];

const emotionEmojis: Record<string, string> = {
  joy: '😊', trust: '🤝', fear: '😰', surprise: '😲',
  sadness: '😢', disgust: '😒', anger: '😠', anticipation: '🤩',
  happy: '😄', cheerful: '🌟', proud: '🏆', optimistic: '✨',
  accepting: '🙏', admiring: '👏', secure: '🛡️', valued: '💎',
  scared: '😱', anxious: '😬', insecure: '😟', nervous: '😥',
  amazed: '🤯', confused: '😕', stunned: '😧', shocked: '⚡',
  lonely: '😔', disappointed: '😞', hopeless: '💔', grief: '😿',
  disapproving: '👎', awful: '🤢', repelled: '😖',
  frustrated: '😤', irritated: '😑', hostile: '💢', annoyed: '😒',
  interested: '🧐', eager: '🏃', excited: '🎉', vigilant: '👀',
};

interface EmotionWheelProps {
  onEmotionSelect?: (primary: string, secondary?: string) => void;
  selectedEmotion?: { primary: string; secondary?: string };
}

export default function EmotionWheel({ onEmotionSelect, selectedEmotion }: EmotionWheelProps) {
  const { t } = useTranslation();
  const [expandedPrimary, setExpandedPrimary] = useState<string | null>(null);
  const [localSelected, setLocalSelected] = useState<{ primary: string; secondary?: string } | null>(
    selectedEmotion || null
  );

  const handlePrimaryClick = (emotionId: string) => {
    if (expandedPrimary === emotionId) {
      setExpandedPrimary(null);
    } else {
      setExpandedPrimary(emotionId);
    }
  };

  const handleSecondaryClick = (primaryId: string, secondaryId: string) => {
    const selection = { primary: primaryId, secondary: secondaryId };
    setLocalSelected(selection);
    onEmotionSelect?.(primaryId, secondaryId);
  };

  const handlePrimaryOnlySelect = (primaryId: string) => {
    const selection = { primary: primaryId };
    setLocalSelected(selection);
    onEmotionSelect?.(primaryId);
    setExpandedPrimary(null);
  };

  return (
    <Card className="border-wellness-lavender/30 bg-gradient-to-br from-wellness-cream/50 to-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">🎡</span>
          {t('emotionalAwareness.emotionWheel.title', 'Emotion Wheel')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('emotionalAwareness.emotionWheel.selectEmotion', 'Tap to explore emotions')}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Emotions Circle */}
        <div className="relative">
          <div className="grid grid-cols-4 gap-3">
            {primaryEmotions.map((emotion) => (
              <div key={emotion.id} className="flex flex-col items-center gap-1">
                <button
                  onClick={() => handlePrimaryClick(emotion.id)}
                  className={cn(
                    "w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-110",
                    emotion.color,
                    expandedPrimary === emotion.id && "ring-4 ring-primary ring-offset-2 scale-110",
                    localSelected?.primary === emotion.id && !expandedPrimary && "ring-4 ring-primary ring-offset-2"
                  )}
                >
                  {emotionEmojis[emotion.id]}
                </button>
                <span className="text-xs sm:text-sm font-medium text-center capitalize">
                  {t(`emotionalAwareness.emotionWheel.emotions.${emotion.id}`, emotion.id)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Expanded Secondary Emotions */}
        {expandedPrimary && (
          <div className="animate-fade-in bg-muted/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {t('emotionalAwareness.emotionWheel.selectSpecific', 'Select specific emotion:')}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePrimaryOnlySelect(expandedPrimary)}
                className="text-xs"
              >
                {t('emotionalAwareness.emotionWheel.justThis', 'Just')} {emotionEmojis[expandedPrimary]} {expandedPrimary}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {primaryEmotions
                .find((e) => e.id === expandedPrimary)
                ?.secondaryEmotions.map((secondary) => (
                  <button
                    key={secondary}
                    onClick={() => handleSecondaryClick(expandedPrimary, secondary)}
                    className={cn(
                      "px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5",
                      "bg-background border border-border hover:border-primary hover:bg-primary/10",
                      localSelected?.secondary === secondary && "bg-primary text-primary-foreground border-primary"
                    )}
                  >
                    <span>{emotionEmojis[secondary] || '•'}</span>
                    <span className="capitalize">
                      {t(`emotionalAwareness.emotionWheel.secondary.${secondary}`, secondary)}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Selected Emotion Display */}
        {localSelected && (
          <div className="bg-primary/10 rounded-xl p-4 text-center animate-fade-in">
            <p className="text-sm text-muted-foreground mb-1">
              {t('emotionalAwareness.emotionWheel.selected', 'You selected:')}
            </p>
            <div className="flex items-center justify-center gap-2 text-lg font-semibold">
              <span className="text-2xl">{emotionEmojis[localSelected.secondary || localSelected.primary]}</span>
              <span className="capitalize">
                {localSelected.secondary 
                  ? t(`emotionalAwareness.emotionWheel.secondary.${localSelected.secondary}`, localSelected.secondary)
                  : t(`emotionalAwareness.emotionWheel.emotions.${localSelected.primary}`, localSelected.primary)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
