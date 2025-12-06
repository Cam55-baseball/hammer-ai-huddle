import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Brain, Heart, Crown, Rocket } from 'lucide-react';

interface MindFuelCategoriesProps {
  categoriesExplored: Record<string, number>;
}

interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  icon: typeof Brain;
  color: string;
  bgColor: string;
  totalLessons: number;
}

const CATEGORIES: CategoryInfo[] = [
  {
    id: 'mental_mastery',
    name: 'Mental Mastery',
    description: 'Focus, visualization, discipline & high-performance psychology',
    icon: Brain,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    totalLessons: 80,
  },
  {
    id: 'emotional_balance',
    name: 'Emotional Balance',
    description: 'Peace, fear management, breathing & meditation techniques',
    icon: Heart,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    totalLessons: 45,
  },
  {
    id: 'leadership',
    name: 'Leadership',
    description: 'Character, accountability, teamwork & legacy building',
    icon: Crown,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    totalLessons: 90,
  },
  {
    id: 'life_mastery',
    name: 'Life Mastery',
    description: 'Habits, time management, purpose & creating standards',
    icon: Rocket,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    totalLessons: 55,
  },
];

export default function MindFuelCategories({ categoriesExplored }: MindFuelCategoriesProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {t('mindFuel.categories.title', 'Explore Categories')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CATEGORIES.map((category) => {
            const explored = categoriesExplored[category.id] || 0;
            const progress = Math.min(100, Math.round((explored / category.totalLessons) * 100));
            const Icon = category.icon;

            return (
              <div
                key={category.id}
                className={`p-4 rounded-xl ${category.bgColor} border border-border/50 transition-all hover:border-border`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${category.bgColor}`}>
                    <Icon className={`h-5 w-5 ${category.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground">
                      {t(`mindFuel.categories.${category.id}.name`, category.name)}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {t(`mindFuel.categories.${category.id}.description`, category.description)}
                    </p>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {explored} {t('mindFuel.categories.explored', 'explored')}
                        </span>
                        <span className={category.color}>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
