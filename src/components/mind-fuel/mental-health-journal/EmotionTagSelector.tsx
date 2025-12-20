import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface EmotionTagSelectorProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

const emotionCategories = [
  {
    category: 'positive',
    emotions: ['happy', 'grateful', 'hopeful', 'calm', 'excited', 'loved', 'proud', 'peaceful'],
    color: 'wellness-sage',
  },
  {
    category: 'challenging',
    emotions: ['anxious', 'sad', 'stressed', 'frustrated', 'overwhelmed', 'lonely', 'tired', 'worried'],
    color: 'wellness-lavender',
  },
  {
    category: 'processing',
    emotions: ['confused', 'uncertain', 'reflective', 'nostalgic', 'bittersweet', 'numb', 'restless'],
    color: 'wellness-sky',
  },
];

const emotionEmojis: Record<string, string> = {
  happy: '😊',
  grateful: '🙏',
  hopeful: '🌟',
  calm: '😌',
  excited: '🎉',
  loved: '💕',
  proud: '💪',
  peaceful: '🕊️',
  anxious: '😰',
  sad: '😢',
  stressed: '😓',
  frustrated: '😤',
  overwhelmed: '😵',
  lonely: '🥺',
  tired: '😴',
  worried: '😟',
  confused: '🤔',
  uncertain: '❓',
  reflective: '💭',
  nostalgic: '🌅',
  bittersweet: '🎭',
  numb: '😶',
  restless: '🌀',
};

export default function EmotionTagSelector({ selectedTags, onTagsChange }: EmotionTagSelectorProps) {
  const { t } = useTranslation();

  const toggleTag = (emotion: string) => {
    if (selectedTags.includes(emotion)) {
      onTagsChange(selectedTags.filter(tag => tag !== emotion));
    } else {
      onTagsChange([...selectedTags, emotion]);
    }
  };

  return (
    <div className="space-y-4">
      {emotionCategories.map((category) => (
        <div key={category.category} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground capitalize">
            {t(`mentalWellness.journal.emotions.${category.category}`, category.category)}
          </p>
          <div className="flex flex-wrap gap-2">
            {category.emotions.map((emotion) => {
              const isSelected = selectedTags.includes(emotion);
              return (
                <button
                  key={emotion}
                  onClick={() => toggleTag(emotion)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm transition-all duration-200",
                    "flex items-center gap-1.5",
                    isSelected
                      ? `bg-${category.color} text-${category.color}-foreground shadow-sm`
                      : "bg-wellness-soft-gray text-muted-foreground hover:bg-wellness-cream"
                  )}
                  style={isSelected ? {
                    backgroundColor: `hsl(var(--${category.color}))`,
                    color: `hsl(var(--${category.color}-foreground))`
                  } : undefined}
                >
                  <span>{emotionEmojis[emotion]}</span>
                  <span className="capitalize">{t(`mentalWellness.journal.emotions.${emotion}`, emotion)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
