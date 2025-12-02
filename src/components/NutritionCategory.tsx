import { useState } from 'react';
import { ChevronDown, Droplets, Heart, Leaf, Moon, Sun, Apple, Scale, Salad, Pill, Sparkles, Dumbbell, Zap, Trophy, Activity, Brain, FlaskConical, Waves } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CategoryInfo {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  content: string[];
}

const CATEGORIES: CategoryInfo[] = [
  {
    id: 'blood_type',
    name: 'Blood Type Health',
    icon: <Heart className="h-5 w-5" />,
    color: 'text-red-400',
    description: 'Nutrition guidance based on blood type characteristics',
    content: [
      'Type A: Often thrives on plant-based proteins, fish, and fermented foods. May want to limit red meat.',
      'Type B: Varied diet works well including dairy, eggs, green vegetables, and most meats except chicken.',
      'Type AB: Combination approach - seafood, tofu, dairy, and green vegetables. Smaller, frequent meals help.',
      'Type O: Typically performs well with lean proteins and may benefit from limiting grains and dairy.',
      'All blood types benefit from whole, unprocessed foods as the dietary foundation.'
    ]
  },
  {
    id: 'hydration',
    name: 'Hydration',
    icon: <Droplets className="h-5 w-5" />,
    color: 'text-blue-400',
    description: 'Optimal fluid intake for peak athletic performance',
    content: [
      'Drink 16-20 oz of water 2-3 hours before activity.',
      'During exercise: 7-10 oz every 10-20 minutes.',
      'Monitor urine color - pale yellow indicates good hydration.',
      'Weigh before/after practice - drink 16-24 oz per pound lost.',
      'Add electrolytes during hot weather or intense sessions over 60 minutes.'
    ]
  },
  {
    id: 'minerals',
    name: 'Minerals',
    icon: <FlaskConical className="h-5 w-5" />,
    color: 'text-emerald-400',
    description: 'Essential minerals for muscle function and recovery',
    content: [
      'Magnesium: Supports muscle function - nuts, seeds, dark chocolate.',
      'Iron: Carries oxygen to muscles - red meat, spinach, legumes.',
      'Zinc: Immune function and healing - oysters, beef, pumpkin seeds.',
      'Calcium: Bone strength - dairy, leafy greens, fortified foods.',
      'Potassium: Prevents cramps - bananas, potatoes, avocados.'
    ]
  },
  {
    id: 'recovery',
    name: 'Recovery',
    icon: <Moon className="h-5 w-5" />,
    color: 'text-indigo-400',
    description: 'Nutrition strategies for optimal muscle repair',
    content: [
      'Consume protein within 30-60 minutes after training.',
      'Tart cherry juice reduces inflammation and soreness.',
      'Sleep 8-10 hours for optimal recovery.',
      'Omega-3s from fish reduce inflammation.',
      'Chocolate milk provides ideal carb-to-protein ratio for recovery.'
    ]
  },
  {
    id: 'blood_flow',
    name: 'Blood Flow',
    icon: <Waves className="h-5 w-5" />,
    color: 'text-rose-400',
    description: 'Foods that improve circulation and oxygen delivery',
    content: [
      'Beets contain nitric oxide for improved blood flow.',
      'Dark chocolate improves blood vessel function.',
      'Garlic supports healthy blood pressure.',
      'Leafy greens are high in nitrates.',
      'Fatty fish like salmon reduce inflammation and improve circulation.'
    ]
  },
  {
    id: 'lymphatic',
    name: 'Lymphatic Health',
    icon: <Activity className="h-5 w-5" />,
    color: 'text-teal-400',
    description: 'Supporting your body\'s waste removal system',
    content: [
      'Movement is essential for lymph flow - the system has no pump.',
      'Deep breathing creates pressure changes that move lymph fluid.',
      'Citrus fruits support lymphatic cleansing.',
      'Avoid tight clothing that restricts flow.',
      'Dry brushing before showers stimulates lymphatic circulation.'
    ]
  },
  {
    id: 'vitamins',
    name: 'Vitamins',
    icon: <Sun className="h-5 w-5" />,
    color: 'text-yellow-400',
    description: 'Essential vitamins for athletic performance',
    content: [
      'Vitamin D: Bone health and immune function - sunlight, supplements.',
      'Vitamin C: Collagen production and immunity - citrus fruits.',
      'B Vitamins: Energy production - whole grains, meat, eggs.',
      'Vitamin E: Cell protection - nuts and seeds.',
      'Vitamin K: Blood clotting and bone health - leafy greens.'
    ]
  },
  {
    id: 'daily_nutrition',
    name: 'Daily Nutrition',
    icon: <Apple className="h-5 w-5" />,
    color: 'text-green-400',
    description: 'Everyday eating habits for sustained performance',
    content: [
      'Eat breakfast within an hour of waking.',
      'Include protein at every meal.',
      'Fill half your plate with vegetables.',
      'Eat the rainbow - different colors provide different nutrients.',
      'Plan and prep meals ahead to avoid poor choices.'
    ]
  },
  {
    id: 'longevity',
    name: 'Longevity',
    icon: <Brain className="h-5 w-5" />,
    color: 'text-purple-400',
    description: 'Nutrition for long-term health and career sustainability',
    content: [
      'Blue zone diets emphasize plants, legumes, and moderate protein.',
      'Reducing sugar intake may slow cellular aging.',
      'Maintain muscle mass through protein and exercise.',
      'Colorful vegetables provide protective antioxidants.',
      'Regular physical activity is a top predictor of longevity.'
    ]
  },
  {
    id: 'weight',
    name: 'Weight Management',
    icon: <Scale className="h-5 w-5" />,
    color: 'text-orange-400',
    description: 'Healthy approaches to body composition',
    content: [
      'Create modest caloric deficit (300-500 cal) for sustainable fat loss.',
      'Protein intake of 1g per pound supports muscle retention.',
      'Don\'t drastically cut calories - it impairs performance.',
      'Focus on body composition, not just scale weight.',
      'In-season is not the time for aggressive weight loss.'
    ]
  },
  {
    id: 'vegan',
    name: 'Vegan Guidance',
    icon: <Leaf className="h-5 w-5" />,
    color: 'text-lime-400',
    description: 'Plant-based nutrition for athletes',
    content: [
      'Combine different plant proteins for complete amino acids.',
      'B12 supplementation is essential for vegan athletes.',
      'Pair plant iron sources with vitamin C for absorption.',
      'Algae supplements provide omega-3s (DHA/EPA).',
      'Legumes, tofu, tempeh, and seitan are excellent protein sources.'
    ]
  },
  {
    id: 'restrictive',
    name: 'Restrictive Diets',
    icon: <Salad className="h-5 w-5" />,
    color: 'text-cyan-400',
    description: 'Managing allergies and dietary restrictions',
    content: [
      'Gluten-free: Choose whole grains like rice and quinoa.',
      'Dairy-free: Fortified milks and leafy greens for calcium.',
      'Read labels carefully for hidden allergens.',
      'Travel with safe snacks for dietary restrictions.',
      'Work with a dietitian to ensure nutritional adequacy.'
    ]
  },
  {
    id: 'offseason',
    name: 'Off-Season Body Priming',
    icon: <Dumbbell className="h-5 w-5" />,
    color: 'text-slate-400',
    description: 'Building your nutritional foundation',
    content: [
      'Best time to address nutritional deficiencies.',
      'Focus on building lean muscle mass.',
      'Get comprehensive blood work done.',
      'Experiment with meal timing.',
      'Build healthy habits that carry into the season.'
    ]
  },
  {
    id: 'inseason',
    name: 'In-Season Body Priming',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-amber-400',
    description: 'Maintaining performance during competition',
    content: [
      'Maintain consistent eating patterns.',
      'Prioritize recovery nutrition after every game.',
      'Don\'t try new foods on game day.',
      'Keep energy intake high enough for demands.',
      'In-season is not the time for restrictive dieting.'
    ]
  },
  {
    id: 'performance',
    name: 'Performance Priming',
    icon: <Trophy className="h-5 w-5" />,
    color: 'text-gold-400',
    description: 'Pre-competition nutrition strategies',
    content: [
      'Carb load the day before competition.',
      'Caffeine 30-60 minutes before can enhance performance.',
      'Pre-game meals: high carb, moderate protein, low fat.',
      'Avoid high-fiber foods before games.',
      'Stick to familiar foods to prevent GI issues.'
    ]
  },
  {
    id: 'ingame_hydration',
    name: 'In-Game Hydration',
    icon: <Droplets className="h-5 w-5" />,
    color: 'text-sky-400',
    description: 'Staying hydrated during competition',
    content: [
      'Small sips between innings, not large amounts.',
      'Sports drinks appropriate for games over 60 minutes.',
      'Electrolyte tablets in water during hot games.',
      'Know where water stations are in your dugout.',
      'Don\'t wait until thirsty - drink on a schedule.'
    ]
  },
  {
    id: 'supplements',
    name: 'NSF-Approved Supplements',
    icon: <Pill className="h-5 w-5" />,
    color: 'text-pink-400',
    description: 'Safe, tested supplements for athletes',
    content: [
      'NSF Certified for Sport products are tested for banned substances.',
      'Whey protein is well-researched for muscle building.',
      'Creatine monohydrate is one of the most studied supplements.',
      'Fish oil provides omega-3s when diet is insufficient.',
      'Always check supplements against banned substance lists.'
    ]
  },
  {
    id: 'holistic',
    name: 'Holistic Health',
    icon: <Sparkles className="h-5 w-5" />,
    color: 'text-violet-400',
    description: 'Mind-body approaches to nutrition',
    content: [
      'Mind-body practices like meditation complement nutrition.',
      'Stress reduction improves digestion and absorption.',
      'Sleep hygiene is as important as nutrition.',
      'Eating without screens improves mindfulness.',
      'Social eating with teammates builds healthy habits.'
    ]
  }
];

export function NutritionCategory() {
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
                <h3 className="font-semibold text-sm sm:text-base">{category.name}</h3>
                <p className="text-xs text-muted-foreground hidden sm:block">{category.description}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <p className="text-xs text-muted-foreground mb-3 sm:hidden">{category.description}</p>
            <ul className="space-y-2">
              {category.content.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${category.color.replace('text-', 'bg-')}`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
