import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { 
  Heart, 
  Brain, 
  Wind, 
  Lightbulb, 
  Shield, 
  Sparkles, 
  BookOpen, 
  Phone, 
  BookMarked,
  BarChart3
} from 'lucide-react';

export type WellnessModule = 
  | 'overview'
  | 'emotional-awareness'
  | 'stress-management'
  | 'mindfulness'
  | 'cognitive-skills'
  | 'resilience'
  | 'healing'
  | 'education'
  | 'crisis'
  | 'journal'
  | 'insights';

interface WellnessHubNavProps {
  activeModule: WellnessModule;
  onModuleChange: (module: WellnessModule) => void;
}

const moduleConfig: { id: WellnessModule; icon: React.ElementType; labelKey: string; color: string }[] = [
  { id: 'emotional-awareness', icon: Heart, labelKey: 'mentalWellness.nav.emotionalAwareness', color: 'wellness-coral' },
  { id: 'stress-management', icon: Brain, labelKey: 'mentalWellness.nav.stressManagement', color: 'wellness-lavender' },
  { id: 'mindfulness', icon: Wind, labelKey: 'mentalWellness.nav.mindfulness', color: 'wellness-sky' },
  { id: 'cognitive-skills', icon: Lightbulb, labelKey: 'mentalWellness.nav.cognitiveSkills', color: 'wellness-sage' },
  { id: 'resilience', icon: Shield, labelKey: 'mentalWellness.nav.resilience', color: 'wellness-coral' },
  { id: 'healing', icon: Sparkles, labelKey: 'mentalWellness.nav.healing', color: 'wellness-lavender' },
  { id: 'education', icon: BookOpen, labelKey: 'mentalWellness.nav.education', color: 'wellness-sky' },
  { id: 'crisis', icon: Phone, labelKey: 'mentalWellness.nav.crisis', color: 'wellness-warning' },
  { id: 'journal', icon: BookMarked, labelKey: 'mentalWellness.nav.journal', color: 'wellness-sage' },
  { id: 'insights', icon: BarChart3, labelKey: 'mentalWellness.nav.insights', color: 'wellness-lavender' },
];

export default function WellnessHubNav({ activeModule, onModuleChange }: WellnessHubNavProps) {
  const { t } = useTranslation();

  return (
    <div className="w-full overflow-x-auto scrollbar-hide -mx-2 px-2">
      <nav className="flex gap-2 pb-2 min-w-max">
        {moduleConfig.map((module) => {
          const Icon = module.icon;
          const isActive = activeModule === module.id;
          
          return (
            <button
              key={module.id}
              onClick={() => onModuleChange(module.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                "whitespace-nowrap",
                isActive
                  ? `bg-${module.color} text-${module.color}-foreground shadow-md scale-[1.02]`
                  : "bg-wellness-cream text-muted-foreground hover:bg-wellness-soft-gray hover:text-foreground"
              )}
              style={isActive ? {
                backgroundColor: `hsl(var(--${module.color}))`,
                color: `hsl(var(--${module.color}-foreground))`
              } : undefined}
            >
              <Icon className="h-4 w-4" />
              <span>{t(module.labelKey)}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
