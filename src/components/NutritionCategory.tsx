import { useTranslation } from 'react-i18next';
import { ChevronDown, Droplets, Heart, Leaf, Moon, Sun, Apple, Scale, Salad, Pill, Sparkles, Dumbbell, Zap, Trophy, Activity, Brain, FlaskConical, Waves } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface CategoryInfo {
  id: string;
  nameKey: string;
  icon: React.ReactNode;
  descriptionKey: string;
  color: string;
  contentKeys: string[];
}

const CATEGORIES: CategoryInfo[] = [
  {
    id: 'blood_type',
    nameKey: 'nutrition.categories.bloodType.name',
    icon: <Heart className="h-5 w-5" />,
    color: 'text-red-400',
    descriptionKey: 'nutrition.categories.bloodType.description',
    contentKeys: [
      'nutrition.categories.bloodType.content1',
      'nutrition.categories.bloodType.content2',
      'nutrition.categories.bloodType.content3',
      'nutrition.categories.bloodType.content4',
      'nutrition.categories.bloodType.content5',
    ]
  },
  {
    id: 'hydration',
    nameKey: 'nutrition.categories.hydration.name',
    icon: <Droplets className="h-5 w-5" />,
    color: 'text-blue-400',
    descriptionKey: 'nutrition.categories.hydration.description',
    contentKeys: [
      'nutrition.categories.hydration.content1',
      'nutrition.categories.hydration.content2',
      'nutrition.categories.hydration.content3',
      'nutrition.categories.hydration.content4',
      'nutrition.categories.hydration.content5',
    ]
  },
  {
    id: 'minerals',
    nameKey: 'nutrition.categories.minerals.name',
    icon: <FlaskConical className="h-5 w-5" />,
    color: 'text-emerald-400',
    descriptionKey: 'nutrition.categories.minerals.description',
    contentKeys: [
      'nutrition.categories.minerals.content1',
      'nutrition.categories.minerals.content2',
      'nutrition.categories.minerals.content3',
      'nutrition.categories.minerals.content4',
      'nutrition.categories.minerals.content5',
    ]
  },
  {
    id: 'recovery',
    nameKey: 'nutrition.categories.recovery.name',
    icon: <Moon className="h-5 w-5" />,
    color: 'text-indigo-400',
    descriptionKey: 'nutrition.categories.recovery.description',
    contentKeys: [
      'nutrition.categories.recovery.content1',
      'nutrition.categories.recovery.content2',
      'nutrition.categories.recovery.content3',
      'nutrition.categories.recovery.content4',
      'nutrition.categories.recovery.content5',
    ]
  },
  {
    id: 'blood_flow',
    nameKey: 'nutrition.categories.bloodFlow.name',
    icon: <Waves className="h-5 w-5" />,
    color: 'text-rose-400',
    descriptionKey: 'nutrition.categories.bloodFlow.description',
    contentKeys: [
      'nutrition.categories.bloodFlow.content1',
      'nutrition.categories.bloodFlow.content2',
      'nutrition.categories.bloodFlow.content3',
      'nutrition.categories.bloodFlow.content4',
      'nutrition.categories.bloodFlow.content5',
    ]
  },
  {
    id: 'lymphatic',
    nameKey: 'nutrition.categories.lymphatic.name',
    icon: <Activity className="h-5 w-5" />,
    color: 'text-teal-400',
    descriptionKey: 'nutrition.categories.lymphatic.description',
    contentKeys: [
      'nutrition.categories.lymphatic.content1',
      'nutrition.categories.lymphatic.content2',
      'nutrition.categories.lymphatic.content3',
      'nutrition.categories.lymphatic.content4',
      'nutrition.categories.lymphatic.content5',
    ]
  },
  {
    id: 'vitamins',
    nameKey: 'nutrition.categories.vitamins.name',
    icon: <Sun className="h-5 w-5" />,
    color: 'text-yellow-400',
    descriptionKey: 'nutrition.categories.vitamins.description',
    contentKeys: [
      'nutrition.categories.vitamins.content1',
      'nutrition.categories.vitamins.content2',
      'nutrition.categories.vitamins.content3',
      'nutrition.categories.vitamins.content4',
      'nutrition.categories.vitamins.content5',
    ]
  },
  {
    id: 'daily_nutrition',
    nameKey: 'nutrition.categories.dailyNutrition.name',
    icon: <Apple className="h-5 w-5" />,
    color: 'text-green-400',
    descriptionKey: 'nutrition.categories.dailyNutrition.description',
    contentKeys: [
      'nutrition.categories.dailyNutrition.content1',
      'nutrition.categories.dailyNutrition.content2',
      'nutrition.categories.dailyNutrition.content3',
      'nutrition.categories.dailyNutrition.content4',
      'nutrition.categories.dailyNutrition.content5',
    ]
  },
  {
    id: 'longevity',
    nameKey: 'nutrition.categories.longevity.name',
    icon: <Brain className="h-5 w-5" />,
    color: 'text-purple-400',
    descriptionKey: 'nutrition.categories.longevity.description',
    contentKeys: [
      'nutrition.categories.longevity.content1',
      'nutrition.categories.longevity.content2',
      'nutrition.categories.longevity.content3',
      'nutrition.categories.longevity.content4',
      'nutrition.categories.longevity.content5',
    ]
  },
  {
    id: 'weight',
    nameKey: 'nutrition.categories.weight.name',
    icon: <Scale className="h-5 w-5" />,
    color: 'text-orange-400',
    descriptionKey: 'nutrition.categories.weight.description',
    contentKeys: [
      'nutrition.categories.weight.content1',
      'nutrition.categories.weight.content2',
      'nutrition.categories.weight.content3',
      'nutrition.categories.weight.content4',
      'nutrition.categories.weight.content5',
    ]
  },
  {
    id: 'vegan',
    nameKey: 'nutrition.categories.vegan.name',
    icon: <Leaf className="h-5 w-5" />,
    color: 'text-lime-400',
    descriptionKey: 'nutrition.categories.vegan.description',
    contentKeys: [
      'nutrition.categories.vegan.content1',
      'nutrition.categories.vegan.content2',
      'nutrition.categories.vegan.content3',
      'nutrition.categories.vegan.content4',
      'nutrition.categories.vegan.content5',
    ]
  },
  {
    id: 'restrictive',
    nameKey: 'nutrition.categories.restrictive.name',
    icon: <Salad className="h-5 w-5" />,
    color: 'text-cyan-400',
    descriptionKey: 'nutrition.categories.restrictive.description',
    contentKeys: [
      'nutrition.categories.restrictive.content1',
      'nutrition.categories.restrictive.content2',
      'nutrition.categories.restrictive.content3',
      'nutrition.categories.restrictive.content4',
      'nutrition.categories.restrictive.content5',
    ]
  },
  {
    id: 'offseason',
    nameKey: 'nutrition.categories.offseason.name',
    icon: <Dumbbell className="h-5 w-5" />,
    color: 'text-slate-400',
    descriptionKey: 'nutrition.categories.offseason.description',
    contentKeys: [
      'nutrition.categories.offseason.content1',
      'nutrition.categories.offseason.content2',
      'nutrition.categories.offseason.content3',
      'nutrition.categories.offseason.content4',
      'nutrition.categories.offseason.content5',
    ]
  },
  {
    id: 'inseason',
    nameKey: 'nutrition.categories.inseason.name',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-amber-400',
    descriptionKey: 'nutrition.categories.inseason.description',
    contentKeys: [
      'nutrition.categories.inseason.content1',
      'nutrition.categories.inseason.content2',
      'nutrition.categories.inseason.content3',
      'nutrition.categories.inseason.content4',
      'nutrition.categories.inseason.content5',
    ]
  },
  {
    id: 'performance',
    nameKey: 'nutrition.categories.performance.name',
    icon: <Trophy className="h-5 w-5" />,
    color: 'text-gold-400',
    descriptionKey: 'nutrition.categories.performance.description',
    contentKeys: [
      'nutrition.categories.performance.content1',
      'nutrition.categories.performance.content2',
      'nutrition.categories.performance.content3',
      'nutrition.categories.performance.content4',
      'nutrition.categories.performance.content5',
    ]
  },
  {
    id: 'ingame_hydration',
    nameKey: 'nutrition.categories.ingameHydration.name',
    icon: <Droplets className="h-5 w-5" />,
    color: 'text-sky-400',
    descriptionKey: 'nutrition.categories.ingameHydration.description',
    contentKeys: [
      'nutrition.categories.ingameHydration.content1',
      'nutrition.categories.ingameHydration.content2',
      'nutrition.categories.ingameHydration.content3',
      'nutrition.categories.ingameHydration.content4',
      'nutrition.categories.ingameHydration.content5',
    ]
  },
  {
    id: 'supplements',
    nameKey: 'nutrition.categories.supplements.name',
    icon: <Pill className="h-5 w-5" />,
    color: 'text-pink-400',
    descriptionKey: 'nutrition.categories.supplements.description',
    contentKeys: [
      'nutrition.categories.supplements.content1',
      'nutrition.categories.supplements.content2',
      'nutrition.categories.supplements.content3',
      'nutrition.categories.supplements.content4',
      'nutrition.categories.supplements.content5',
    ]
  },
  {
    id: 'holistic',
    nameKey: 'nutrition.categories.holistic.name',
    icon: <Sparkles className="h-5 w-5" />,
    color: 'text-violet-400',
    descriptionKey: 'nutrition.categories.holistic.description',
    contentKeys: [
      'nutrition.categories.holistic.content1',
      'nutrition.categories.holistic.content2',
      'nutrition.categories.holistic.content3',
      'nutrition.categories.holistic.content4',
      'nutrition.categories.holistic.content5',
    ]
  }
];

export function NutritionCategory() {
  const { t } = useTranslation();

  return (
    <Accordion type="multiple" className="space-y-3">
      {CATEGORIES.map((category) => (
        <AccordionItem 
          key={category.id} 
          value={category.id}
          className="border rounded-lg bg-card/50 overflow-hidden"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
            <div className="flex items-center gap-3 text-left">
              <div className={`p-2 rounded-lg bg-muted ${category.color}`}>
                {category.icon}
              </div>
              <div>
                <h3 className="font-semibold text-sm sm:text-base">{t(category.nameKey)}</h3>
                <p className="text-xs text-muted-foreground hidden sm:block">{t(category.descriptionKey)}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <p className="text-xs text-muted-foreground mb-3 sm:hidden">{t(category.descriptionKey)}</p>
            <ul className="space-y-2">
              {category.contentKeys.map((contentKey, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${category.color.replace('text-', 'bg-')}`} />
                  <span>{t(contentKey)}</span>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
