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
    nameKey: 'nutrition.categories.bloodType',
    icon: <Heart className="h-5 w-5" />,
    color: 'text-red-400',
    descriptionKey: 'nutrition.categories.bloodTypeDesc',
    contentKeys: [
      'nutrition.categoryContent.bloodType.content1',
      'nutrition.categoryContent.bloodType.content2',
      'nutrition.categoryContent.bloodType.content3',
      'nutrition.categoryContent.bloodType.content4',
      'nutrition.categoryContent.bloodType.content5',
    ]
  },
  {
    id: 'hydration',
    nameKey: 'nutrition.categories.hydration',
    icon: <Droplets className="h-5 w-5" />,
    color: 'text-blue-400',
    descriptionKey: 'nutrition.categories.hydrationDesc',
    contentKeys: [
      'nutrition.categoryContent.hydration.content1',
      'nutrition.categoryContent.hydration.content2',
      'nutrition.categoryContent.hydration.content3',
      'nutrition.categoryContent.hydration.content4',
      'nutrition.categoryContent.hydration.content5',
    ]
  },
  {
    id: 'minerals',
    nameKey: 'nutrition.categories.mineralization',
    icon: <FlaskConical className="h-5 w-5" />,
    color: 'text-emerald-400',
    descriptionKey: 'nutrition.categories.mineralizationDesc',
    contentKeys: [
      'nutrition.categoryContent.minerals.content1',
      'nutrition.categoryContent.minerals.content2',
      'nutrition.categoryContent.minerals.content3',
      'nutrition.categoryContent.minerals.content4',
      'nutrition.categoryContent.minerals.content5',
    ]
  },
  {
    id: 'recovery',
    nameKey: 'nutrition.categories.recovery',
    icon: <Moon className="h-5 w-5" />,
    color: 'text-indigo-400',
    descriptionKey: 'nutrition.categories.recoveryDesc',
    contentKeys: [
      'nutrition.categoryContent.recovery.content1',
      'nutrition.categoryContent.recovery.content2',
      'nutrition.categoryContent.recovery.content3',
      'nutrition.categoryContent.recovery.content4',
      'nutrition.categoryContent.recovery.content5',
    ]
  },
  {
    id: 'blood_flow',
    nameKey: 'nutrition.categories.bloodFlow',
    icon: <Waves className="h-5 w-5" />,
    color: 'text-rose-400',
    descriptionKey: 'nutrition.categories.bloodFlowDesc',
    contentKeys: [
      'nutrition.categoryContent.bloodFlow.content1',
      'nutrition.categoryContent.bloodFlow.content2',
      'nutrition.categoryContent.bloodFlow.content3',
      'nutrition.categoryContent.bloodFlow.content4',
      'nutrition.categoryContent.bloodFlow.content5',
    ]
  },
  {
    id: 'lymphatic',
    nameKey: 'nutrition.categories.lymphatic',
    icon: <Activity className="h-5 w-5" />,
    color: 'text-teal-400',
    descriptionKey: 'nutrition.categories.lymphaticDesc',
    contentKeys: [
      'nutrition.categoryContent.lymphatic.content1',
      'nutrition.categoryContent.lymphatic.content2',
      'nutrition.categoryContent.lymphatic.content3',
      'nutrition.categoryContent.lymphatic.content4',
      'nutrition.categoryContent.lymphatic.content5',
    ]
  },
  {
    id: 'vitamins',
    nameKey: 'nutrition.categories.vitamins',
    icon: <Sun className="h-5 w-5" />,
    color: 'text-yellow-400',
    descriptionKey: 'nutrition.categories.vitaminsDesc',
    contentKeys: [
      'nutrition.categoryContent.vitamins.content1',
      'nutrition.categoryContent.vitamins.content2',
      'nutrition.categoryContent.vitamins.content3',
      'nutrition.categoryContent.vitamins.content4',
      'nutrition.categoryContent.vitamins.content5',
    ]
  },
  {
    id: 'daily_nutrition',
    nameKey: 'nutrition.categories.dailyNutrition',
    icon: <Apple className="h-5 w-5" />,
    color: 'text-green-400',
    descriptionKey: 'nutrition.categories.dailyNutritionDesc',
    contentKeys: [
      'nutrition.categoryContent.dailyNutrition.content1',
      'nutrition.categoryContent.dailyNutrition.content2',
      'nutrition.categoryContent.dailyNutrition.content3',
      'nutrition.categoryContent.dailyNutrition.content4',
      'nutrition.categoryContent.dailyNutrition.content5',
    ]
  },
  {
    id: 'longevity',
    nameKey: 'nutrition.categories.longevity',
    icon: <Brain className="h-5 w-5" />,
    color: 'text-purple-400',
    descriptionKey: 'nutrition.categories.longevityDesc',
    contentKeys: [
      'nutrition.categoryContent.longevity.content1',
      'nutrition.categoryContent.longevity.content2',
      'nutrition.categoryContent.longevity.content3',
      'nutrition.categoryContent.longevity.content4',
      'nutrition.categoryContent.longevity.content5',
    ]
  },
  {
    id: 'weight',
    nameKey: 'nutrition.categories.weightManagement',
    icon: <Scale className="h-5 w-5" />,
    color: 'text-orange-400',
    descriptionKey: 'nutrition.categories.weightManagementDesc',
    contentKeys: [
      'nutrition.categoryContent.weight.content1',
      'nutrition.categoryContent.weight.content2',
      'nutrition.categoryContent.weight.content3',
      'nutrition.categoryContent.weight.content4',
      'nutrition.categoryContent.weight.content5',
    ]
  },
  {
    id: 'vegan',
    nameKey: 'nutrition.categories.vegan',
    icon: <Leaf className="h-5 w-5" />,
    color: 'text-lime-400',
    descriptionKey: 'nutrition.categories.veganDesc',
    contentKeys: [
      'nutrition.categoryContent.vegan.content1',
      'nutrition.categoryContent.vegan.content2',
      'nutrition.categoryContent.vegan.content3',
      'nutrition.categoryContent.vegan.content4',
      'nutrition.categoryContent.vegan.content5',
    ]
  },
  {
    id: 'restrictive',
    nameKey: 'nutrition.categories.restrictiveDiets',
    icon: <Salad className="h-5 w-5" />,
    color: 'text-cyan-400',
    descriptionKey: 'nutrition.categories.restrictiveDietsDesc',
    contentKeys: [
      'nutrition.categoryContent.restrictive.content1',
      'nutrition.categoryContent.restrictive.content2',
      'nutrition.categoryContent.restrictive.content3',
      'nutrition.categoryContent.restrictive.content4',
      'nutrition.categoryContent.restrictive.content5',
    ]
  },
  {
    id: 'offseason',
    nameKey: 'nutrition.categories.offSeason',
    icon: <Dumbbell className="h-5 w-5" />,
    color: 'text-slate-400',
    descriptionKey: 'nutrition.categories.offSeasonDesc',
    contentKeys: [
      'nutrition.categoryContent.offseason.content1',
      'nutrition.categoryContent.offseason.content2',
      'nutrition.categoryContent.offseason.content3',
      'nutrition.categoryContent.offseason.content4',
      'nutrition.categoryContent.offseason.content5',
    ]
  },
  {
    id: 'inseason',
    nameKey: 'nutrition.categories.inSeason',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-amber-400',
    descriptionKey: 'nutrition.categories.inSeasonDesc',
    contentKeys: [
      'nutrition.categoryContent.inseason.content1',
      'nutrition.categoryContent.inseason.content2',
      'nutrition.categoryContent.inseason.content3',
      'nutrition.categoryContent.inseason.content4',
      'nutrition.categoryContent.inseason.content5',
    ]
  },
  {
    id: 'performance',
    nameKey: 'nutrition.categories.performance',
    icon: <Trophy className="h-5 w-5" />,
    color: 'text-gold-400',
    descriptionKey: 'nutrition.categories.performanceDesc',
    contentKeys: [
      'nutrition.categoryContent.performance.content1',
      'nutrition.categoryContent.performance.content2',
      'nutrition.categoryContent.performance.content3',
      'nutrition.categoryContent.performance.content4',
      'nutrition.categoryContent.performance.content5',
    ]
  },
  {
    id: 'ingame_hydration',
    nameKey: 'nutrition.categories.inGame',
    icon: <Droplets className="h-5 w-5" />,
    color: 'text-sky-400',
    descriptionKey: 'nutrition.categories.inGameDesc',
    contentKeys: [
      'nutrition.categoryContent.ingameHydration.content1',
      'nutrition.categoryContent.ingameHydration.content2',
      'nutrition.categoryContent.ingameHydration.content3',
      'nutrition.categoryContent.ingameHydration.content4',
      'nutrition.categoryContent.ingameHydration.content5',
    ]
  },
  {
    id: 'supplements',
    nameKey: 'nutrition.categories.supplements',
    icon: <Pill className="h-5 w-5" />,
    color: 'text-pink-400',
    descriptionKey: 'nutrition.categories.supplementsDesc',
    contentKeys: [
      'nutrition.categoryContent.supplements.content1',
      'nutrition.categoryContent.supplements.content2',
      'nutrition.categoryContent.supplements.content3',
      'nutrition.categoryContent.supplements.content4',
      'nutrition.categoryContent.supplements.content5',
    ]
  },
  {
    id: 'holistic',
    nameKey: 'nutrition.categories.holistic',
    icon: <Sparkles className="h-5 w-5" />,
    color: 'text-violet-400',
    descriptionKey: 'nutrition.categories.holisticDesc',
    contentKeys: [
      'nutrition.categoryContent.holistic.content1',
      'nutrition.categoryContent.holistic.content2',
      'nutrition.categoryContent.holistic.content3',
      'nutrition.categoryContent.holistic.content4',
      'nutrition.categoryContent.holistic.content5',
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
