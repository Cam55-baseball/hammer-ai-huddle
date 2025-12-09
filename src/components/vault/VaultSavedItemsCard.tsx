import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bookmark, ChevronDown, ChevronUp, Trash2, Target, Lightbulb } from 'lucide-react';

interface SavedDrill {
  id: string;
  drill_name: string;
  drill_description: string | null;
  module_origin: string;
  sport: string;
  saved_at: string;
}

interface SavedTip {
  id: string;
  tip_text: string;
  tip_category: string | null;
  module_origin: string;
  saved_at: string;
}

interface VaultSavedItemsCardProps {
  drills: SavedDrill[];
  tips: SavedTip[];
  onDeleteDrill: (id: string) => Promise<void>;
  onDeleteTip: (id: string) => Promise<void>;
}

export function VaultSavedItemsCard({ drills, tips, onDeleteDrill, onDeleteTip }: VaultSavedItemsCardProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('drills');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedDrillId, setExpandedDrillId] = useState<string | null>(null);

  const handleDeleteDrill = async (id: string) => {
    setDeletingId(id);
    await onDeleteDrill(id);
    setDeletingId(null);
  };

  const handleDeleteTip = async (id: string) => {
    setDeletingId(id);
    await onDeleteTip(id);
    setDeletingId(null);
  };

  const totalItems = drills.length + tips.length;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-lg">{t('vault.savedItems.title')}</CardTitle>
                {totalItems > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {totalItems}
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <CardDescription>{t('vault.savedItems.description')}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="drills" className="gap-2">
                  <Target className="h-4 w-4" />
                  {t('vault.savedItems.drills')} ({drills.length})
                </TabsTrigger>
                <TabsTrigger value="tips" className="gap-2">
                  <Lightbulb className="h-4 w-4" />
                  {t('vault.savedItems.tips')} ({tips.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="drills">
                {drills.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('vault.savedItems.noDrills')}
                  </p>
                ) : (
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-2">
                      {drills.map((drill) => {
                        const isExpanded = expandedDrillId === drill.id;
                        const hasLongDescription = drill.drill_description && drill.drill_description.length > 100;
                        
                        return (
                          <div
                            key={drill.id}
                            className="p-3 rounded-lg bg-muted/50 border border-border"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{drill.drill_name}</p>
                                {drill.drill_description && (
                                  <div className="mt-1">
                                    <p className={`text-xs text-muted-foreground whitespace-pre-wrap break-words ${!isExpanded && hasLongDescription ? 'line-clamp-2' : ''}`}>
                                      {drill.drill_description}
                                    </p>
                                    {hasLongDescription && (
                                      <Button
                                        variant="link"
                                        size="sm"
                                        className="h-auto p-0 text-xs text-primary mt-1"
                                        onClick={() => setExpandedDrillId(isExpanded ? null : drill.id)}
                                      >
                                        {isExpanded ? (
                                          <span className="flex items-center gap-1">
                                            <ChevronUp className="h-3 w-3" />
                                            {t('vault.savedItems.showLess', 'Show less')}
                                          </span>
                                        ) : (
                                          <span className="flex items-center gap-1">
                                            <ChevronDown className="h-3 w-3" />
                                            {t('vault.savedItems.readMore', 'Read more')}
                                          </span>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {drill.module_origin}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {drill.sport}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteDrill(drill.id)}
                                disabled={deletingId === drill.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="tips">
                {tips.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('vault.savedItems.noTips')}
                  </p>
                ) : (
                  <ScrollArea className="max-h-[300px]">
                    <div className="space-y-2">
                      {tips.map((tip) => (
                        <div
                          key={tip.id}
                          className="p-3 rounded-lg bg-muted/50 border border-border"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm line-clamp-3">{tip.tip_text}</p>
                              <div className="flex items-center gap-2 mt-2">
                                {tip.tip_category && (
                                  <Badge variant="outline" className="text-xs">
                                    {tip.tip_category}
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-xs">
                                  {tip.module_origin}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteTip(tip.id)}
                              disabled={deletingId === tip.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
