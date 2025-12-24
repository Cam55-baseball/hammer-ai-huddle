import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Palette, RotateCcw, Save, Check, Zap, Brain, BarChart3, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useUserColors,
  ColorPreferences,
  colorPresets,
  themePresets,
  generateColorScheme,
  hexToRgba,
} from '@/hooks/useUserColors';

interface ColorCustomizationCardProps {
  selectedSport?: string;
}

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  description?: string;
}

const ColorPicker = ({ label, value, onChange, description }: ColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-24 h-8 p-1 gap-2"
          >
            <div
              className="w-5 h-5 rounded border border-border"
              style={{ backgroundColor: value }}
            />
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="end">
          <div className="grid grid-cols-6 gap-2">
            {colorPresets.map((preset) => (
              <button
                key={preset.name}
                className={cn(
                  "w-8 h-8 rounded-md border-2 transition-all hover:scale-110",
                  value === preset.value ? "border-foreground ring-2 ring-primary" : "border-transparent"
                )}
                style={{ backgroundColor: preset.value }}
                onClick={() => {
                  onChange(preset.value);
                  setIsOpen(false);
                }}
                title={preset.name}
              />
            ))}
          </div>
          <div className="mt-3 pt-3 border-t">
            <label className="text-xs text-muted-foreground block mb-1">Custom Hex</label>
            <input
              type="text"
              value={value}
              onChange={(e) => {
                const hex = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                  onChange(hex);
                }
              }}
              className="w-full px-2 py-1 text-sm rounded border bg-background"
              placeholder="#f59e0b"
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Live preview component
interface TaskPreviewProps {
  background: string;
  border: string;
  icon: string;
  iconComponent: React.ElementType;
  label: string;
  completed?: boolean;
}

const TaskPreview = ({ background, border, icon, iconComponent: Icon, label, completed }: TaskPreviewProps) => (
  <div
    className={cn(
      "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
      completed && "opacity-60"
    )}
    style={{
      backgroundColor: background,
      borderColor: border,
    }}
  >
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center"
      style={{ backgroundColor: icon }}
    >
      <Icon className="h-4 w-4 text-white" />
    </div>
    <span className="text-sm text-foreground font-medium">{label}</span>
    <div className="ml-auto">
      {completed ? (
        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="h-3 w-3 text-white" />
        </div>
      ) : (
        <div
          className="w-6 h-6 rounded-full border-2 border-dashed flex items-center justify-center"
          style={{ borderColor: border }}
        >
          <Zap className="h-3 w-3" style={{ color: icon }} />
        </div>
      )}
    </div>
  </div>
);

export const ColorCustomizationCard = ({ selectedSport }: ColorCustomizationCardProps) => {
  const { t } = useTranslation();
  const {
    colorPreferences,
    loading,
    saving,
    getEffectiveColors,
    saveColorPreferences,
    resetToDefault,
    applyThemePreset,
    getDefaultColors,
  } = useUserColors(selectedSport);

  // Local state for editing (so changes show immediately in preview)
  const [localColors, setLocalColors] = useState<ColorPreferences | null>(null);
  const [activeTheme, setActiveTheme] = useState<string>('Classic');
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local colors when preferences load
  useEffect(() => {
    if (!loading) {
      setLocalColors(getEffectiveColors());
    }
  }, [loading, getEffectiveColors]);

  // Track changes
  useEffect(() => {
    if (localColors && !loading) {
      const effective = colorPreferences || getDefaultColors();
      setHasChanges(JSON.stringify(localColors) !== JSON.stringify(effective));
    }
  }, [localColors, colorPreferences, loading, getDefaultColors]);

  const handleThemeSelect = (themeName: string) => {
    const newColors = applyThemePreset(themeName);
    setLocalColors(newColors);
    setActiveTheme(themeName);
  };

  const handleColorChange = (path: string[], value: string) => {
    if (!localColors) return;
    
    setActiveTheme('Custom');
    setLocalColors((prev) => {
      if (!prev) return prev;
      const updated = JSON.parse(JSON.stringify(prev)) as ColorPreferences;
      
      // Navigate to the nested property and set it
      let current: Record<string, unknown> = updated as unknown as Record<string, unknown>;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]] as Record<string, unknown>;
      }
      current[path[path.length - 1]] = value;
      
      // If changing the icon color for pending tasks, also update background/border
      if (path[0] === 'gamePlan' && path[2] === 'icon') {
        const taskType = path[1] as string;
        const scheme = generateColorScheme(value);
        (updated.gamePlan as Record<string, Record<string, string>>)[taskType] = {
          ...scheme,
          icon: value,
        };
      }
      
      return updated;
    });
  };

  const handleSave = async () => {
    if (!localColors) return;
    
    const success = await saveColorPreferences(localColors);
    if (success) {
      toast.success(t('profile.colorsSaved', 'Colors saved successfully!'));
      setHasChanges(false);
    } else {
      toast.error(t('profile.colorsSaveError', 'Failed to save colors'));
    }
  };

  const handleReset = async () => {
    const success = await resetToDefault();
    if (success) {
      setLocalColors(getDefaultColors());
      setActiveTheme('Classic');
      setHasChanges(false);
      toast.success(t('profile.colorsReset', 'Colors reset to default'));
    }
  };

  if (loading || !localColors) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {t('profile.colorCustomization', 'Color Customization')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          {t('profile.colorCustomization', 'Color Customization')}
        </CardTitle>
        <CardDescription>
          {t('profile.colorCustomizationDesc', 'Personalize your app colors with live previews')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Theme Presets */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('profile.quickThemes', 'Quick Themes')}</label>
          <div className="flex flex-wrap gap-2">
            {themePresets.map((theme) => (
              <Button
                key={theme.name}
                variant={activeTheme === theme.name ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleThemeSelect(theme.name)}
                className="text-xs"
              >
                {theme.name}
              </Button>
            ))}
            {activeTheme === 'Custom' && (
              <Button variant="default" size="sm" className="text-xs" disabled>
                Custom
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="gameplan" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gameplan" className="text-xs sm:text-sm">
              🎯 Game Plan
            </TabsTrigger>
            <TabsTrigger value="modules" className="text-xs sm:text-sm">
              📊 Modules
            </TabsTrigger>
            <TabsTrigger value="general" className="text-xs sm:text-sm">
              🎨 General
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gameplan" className="space-y-4 mt-4">
            {/* Pending Tasks */}
            <div className="p-4 rounded-lg border bg-background/50">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                {t('profile.pendingTasks', 'Pending Tasks')}
              </h4>
              <ColorPicker
                label={t('profile.accentColor', 'Accent Color')}
                description={t('profile.changesBackgroundBorderIcon', 'Changes background, border & icon')}
                value={localColors.gamePlan.pending.icon}
                onChange={(color) => handleColorChange(['gamePlan', 'pending', 'icon'], color)}
              />
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">{t('profile.preview', 'Preview')}</p>
                <TaskPreview
                  background={localColors.gamePlan.pending.background}
                  border={localColors.gamePlan.pending.border}
                  icon={localColors.gamePlan.pending.icon}
                  iconComponent={Zap}
                  label={t('profile.sampleTask', 'Log your breakfast')}
                />
              </div>
            </div>

            {/* Tex Vision Tasks */}
            <div className="p-4 rounded-lg border bg-background/50">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4 text-teal-500" />
                {t('profile.texVisionTasks', 'TEX Vision Tasks')}
              </h4>
              <ColorPicker
                label={t('profile.accentColor', 'Accent Color')}
                value={localColors.gamePlan.texVision.icon}
                onChange={(color) => handleColorChange(['gamePlan', 'texVision', 'icon'], color)}
              />
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">{t('profile.preview', 'Preview')}</p>
                <TaskPreview
                  background={localColors.gamePlan.texVision.background}
                  border={localColors.gamePlan.texVision.border}
                  icon={localColors.gamePlan.texVision.icon}
                  iconComponent={Brain}
                  label={t('profile.sampleTexVision', 'Complete vision drill')}
                />
              </div>
            </div>

            {/* Tracking Tasks */}
            <div className="p-4 rounded-lg border bg-background/50">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                {t('profile.trackingTasks', 'Tracking Tasks')}
              </h4>
              <ColorPicker
                label={t('profile.accentColor', 'Accent Color')}
                value={localColors.gamePlan.tracking.icon}
                onChange={(color) => handleColorChange(['gamePlan', 'tracking', 'icon'], color)}
              />
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">{t('profile.preview', 'Preview')}</p>
                <TaskPreview
                  background={localColors.gamePlan.tracking.background}
                  border={localColors.gamePlan.tracking.border}
                  icon={localColors.gamePlan.tracking.icon}
                  iconComponent={BarChart3}
                  label={t('profile.sampleTracking', 'Log workout notes')}
                />
              </div>
            </div>

            {/* Completed Tasks */}
            <div className="p-4 rounded-lg border bg-background/50">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                {t('profile.completedTasks', 'Completed Tasks')}
              </h4>
              <ColorPicker
                label={t('profile.accentColor', 'Accent Color')}
                value={localColors.gamePlan.completed.icon}
                onChange={(color) => handleColorChange(['gamePlan', 'completed', 'icon'], color)}
              />
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">{t('profile.preview', 'Preview')}</p>
                <TaskPreview
                  background={localColors.gamePlan.completed.background}
                  border={localColors.gamePlan.completed.border}
                  icon={localColors.gamePlan.completed.icon}
                  iconComponent={Check}
                  label={t('profile.sampleCompleted', 'Morning focus quiz')}
                  completed
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="modules" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg border bg-background/50">
              <h4 className="text-sm font-semibold mb-4">{t('profile.moduleAccentColors', 'Module Accent Colors')}</h4>
              <p className="text-xs text-muted-foreground mb-4">
                {t('profile.moduleColorsDesc', 'These colors appear in module cards and headers throughout the app')}
              </p>
              
              <div className="space-y-1">
                <ColorPicker
                  label={t('modules.hitting', 'Hitting')}
                  value={localColors.modules.hitting}
                  onChange={(color) => handleColorChange(['modules', 'hitting'], color)}
                />
                <ColorPicker
                  label={t('modules.pitching', 'Pitching')}
                  value={localColors.modules.pitching}
                  onChange={(color) => handleColorChange(['modules', 'pitching'], color)}
                />
                <ColorPicker
                  label={t('modules.throwing', 'Throwing')}
                  value={localColors.modules.throwing}
                  onChange={(color) => handleColorChange(['modules', 'throwing'], color)}
                />
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-3">{t('profile.preview', 'Preview')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['hitting', 'pitching', 'throwing'] as const).map((module) => (
                    <div
                      key={module}
                      className="p-3 rounded-lg text-center text-xs font-medium text-white"
                      style={{ backgroundColor: localColors.modules[module] }}
                    >
                      {t(`modules.${module}`, module)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="p-4 rounded-lg border bg-background/50">
              <h4 className="text-sm font-semibold mb-4">{t('profile.generalTheme', 'General Theme Colors')}</h4>
              <p className="text-xs text-muted-foreground mb-4">
                {t('profile.generalColorsDesc', 'Primary and secondary accent colors used throughout the app')}
              </p>
              
              <div className="space-y-1">
                <ColorPicker
                  label={t('profile.primaryAccent', 'Primary Accent')}
                  description={t('profile.primaryDesc', 'Main brand color for buttons and highlights')}
                  value={localColors.general.primary}
                  onChange={(color) => handleColorChange(['general', 'primary'], color)}
                />
                <ColorPicker
                  label={t('profile.secondaryAccent', 'Secondary Accent')}
                  description={t('profile.secondaryDesc', 'Supporting color for secondary elements')}
                  value={localColors.general.secondary}
                  onChange={(color) => handleColorChange(['general', 'secondary'], color)}
                />
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-3">{t('profile.preview', 'Preview')}</p>
                <div className="flex gap-3">
                  <Button
                    style={{ backgroundColor: localColors.general.primary }}
                    className="text-white border-0"
                  >
                    Primary Button
                  </Button>
                  <Button
                    variant="outline"
                    style={{ 
                      borderColor: localColors.general.secondary,
                      color: localColors.general.secondary,
                    }}
                  >
                    Secondary
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex-1"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {t('profile.saveColors', 'Save Colors')}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('profile.resetToDefault', 'Reset')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ColorCustomizationCard;
