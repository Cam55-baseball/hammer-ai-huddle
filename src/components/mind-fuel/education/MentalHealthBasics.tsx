import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Heart, Zap, Users, Check, ChevronRight } from 'lucide-react';

interface Concept {
  id: string;
  title: string;
  icon: typeof Brain;
  description: string;
  keyPoints: string[];
}

const concepts: Concept[] = [
  {
    id: 'what-is',
    title: 'What is Mental Health?',
    icon: Brain,
    description: 'Mental health includes our emotional, psychological, and social well-being. It affects how we think, feel, and act.',
    keyPoints: [
      'Mental health is just as important as physical health',
      'It affects how we handle stress, relate to others, and make choices',
      'Mental health can change over time based on circumstances',
      'Taking care of mental health is a lifelong practice',
    ],
  },
  {
    id: 'emotional',
    title: 'Emotional Wellness',
    icon: Heart,
    description: 'Emotional wellness is the ability to understand, manage, and express emotions in healthy ways.',
    keyPoints: [
      'All emotions are valid—even difficult ones serve a purpose',
      'Emotional awareness is a skill that can be developed',
      'Healthy expression of emotions strengthens relationships',
      'Suppressing emotions can lead to physical and mental strain',
    ],
  },
  {
    id: 'resilience',
    title: 'Building Resilience',
    icon: Zap,
    description: 'Resilience is the ability to adapt and bounce back from adversity, trauma, or significant stress.',
    keyPoints: [
      'Resilience isn\'t about avoiding stress but learning to cope',
      'It can be strengthened through practice and support',
      'Self-care and social connections boost resilience',
      'Setbacks are opportunities for growth',
    ],
  },
  {
    id: 'connection',
    title: 'Social Connection',
    icon: Users,
    description: 'Meaningful relationships and social support are fundamental to mental health and well-being.',
    keyPoints: [
      'Humans are wired for connection—isolation harms mental health',
      'Quality matters more than quantity in relationships',
      'Giving support is as beneficial as receiving it',
      'It\'s okay to ask for help when you need it',
    ],
  },
];

export default function MentalHealthBasics() {
  const { t } = useTranslation();
  const [expandedConcept, setExpandedConcept] = useState<string | null>('what-is');

  return (
    <div className="space-y-4">
      {/* Introduction */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('mentalWellness.education.basics.title', 'Core Concepts')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.education.basics.intro', 'Understanding these fundamental concepts creates a strong foundation for your mental wellness journey. Click each topic to learn more.')}
          </p>
        </CardContent>
      </Card>

      {/* Concept Cards */}
      <div className="space-y-3">
        {concepts.map((concept) => {
          const Icon = concept.icon;
          const isExpanded = expandedConcept === concept.id;

          return (
            <Card
              key={concept.id}
              className={`cursor-pointer transition-all ${
                isExpanded ? 'ring-2 ring-wellness-sky' : 'hover:shadow-md'
              }`}
              onClick={() => setExpandedConcept(isExpanded ? null : concept.id)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${isExpanded ? 'bg-wellness-sky/20' : 'bg-muted'}`}>
                    <Icon className={`h-5 w-5 ${isExpanded ? 'text-wellness-sky' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{concept.title}</h3>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <p className="text-sm text-muted-foreground">{concept.description}</p>
                        <div className="space-y-2">
                          {concept.keyPoints.map((point, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-wellness-sage flex-shrink-0 mt-0.5" />
                              <span className="text-sm">{point}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Fact */}
      <Card className="bg-wellness-sky/10 border-wellness-sky/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-wellness-sky flex-shrink-0" />
            <div>
              <h4 className="font-medium text-sm mb-1">
                {t('mentalWellness.education.basics.didYouKnow', 'Did You Know?')}
              </h4>
              <p className="text-sm text-muted-foreground">
                {t('mentalWellness.education.basics.fact', '1 in 5 adults experience mental health challenges each year. Mental health conditions are common, treatable, and nothing to be ashamed of.')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
