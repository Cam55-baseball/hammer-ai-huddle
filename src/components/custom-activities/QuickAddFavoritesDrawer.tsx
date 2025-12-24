import { useTranslation } from 'react-i18next';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Star, Plus, Clock, Dumbbell, Flame, Apple, Heart, Zap, Target, Trophy, Timer, Activity, Utensils, Moon, Sun, Coffee, Salad, Bike, Users, Clipboard, Pencil, Sparkles, Footprints } from 'lucide-react';
import { CustomActivityTemplate } from '@/types/customActivity';

interface QuickAddFavoritesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  favorites: CustomActivityTemplate[];
  onAddToToday: (templateId: string) => void;
  onEdit?: (template: CustomActivityTemplate) => void;
  loading?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  dumbbell: Dumbbell,
  flame: Flame,
  heart: Heart,
  zap: Zap,
  target: Target,
  trophy: Trophy,
  timer: Timer,
  activity: Activity,
  utensils: Utensils,
  moon: Moon,
  sun: Sun,
  coffee: Coffee,
  apple: Apple,
  salad: Salad,
  bike: Bike,
  users: Users,
  clipboard: Clipboard,
  pencil: Pencil,
  star: Star,
  sparkles: Sparkles,
  footprints: Footprints,
};

export function QuickAddFavoritesDrawer({ 
  open, 
  onOpenChange, 
  favorites, 
  onAddToToday,
  onEdit,
  loading 
}: QuickAddFavoritesDrawerProps) {
  const { t } = useTranslation();

  const handleAdd = async (templateId: string) => {
    await onAddToToday(templateId);
    onOpenChange(false);
  };

  const handleEdit = (e: React.MouseEvent, template: CustomActivityTemplate) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(template);
      onOpenChange(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            {t('customActivity.favorites.drawerTitle')}
          </DrawerTitle>
          <DrawerDescription>
            {t('customActivity.favorites.drawerDescription')}
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="px-4 pb-6 space-y-3 overflow-y-auto max-h-[60vh]">
          {favorites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t('customActivity.favorites.noFavorites')}</p>
              <p className="text-xs mt-1">{t('customActivity.favorites.noFavoritesHint')}</p>
            </div>
          ) : (
            favorites.map((template) => {
              const IconComponent = iconMap[template.icon] || Activity;
              return (
                <div
                  key={template.id}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors"
                >
                  <div 
                    className="p-2 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: template.color + '30' }}
                  >
                    <IconComponent 
                      className="h-5 w-5" 
                      style={{ color: template.color }}
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-semibold text-foreground truncate">{template.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{t(`customActivity.types.${template.activity_type}`)}</span>
                      {template.duration_minutes && (
                        <>
                          <span>•</span>
                          <Clock className="h-3 w-3" />
                          <span>{template.duration_minutes} {t('customActivity.minutes')}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-foreground"
                        onClick={(e) => handleEdit(e, template)}
                        disabled={loading}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-primary hover:text-primary"
                      onClick={() => handleAdd(template.id)}
                      disabled={loading}
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
