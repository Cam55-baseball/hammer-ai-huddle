import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Target, Sparkles } from 'lucide-react';

interface StandardItem {
  id: string;
  type: 'acronym' | 'mantra' | 'challenge';
  title: string;
  content: string;
  description?: string;
}

const STANDARDS: StandardItem[] = [
  {
    id: 'map',
    type: 'acronym',
    title: 'M.A.P.',
    content: 'Mindset. Action. Purpose.',
    description: 'The three pillars of elite performance',
  },
  {
    id: 'win',
    type: 'acronym',
    title: 'W.I.N.',
    content: "What's Important Now.",
    description: 'The ultimate focus question for any moment',
  },
  {
    id: 'prime',
    type: 'acronym',
    title: 'P.R.I.M.E.',
    content: 'Prepare. Refine. Inspire. Master. Execute.',
    description: 'The path to peak performance',
  },
  {
    id: 'grit',
    type: 'acronym',
    title: 'G.R.I.T.',
    content: 'Growth. Resilience. Intensity. Tenacity.',
    description: 'The four pillars of mental toughness',
  },
  {
    id: 'focus',
    type: 'acronym',
    title: 'F.O.C.U.S.',
    content: 'Follow One Course Until Successful.',
    description: 'The key to achieving any goal',
  },
  {
    id: 'elite',
    type: 'acronym',
    title: 'E.L.I.T.E.',
    content: 'Effort. Learning. Intensity. Teamwork. Excellence.',
    description: 'The code of champions',
  },
  {
    id: 'challenge1',
    type: 'challenge',
    title: 'Weekly Challenge',
    content: 'Encourage 3 teammates this week with specific praise.',
    description: 'Leadership through encouragement',
  },
  {
    id: 'challenge2',
    type: 'challenge',
    title: 'Weekly Challenge',
    content: 'Practice 60 seconds of deep breathing before every practice.',
    description: 'Building composure habits',
  },
  {
    id: 'mantra1',
    type: 'mantra',
    title: 'Daily Mantra',
    content: 'I am in control of my effort, attitude, and response.',
    description: 'Own your controllables',
  },
  {
    id: 'mantra2',
    type: 'mantra',
    title: 'Daily Mantra',
    content: 'Today I choose discipline over comfort.',
    description: 'Excellence through choice',
  },
];

export default function MindFuelStandards() {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentStandard = STANDARDS[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? STANDARDS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === STANDARDS.length - 1 ? 0 : prev + 1));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'acronym':
        return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
      case 'mantra':
        return 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30';
      case 'challenge':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900/50 via-violet-950/30 to-slate-900/50 border-violet-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Target className="h-5 w-5 text-violet-400" />
          {t('mindFuel.standards.title', 'Create the Standard')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            className="shrink-0 text-violet-400 hover:text-violet-300 hover:bg-violet-500/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1 text-center py-4">
            <Badge className={`mb-3 ${getTypeColor(currentStandard.type)}`}>
              {currentStandard.type === 'acronym' && t('mindFuel.standards.acronym', 'Acronym')}
              {currentStandard.type === 'mantra' && t('mindFuel.standards.mantra', 'Mantra')}
              {currentStandard.type === 'challenge' && t('mindFuel.standards.challenge', 'Challenge')}
            </Badge>

            {currentStandard.type === 'acronym' ? (
              <>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  {currentStandard.title}
                </h3>
                <p className="text-lg text-violet-300 font-medium">
                  {currentStandard.content}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  <span className="text-sm font-medium text-violet-400">
                    {currentStandard.title}
                  </span>
                </div>
                <p className="text-lg sm:text-xl text-white font-medium">
                  "{currentStandard.content}"
                </p>
              </>
            )}

            {currentStandard.description && (
              <p className="mt-3 text-sm text-violet-400/70">
                {currentStandard.description}
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="shrink-0 text-violet-400 hover:text-violet-300 hover:bg-violet-500/20"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-1.5 mt-4">
          {STANDARDS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? 'bg-violet-500 w-4'
                  : 'bg-violet-500/30 hover:bg-violet-500/50'
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
