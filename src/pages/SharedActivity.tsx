import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Download, Clock, Zap, Star, RefreshCw, ArrowLeft, Loader2 } from 'lucide-react';
import { getActivityIcon } from '@/components/custom-activities/IconPicker';
import { hexToRgba } from '@/hooks/useUserColors';
import { branding } from '@/branding';

interface SharedTemplate {
  id: string;
  share_code: string;
  view_count: number;
  template: {
    title: string;
    description: string;
    activity_type: string;
    icon: string;
    color: string;
    duration_minutes: number;
    intensity: string;
    exercises: any[];
    recurring_days: number[];
    recurring_active: boolean;
    is_favorited: boolean;
    display_nickname: string | null;
    custom_logo_url: string | null;
  };
}

export default function SharedActivity() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sharedData, setSharedData] = useState<SharedTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedTemplate = async () => {
      if (!shareCode) {
        setError('Invalid share code');
        setLoading(false);
        return;
      }

      try {
        const { data: shareData, error: shareError } = await supabase
          .from('shared_activity_templates')
          .select(`
            id,
            share_code,
            view_count,
            template_id
          `)
          .eq('share_code', shareCode)
          .eq('is_public', true)
          .maybeSingle();

        if (shareError) throw shareError;
        if (!shareData) {
          setError('Template not found or is no longer shared');
          setLoading(false);
          return;
        }

        // Fetch the template
        const { data: templateData, error: templateError } = await supabase
          .from('custom_activity_templates')
          .select('title, description, activity_type, icon, color, duration_minutes, intensity, exercises, recurring_days, recurring_active, is_favorited, display_nickname, custom_logo_url')
          .eq('id', shareData.template_id)
          .single();

        if (templateError) throw templateError;

        setSharedData({
          ...shareData,
          template: {
            ...templateData,
            exercises: (templateData.exercises as any[]) || [],
            recurring_days: (templateData.recurring_days as number[]) || [],
          },
        });

        // Increment view count
        await supabase
          .from('shared_activity_templates')
          .update({ view_count: (shareData.view_count || 0) + 1 })
          .eq('id', shareData.id);

      } catch (err) {
        console.error('Error fetching shared template:', err);
        setError('Failed to load template');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedTemplate();
  }, [shareCode]);

  const handleImport = async () => {
    if (!user) {
      navigate('/auth', { state: { from: `/shared-activity/${shareCode}` } });
      return;
    }

    if (!sharedData) return;
    setImporting(true);

    try {
      const selectedSport = (localStorage.getItem('selectedSport') as 'baseball' | 'softball') || 'baseball';
      
      const { error } = await supabase
        .from('custom_activity_templates')
        .insert({
          user_id: user.id,
          title: sharedData.template.title,
          description: sharedData.template.description,
          activity_type: sharedData.template.activity_type,
          icon: sharedData.template.icon,
          color: sharedData.template.color,
          duration_minutes: sharedData.template.duration_minutes,
          intensity: sharedData.template.intensity,
          exercises: sharedData.template.exercises,
          recurring_days: sharedData.template.recurring_days,
          recurring_active: false, // Don't auto-enable recurring for imported
          is_favorited: false,
          sport: selectedSport,
        });

      if (error) throw error;
      
      toast.success(t('share.imported', 'Template imported successfully!'));
      navigate('/my-custom-activities');
    } catch (err) {
      console.error('Error importing template:', err);
      toast.error(t('share.importError', 'Failed to import template'));
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !sharedData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">{error || 'Template not found'}</p>
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.goHome', 'Go Home')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { template } = sharedData;
  const Icon = getActivityIcon(template.icon);
  const exercises = Array.isArray(template.exercises) ? template.exercises : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <img src={branding.logo} alt={branding.appName} className="h-8 w-8" />
          <span className="font-bold">{branding.appName}</span>
        </div>

        <Card className="overflow-hidden">
          {template.display_nickname && (
            <div 
              className="px-4 py-2 text-sm font-bold text-white"
              style={{ backgroundColor: template.color }}
            >
              {template.display_nickname}
            </div>
          )}
          
          <CardHeader>
            <div className="flex items-start gap-4">
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: hexToRgba(template.color, 0.2) }}
              >
                {template.custom_logo_url ? (
                  <img src={template.custom_logo_url} alt="" className="h-8 w-8 object-contain" />
                ) : (
                  <Icon className="h-8 w-8" style={{ color: template.color }} />
                )}
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl">{template.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">
                    {t(`customActivity.types.${template.activity_type}`)}
                  </Badge>
                  {template.intensity && (
                    <Badge variant="outline" className="gap-1">
                      <Zap className="h-3 w-3" />
                      {t(`customActivity.intensity.${template.intensity}`)}
                    </Badge>
                  )}
                  {template.duration_minutes && (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {template.duration_minutes} min
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {template.description && (
              <CardDescription className="mt-4">{template.description}</CardDescription>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {exercises.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">{t('customActivity.exercises', 'Exercises')}</h3>
                  <div className="space-y-2">
                    {exercises.slice(0, 5).map((exercise: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="font-medium">{exercise.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {exercise.sets && exercise.reps ? `${exercise.sets}×${exercise.reps}` : ''}
                        </span>
                      </div>
                    ))}
                    {exercises.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center">
                        +{exercises.length - 5} more exercises
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {template.recurring_active && template.recurring_days?.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4" />
                  <span>{t('customActivity.recurring.label')}: </span>
                  <span>
                    {template.recurring_days.map((d: number) => 
                      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]
                    ).join(', ')}
                  </span>
                </div>
              </>
            )}

            <Separator />

            <Button 
              onClick={handleImport} 
              disabled={importing}
              className="w-full gap-2"
              size="lg"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {user 
                ? t('share.importToLibrary', 'Import to My Library')
                : t('share.signInToImport', 'Sign in to Import')}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {t('share.viewCount', `${sharedData.view_count} views`)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
