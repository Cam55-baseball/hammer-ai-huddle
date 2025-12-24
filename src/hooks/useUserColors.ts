import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ColorPreferences {
  gamePlan: {
    pending: {
      background: string;
      border: string;
      icon: string;
      text: string;
    };
    completed: {
      background: string;
      border: string;
      icon: string;
      text: string;
    };
    texVision: {
      background: string;
      border: string;
      icon: string;
      text: string;
    };
    tracking: {
      background: string;
      border: string;
      icon: string;
      text: string;
    };
  };
  modules: {
    hitting: string;
    pitching: string;
    throwing: string;
  };
  general: {
    primary: string;
    secondary: string;
  };
}

// Default color schemes
export const defaultBaseballColors: ColorPreferences = {
  gamePlan: {
    pending: {
      background: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(217, 119, 6, 0.6)',
      icon: '#f59e0b',
      text: '#fbbf24',
    },
    completed: {
      background: 'rgba(34, 197, 94, 0.1)',
      border: 'rgba(22, 163, 74, 0.6)',
      icon: '#22c55e',
      text: '#ffffff',
    },
    texVision: {
      background: 'rgba(20, 184, 166, 0.1)',
      border: 'rgba(20, 184, 166, 0.6)',
      icon: '#14b8a6',
      text: '#ffffff',
    },
    tracking: {
      background: 'rgba(168, 85, 247, 0.1)',
      border: 'rgba(168, 85, 247, 0.6)',
      icon: '#a855f7',
      text: '#ffffff',
    },
  },
  modules: {
    hitting: '#ef4444',
    pitching: '#3b82f6',
    throwing: '#8b5cf6',
  },
  general: {
    primary: '#ef4444',
    secondary: '#f59e0b',
  },
};

export const defaultSoftballColors: ColorPreferences = {
  gamePlan: {
    pending: {
      background: 'rgba(254, 240, 138, 0.2)',
      border: 'rgba(254, 240, 138, 0.6)',
      icon: '#fef08a',
      text: '#fef9c3',
    },
    completed: {
      background: 'rgba(34, 197, 94, 0.1)',
      border: 'rgba(22, 163, 74, 0.6)',
      icon: '#22c55e',
      text: '#ffffff',
    },
    texVision: {
      background: 'rgba(20, 184, 166, 0.1)',
      border: 'rgba(20, 184, 166, 0.6)',
      icon: '#14b8a6',
      text: '#ffffff',
    },
    tracking: {
      background: 'rgba(168, 85, 247, 0.1)',
      border: 'rgba(168, 85, 247, 0.6)',
      icon: '#a855f7',
      text: '#ffffff',
    },
  },
  modules: {
    hitting: '#ec4899',
    pitching: '#06b6d4',
    throwing: '#a855f7',
  },
  general: {
    primary: '#ec4899',
    secondary: '#fef08a',
  },
};

// Color presets for the picker
export const colorPresets = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Slate', value: '#64748b' },
];

// Quick theme presets
export const themePresets = [
  { name: 'Classic', description: 'Original amber/green theme' },
  { name: 'Ocean', description: 'Cool blues and teals' },
  { name: 'Sunset', description: 'Warm oranges and pinks' },
  { name: 'Forest', description: 'Natural greens and browns' },
  { name: 'Midnight', description: 'Deep purples and blues' },
];

// Helper to convert hex to rgba
export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Helper to generate color scheme from a single color
export const generateColorScheme = (baseColor: string) => ({
  background: hexToRgba(baseColor, 0.1),
  border: hexToRgba(baseColor, 0.6),
  icon: baseColor,
  text: '#ffffff',
});

export const useUserColors = (selectedSport?: string) => {
  const { user } = useAuth();
  const [colorPreferences, setColorPreferences] = useState<ColorPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Get default colors based on sport
  const getDefaultColors = useCallback(() => {
    return selectedSport === 'softball' ? defaultSoftballColors : defaultBaseballColors;
  }, [selectedSport]);

  // Fetch color preferences from database
  const fetchColorPreferences = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('color_preferences')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data?.color_preferences) {
        setColorPreferences(data.color_preferences as unknown as ColorPreferences);
      } else {
        setColorPreferences(null);
      }
    } catch (error) {
      console.error('Error fetching color preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Save color preferences to database
  const saveColorPreferences = useCallback(async (preferences: ColorPreferences) => {
    if (!user?.id) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ color_preferences: JSON.parse(JSON.stringify(preferences)) })
        .eq('id', user.id);

      if (error) throw error;

      setColorPreferences(preferences);
      // Also save to localStorage for faster loading
      localStorage.setItem(`color_preferences_${user.id}`, JSON.stringify(preferences));
      return true;
    } catch (error) {
      console.error('Error saving color preferences:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [user?.id]);

  // Reset to default colors
  const resetToDefault = useCallback(async () => {
    if (!user?.id) return false;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ color_preferences: null })
        .eq('id', user.id);

      if (error) throw error;

      setColorPreferences(null);
      localStorage.removeItem(`color_preferences_${user.id}`);
      return true;
    } catch (error) {
      console.error('Error resetting color preferences:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [user?.id]);

  // Get effective colors (custom or default)
  const getEffectiveColors = useCallback((): ColorPreferences => {
    if (colorPreferences) {
      return colorPreferences;
    }
    return getDefaultColors();
  }, [colorPreferences, getDefaultColors]);

  // Apply theme preset
  const applyThemePreset = useCallback((themeName: string): ColorPreferences => {
    const defaults = getDefaultColors();
    
    switch (themeName) {
      case 'Ocean':
        return {
          ...defaults,
          gamePlan: {
            pending: generateColorScheme('#0ea5e9'),
            completed: generateColorScheme('#10b981'),
            texVision: generateColorScheme('#06b6d4'),
            tracking: generateColorScheme('#3b82f6'),
          },
          modules: {
            hitting: '#0ea5e9',
            pitching: '#06b6d4',
            throwing: '#14b8a6',
          },
          general: {
            primary: '#0ea5e9',
            secondary: '#06b6d4',
          },
        };
      case 'Sunset':
        return {
          ...defaults,
          gamePlan: {
            pending: generateColorScheme('#f97316'),
            completed: generateColorScheme('#22c55e'),
            texVision: generateColorScheme('#ec4899'),
            tracking: generateColorScheme('#f43f5e'),
          },
          modules: {
            hitting: '#f97316',
            pitching: '#f43f5e',
            throwing: '#ec4899',
          },
          general: {
            primary: '#f97316',
            secondary: '#f43f5e',
          },
        };
      case 'Forest':
        return {
          ...defaults,
          gamePlan: {
            pending: generateColorScheme('#22c55e'),
            completed: generateColorScheme('#14b8a6'),
            texVision: generateColorScheme('#10b981'),
            tracking: generateColorScheme('#84cc16'),
          },
          modules: {
            hitting: '#22c55e',
            pitching: '#10b981',
            throwing: '#14b8a6',
          },
          general: {
            primary: '#22c55e',
            secondary: '#10b981',
          },
        };
      case 'Midnight':
        return {
          ...defaults,
          gamePlan: {
            pending: generateColorScheme('#8b5cf6'),
            completed: generateColorScheme('#10b981'),
            texVision: generateColorScheme('#6366f1'),
            tracking: generateColorScheme('#a855f7'),
          },
          modules: {
            hitting: '#8b5cf6',
            pitching: '#6366f1',
            throwing: '#a855f7',
          },
          general: {
            primary: '#8b5cf6',
            secondary: '#6366f1',
          },
        };
      case 'Classic':
      default:
        return defaults;
    }
  }, [getDefaultColors]);

  // Load from localStorage first for instant display, then sync with DB
  useEffect(() => {
    if (user?.id) {
      const cached = localStorage.getItem(`color_preferences_${user.id}`);
      if (cached) {
        try {
          setColorPreferences(JSON.parse(cached));
        } catch {
          // Invalid cache, will be overwritten by DB fetch
        }
      }
      fetchColorPreferences();
    } else {
      setLoading(false);
    }
  }, [user?.id, fetchColorPreferences]);

  return {
    colorPreferences,
    loading,
    saving,
    getEffectiveColors,
    saveColorPreferences,
    resetToDefault,
    applyThemePreset,
    getDefaultColors,
  };
};
