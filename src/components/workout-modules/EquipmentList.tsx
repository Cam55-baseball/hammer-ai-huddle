import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Wrench } from 'lucide-react';

interface Equipment {
  id: string;
  name: string;
  required: boolean;
  description?: string;
}

interface EquipmentListProps {
  equipment: Equipment[];
  checkedItems: string[];
  onToggleItem: (itemId: string) => void;
}

export function EquipmentList({
  equipment,
  checkedItems,
  onToggleItem,
}: EquipmentListProps) {
  const { t } = useTranslation();
  const requiredItems = equipment.filter((e) => e.required);
  const optionalItems = equipment.filter((e) => !e.required);

  const renderItem = (item: Equipment) => {
    const isChecked = checkedItems.includes(item.id);
    return (
      <button
        key={item.id}
        onClick={() => onToggleItem(item.id)}
        className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
          isChecked
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-muted/30 hover:bg-muted/50'
        }`}
      >
        {isChecked ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <p className={`font-medium text-sm ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
            {item.name}
          </p>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.description}
            </p>
          )}
        </div>
      </button>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Wrench className="h-4 w-4 sm:h-5 sm:w-5" />
          {t('workoutModules.equipmentChecklist')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
        {requiredItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">
                {t('common.required')}
              </Badge>
            </div>
            <div className="space-y-2">
              {requiredItems.map(renderItem)}
            </div>
          </div>
        )}

        {optionalItems.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {t('common.optional')}
              </Badge>
            </div>
            <div className="space-y-2">
              {optionalItems.map(renderItem)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
