import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, ExternalLink } from "lucide-react";

interface Equipment {
  id: string;
  name: string;
  description?: string;
  is_required: boolean;
  category?: string;
  purchase_link?: string;
}

interface EquipmentListProps {
  equipment: Equipment[];
  title?: string;
}

export function EquipmentList({ equipment, title = "Required Equipment" }: EquipmentListProps) {
  if (!equipment || equipment.length === 0) {
    return null;
  }

  const requiredEquipment = equipment.filter(e => e.is_required);
  const optionalEquipment = equipment.filter(e => !e.is_required);

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>

      {requiredEquipment.length > 0 && (
        <div className="space-y-3 mb-4">
          <h4 className="text-sm font-medium text-muted-foreground">Required</h4>
          <div className="grid gap-3">
            {requiredEquipment.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{item.name}</p>
                    {item.category && (
                      <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
                {item.purchase_link && (
                  <a
                    href={item.purchase_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 flex-shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {optionalEquipment.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Optional</h4>
          <div className="grid gap-3">
            {optionalEquipment.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/20">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{item.name}</p>
                    {item.category && (
                      <Badge variant="outline" className="text-xs">{item.category}</Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
                {item.purchase_link && (
                  <a
                    href={item.purchase_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 flex-shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t">
        <p className="text-xs text-muted-foreground italic">
          Hammers Modality is not responsible for any injury that may occur during exercises. Results are not guaranteed.
        </p>
      </div>
    </Card>
  );
}