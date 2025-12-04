import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bandage, CircleDot, Dumbbell, Hand, ShieldCheck, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const equipmentCategories = [
  { key: "tape", icon: Bandage, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  { key: "sleeves", icon: CircleDot, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  { key: "bands", icon: Dumbbell, color: "text-green-500", bgColor: "bg-green-500/10" },
  { key: "softTissue", icon: Hand, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  { key: "supports", icon: ShieldCheck, color: "text-red-500", bgColor: "bg-red-500/10" },
];

const equipmentItems = [
  { key: "kinesioTape", category: "tape" },
  { key: "athleticTape", category: "tape" },
  { key: "compressionSleeve", category: "sleeves" },
  { key: "kneeSleeve", category: "sleeves" },
  { key: "resistanceBands", category: "bands" },
  { key: "therapyBands", category: "bands" },
  { key: "foamRoller", category: "softTissue" },
  { key: "massageBall", category: "softTissue" },
  { key: "ankleBrace", category: "supports" },
  { key: "wristSupport", category: "supports" },
];

export function EquipmentLibrary() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredItems = equipmentItems.filter((item) => {
    const matchesSearch = t(`bounceBackBay.equipmentLibrary.items.${item.key}.name`)
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryInfo = (categoryKey: string) => {
    return equipmentCategories.find((c) => c.key === categoryKey);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {t('bounceBackBay.equipmentLibrary.intro')}
      </p>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('bounceBackBay.equipmentLibrary.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(null)}
          >
            {t('bounceBackBay.equipmentLibrary.allCategories')}
          </Badge>
          {equipmentCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Badge
                key={cat.key}
                variant={selectedCategory === cat.key ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(cat.key)}
              >
                <Icon className="h-3 w-3 mr-1" />
                {t(`bounceBackBay.equipmentLibrary.categories.${cat.key}`)}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredItems.map((item) => {
          const categoryInfo = getCategoryInfo(item.category);
          const Icon = categoryInfo?.icon || Bandage;
          return (
            <Card key={item.key} className="h-full">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${categoryInfo?.bgColor} shrink-0`}>
                    <Icon className={`h-5 w-5 ${categoryInfo?.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-sm">
                      {t(`bounceBackBay.equipmentLibrary.items.${item.key}.name`)}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {t(`bounceBackBay.equipmentLibrary.categories.${item.category}`)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {t('bounceBackBay.equipmentLibrary.whatItDoes')}
                  </p>
                  <p className="text-sm text-foreground">
                    {t(`bounceBackBay.equipmentLibrary.items.${item.key}.description`)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    {t('bounceBackBay.equipmentLibrary.whenUsed')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(`bounceBackBay.equipmentLibrary.items.${item.key}.usage`)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>{t('bounceBackBay.equipmentLibrary.noResults')}</p>
        </div>
      )}
    </div>
  );
}
