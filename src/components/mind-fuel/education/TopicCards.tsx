import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Frown, Zap, Flame, ChevronRight, X, BookOpen, Check } from 'lucide-react';
import { useMindFuelEducationProgress } from '@/hooks/useMindFuelEducationProgress';

interface Topic {
  id: string;
  title: string;
  icon: typeof AlertCircle;
  color: string;
  summary: string;
  signs: string[];
  copingStrategies: string[];
  whenToSeekHelp: string;
}

const topics: Topic[] = [
  {
    id: 'anxiety',
    title: 'Understanding Anxiety',
    icon: AlertCircle,
    color: 'wellness-rose',
    summary: 'Anxiety is your body\'s natural response to stress. While some anxiety is normal, excessive worry that interferes with daily life may need attention.',
    signs: [
      'Persistent worry or fear',
      'Restlessness or feeling on edge',
      'Difficulty concentrating',
      'Physical symptoms (racing heart, sweating)',
      'Sleep problems',
      'Avoiding situations that trigger anxiety',
    ],
    copingStrategies: [
      'Deep breathing and grounding exercises',
      'Regular physical activity',
      'Limiting caffeine and alcohol',
      'Practicing mindfulness',
      'Challenging anxious thoughts',
    ],
    whenToSeekHelp: 'If anxiety significantly impacts your daily life, relationships, or performance for more than a few weeks.',
  },
  {
    id: 'depression',
    title: 'Understanding Depression',
    icon: Frown,
    color: 'wellness-sky',
    summary: 'Depression is more than feeling sad. It\'s a persistent condition that affects how you feel, think, and handle daily activities.',
    signs: [
      'Persistent sad or empty feelings',
      'Loss of interest in activities you used to enjoy',
      'Changes in appetite or weight',
      'Sleep problems (too much or too little)',
      'Fatigue or loss of energy',
      'Feelings of worthlessness or guilt',
    ],
    copingStrategies: [
      'Maintain a routine',
      'Stay connected with supportive people',
      'Set small, achievable goals',
      'Engage in physical activity',
      'Practice self-compassion',
    ],
    whenToSeekHelp: 'If symptoms persist for more than two weeks or if you have thoughts of self-harm.',
  },
  {
    id: 'adhd',
    title: 'Understanding ADHD',
    icon: Zap,
    color: 'wellness-sage',
    summary: 'ADHD (Attention-Deficit/Hyperactivity Disorder) affects focus, impulse control, and energy levels. It\'s a neurological difference, not a character flaw.',
    signs: [
      'Difficulty sustaining attention',
      'Easily distracted',
      'Forgetfulness in daily activities',
      'Difficulty organizing tasks',
      'Restlessness or fidgeting',
      'Impulsive decisions',
    ],
    copingStrategies: [
      'Use timers and reminders',
      'Break tasks into smaller steps',
      'Create structured routines',
      'Minimize distractions',
      'Exercise regularly',
    ],
    whenToSeekHelp: 'If these symptoms significantly impact work, school, or relationships.',
  },
  {
    id: 'burnout',
    title: 'Understanding Burnout',
    icon: Flame,
    color: 'wellness-lavender',
    summary: 'Burnout is a state of chronic stress that leads to physical and emotional exhaustion, cynicism, and feelings of ineffectiveness.',
    signs: [
      'Chronic fatigue and exhaustion',
      'Feeling detached or cynical',
      'Reduced performance',
      'Physical symptoms (headaches, illness)',
      'Loss of motivation',
      'Feeling overwhelmed constantly',
    ],
    copingStrategies: [
      'Set boundaries at work and home',
      'Prioritize rest and recovery',
      'Delegate or say no when needed',
      'Reconnect with activities you enjoy',
      'Seek support from others',
    ],
    whenToSeekHelp: 'If burnout symptoms persist despite making changes, or if you experience depression.',
  },
];

export default function TopicCards() {
  const { t } = useTranslation();
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const { markAsComplete, isItemComplete } = useMindFuelEducationProgress();

  const handleTopicSelect = async (topic: Topic) => {
    setSelectedTopic(topic);
    // Mark as complete when user views a topic
    if (!isItemComplete('topics', topic.id)) {
      await markAsComplete('topics', topic.id);
    }
  };

  if (selectedTopic) {
    const Icon = selectedTopic.icon;
    return (
      <div className="space-y-4 animate-in fade-in duration-200">
        <Button
          variant="ghost"
          onClick={() => setSelectedTopic(null)}
          className="mb-2"
        >
          <X className="h-4 w-4 mr-2" />
          {t('common.back', 'Back to Topics')}
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className={`p-2 rounded-lg bg-${selectedTopic.color}/20`}>
                <Icon className={`h-5 w-5 text-${selectedTopic.color}`} />
              </div>
              {selectedTopic.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">{selectedTopic.summary}</p>

            <div>
              <h4 className="font-semibold mb-2">Common Signs</h4>
              <ul className="space-y-1.5">
                {selectedTopic.signs.map((sign, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-wellness-rose">•</span>
                    {sign}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Coping Strategies</h4>
              <ul className="space-y-1.5">
                {selectedTopic.copingStrategies.map((strategy, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-wellness-sage">✓</span>
                    {strategy}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
              <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">When to Seek Help</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">{selectedTopic.whenToSeekHelp}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-wellness-sky" />
            {t('mentalWellness.education.topics.title', 'Mental Health Topics')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.education.topics.intro', 'Learn about common mental health topics. Understanding these conditions helps reduce stigma and empowers you to recognize when you or someone you know might need support.')}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {topics.map((topic) => {
          const Icon = topic.icon;
          const completed = isItemComplete('topics', topic.id);
          return (
            <Card
              key={topic.id}
              className={`cursor-pointer hover:shadow-md transition-all ${completed ? 'border-green-500/30' : ''}`}
              onClick={() => handleTopicSelect(topic)}
            >
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${completed ? 'bg-green-500/20' : `bg-${topic.color}/20`}`}>
                    <Icon className={`h-5 w-5 ${completed ? 'text-green-500' : `text-${topic.color}`}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{topic.title}</h3>
                      {completed && <Check className="h-3 w-3 text-green-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{topic.summary}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-xs text-center text-muted-foreground">
            {t('mentalWellness.education.topics.disclaimer', 'This information is educational and not a substitute for professional diagnosis or treatment. If you\'re concerned about your mental health, please consult a healthcare provider.')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
