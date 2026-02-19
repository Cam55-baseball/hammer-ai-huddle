import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Droplets, Zap, Clock, Leaf } from 'lucide-react';
import { usePhysioDailyReport } from '@/hooks/usePhysioDailyReport';
import { cn } from '@/lib/utils';

interface SuggestionItemProps {
  icon: React.ReactNode;
  title: string;
  text: string;
  color?: string;
}

function SuggestionItem({ icon, title, text, color = 'text-primary' }: SuggestionItemProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/50">
      <div className={cn('mt-0.5 flex-shrink-0', color)}>
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
        <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/50">
          Educational only · Consult a professional
        </span>
      </div>
    </div>
  );
}

export function PhysioNutritionSuggestions() {
  const { report, regulationColor, regulationScore } = usePhysioDailyReport();

  if (!report || !regulationColor || !regulationScore) return null;

  const isHighLoad = (report.load_score ?? 75) < 50;
  const isLowFuel = (report.fuel_score ?? 75) < 60;
  const isGameSoon = (report.calendar_score ?? 100) < 80;
  const isHighStress = (report.stress_score ?? 75) < 50;

  const suggestions = [];

  // Hydration suggestion based on load
  suggestions.push({
    icon: <Droplets className="h-4 w-4" />,
    title: isHighLoad ? 'Increase Hydration Today' : 'Maintain Hydration',
    text: isHighLoad
      ? 'High training load detected. Aim for 100-120 oz of water today. Add electrolytes if training lasted over 60 minutes.'
      : 'Stay consistent with your water intake. Aim for 80-100 oz throughout the day, especially before and after training.',
    color: 'text-blue-400',
  });

  // Carb timing if game soon
  if (isGameSoon) {
    suggestions.push({
      icon: <Zap className="h-4 w-4" />,
      title: 'Pre-Game Carb Loading',
      text: 'A competition is approaching. Consider increasing carbohydrates 24-48 hours before to top off glycogen stores. Focus on whole grains, sweet potatoes, and fruit.',
      color: 'text-amber-400',
    });
  }

  // Electrolytes for high load
  if (isHighLoad) {
    suggestions.push({
      icon: <Zap className="h-4 w-4" />,
      title: 'Electrolyte Support',
      text: 'Heavy CNS load can deplete sodium, potassium, and magnesium. Consider a quality electrolyte supplement or foods like bananas, avocado, and leafy greens.',
      color: 'text-yellow-400',
    });
  }

  // Supplement education based on regulation color
  if (regulationColor === 'red') {
    suggestions.push({
      icon: <Leaf className="h-4 w-4" />,
      title: 'Tart Cherry for Recovery',
      text: 'Tart cherry juice contains natural anti-inflammatory compounds. Research suggests 8-12 oz before sleep may support muscle recovery. Educational — consult your doctor before adding supplements.',
      color: 'text-red-400',
    });
  }

  if (isHighStress) {
    suggestions.push({
      icon: <Leaf className="h-4 w-4" />,
      title: 'Magnesium & Stress Support',
      text: 'High stress can deplete magnesium. Dietary sources include dark chocolate, almonds, spinach, and pumpkin seeds. A supplement may be considered — always consult a professional first.',
      color: 'text-purple-400',
    });
  }

  // Meal timing reminder
  if (isLowFuel) {
    suggestions.push({
      icon: <Clock className="h-4 w-4" />,
      title: 'Under-Fueled Alert',
      text: "Your calorie intake appears low relative to your needs. Under-eating impairs recovery, hormones, and performance. Aim for regular meals every 3-4 hours with adequate protein and carbohydrates.",
      color: 'text-orange-400',
    });
  }

  if (suggestions.length === 0) return null;

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Leaf className="h-4 w-4 text-primary" />
          Physio Nutrition Insights
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            Score: {regulationScore}/100
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((s, i) => (
          <SuggestionItem key={i} {...s} />
        ))}
        <div className="flex items-start gap-2 p-2 bg-muted/20 rounded-lg mt-2">
          <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            All suggestions are educational and not medical or nutritional advice. Consult a registered dietitian or physician before making dietary changes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
