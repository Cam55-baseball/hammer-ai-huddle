import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Check, X, MessageSquare, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useMindFuelEducationProgress } from '@/hooks/useMindFuelEducationProgress';
  id: string;
  title: string;
  description: string;
  examples: { healthy: string; unhealthy: string }[];
}

const boundaryTypes: BoundaryType[] = [
  {
    id: 'physical',
    title: 'Physical Boundaries',
    description: 'Protect your personal space, body, and physical needs.',
    examples: [
      { healthy: 'Asking before hugging someone', unhealthy: 'Letting people touch you when uncomfortable' },
      { healthy: 'Taking breaks when your body needs rest', unhealthy: 'Pushing through pain to please a coach' },
    ],
  },
  {
    id: 'emotional',
    title: 'Emotional Boundaries',
    description: 'Protect your feelings and emotional energy.',
    examples: [
      { healthy: 'Not taking responsibility for others\' emotions', unhealthy: 'Constantly absorbing others\' negativity' },
      { healthy: 'Sharing vulnerably with trusted people', unhealthy: 'Oversharing with everyone or no one' },
    ],
  },
  {
    id: 'time',
    title: 'Time Boundaries',
    description: 'Protect your time and energy.',
    examples: [
      { healthy: 'Saying no to commitments that don\'t serve you', unhealthy: 'Always saying yes and feeling overwhelmed' },
      { healthy: 'Scheduling time for self-care', unhealthy: 'Never having time for yourself' },
    ],
  },
  {
    id: 'digital',
    title: 'Digital Boundaries',
    description: 'Protect your online presence and digital wellness.',
    examples: [
      { healthy: 'Setting specific times to check social media', unhealthy: 'Being available 24/7 online' },
      { healthy: 'Unfollowing accounts that make you feel bad', unhealthy: 'Comparing yourself constantly to others' },
    ],
  },
];

const boundaryScripts = [
  { situation: 'When asked to do something you can\'t do', response: '"I appreciate you thinking of me, but I can\'t take that on right now."' },
  { situation: 'When someone crosses a line', response: '"I\'m not comfortable with that. Please stop."' },
  { situation: 'When pressured to explain', response: '"No" is a complete sentence. You don\'t owe explanations.' },
  { situation: 'When setting a new boundary', response: '"Going forward, I need [specific boundary]. Thank you for understanding."' },
];

interface BoundaryType {
  id: string;
  title: string;
  description: string;
  examples: { healthy: string; unhealthy: string }[];
}

export default function HealthyBoundaries() {
  const { t } = useTranslation();
  const [expandedType, setExpandedType] = useState<string | null>('physical');
  const { markAsComplete, isItemComplete } = useMindFuelEducationProgress();

  // Mark boundaries section as complete when component mounts
  useEffect(() => {
    if (!isItemComplete('boundaries', 'healthy-boundaries')) {
      markAsComplete('boundaries', 'healthy-boundaries');
    }
  }, [markAsComplete, isItemComplete]);

  return (
    <div className="space-y-4">
      {/* Introduction */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-wellness-sage" />
            {t('mentalWellness.education.boundaries.title', 'Setting Healthy Boundaries')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.education.boundaries.intro', 'Boundaries are guidelines for how you want to be treated. They protect your mental health, preserve your energy, and create healthier relationships.')}
          </p>
          <div className="p-3 rounded-lg bg-wellness-sage/10 border border-wellness-sage/20">
            <p className="text-sm font-medium text-wellness-sage">
              {t('mentalWellness.education.boundaries.keyPoint', 'Remember: Setting boundaries isn\'t selfish—it\'s self-care.')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Boundary Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('mentalWellness.education.boundaries.types', 'Types of Boundaries')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {boundaryTypes.map((type) => {
            const isExpanded = expandedType === type.id;

            return (
              <div
                key={type.id}
                className="border rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedType(isExpanded ? null : type.id)}
                  className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium text-sm">{type.title}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 animate-in fade-in duration-200">
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                    
                    <div className="space-y-2">
                      {type.examples.map((example, i) => (
                        <div key={i} className="grid grid-cols-2 gap-2">
                          <div className="p-2 rounded bg-wellness-sage/10 border border-wellness-sage/20">
                            <div className="flex items-center gap-1 mb-1">
                              <Check className="h-3 w-3 text-wellness-sage" />
                              <span className="text-xs font-medium text-wellness-sage">Healthy</span>
                            </div>
                            <p className="text-xs">{example.healthy}</p>
                          </div>
                          <div className="p-2 rounded bg-wellness-rose/10 border border-wellness-rose/20">
                            <div className="flex items-center gap-1 mb-1">
                              <X className="h-3 w-3 text-wellness-rose" />
                              <span className="text-xs font-medium text-wellness-rose">Unhealthy</span>
                            </div>
                            <p className="text-xs">{example.unhealthy}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Boundary Scripts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-wellness-sky" />
            {t('mentalWellness.education.boundaries.scripts', 'What to Say')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Practice these phrases to set boundaries with confidence.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {boundaryScripts.map((script, index) => (
            <div key={index} className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">{script.situation}</p>
              <p className="text-sm font-medium">{script.response}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Common Challenges */}
      <Card className="bg-wellness-cream/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-wellness-lavender" />
            {t('mentalWellness.education.boundaries.challenges', 'Common Challenges')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-wellness-lavender">•</span>
              <span><strong>Guilt:</strong> It\'s normal to feel guilty at first. The discomfort will decrease with practice.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-wellness-lavender">•</span>
              <span><strong>Pushback:</strong> People used to you having no boundaries may resist. Stay consistent.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-wellness-lavender">•</span>
              <span><strong>Fear of conflict:</strong> Healthy boundaries reduce conflict long-term, even if uncomfortable short-term.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
