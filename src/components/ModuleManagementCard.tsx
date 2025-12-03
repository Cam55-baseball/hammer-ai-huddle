import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export interface ModuleDetails {
  subscription_id: string;
  status: 'active' | 'canceled' | 'past_due';
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  price_id: string;
  canceled_at: string | null;
}

interface Props {
  sport: 'baseball' | 'softball';
  module: 'hitting' | 'pitching' | 'throwing';
  details: ModuleDetails | undefined;
  onActionComplete: () => void;
}

export function ModuleManagementCard({ sport, module, details, onActionComplete }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  
  if (!details) return null;
  
  const moduleName = `${sport.charAt(0).toUpperCase() + sport.slice(1)} ${module.charAt(0).toUpperCase() + module.slice(1)}`;
  const emoji = sport === 'baseball' ? '⚾' : '🥎';
  
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  };
  
  // Determine status display
  const getStatusInfo = () => {
    if (details.cancel_at_period_end && details.status === 'active') {
      return {
        label: t('moduleManagement.canceling'),
        color: 'bg-orange-500',
        icon: <AlertCircle className="w-3 h-3" />,
        message: t('moduleManagement.accessUntil', { date: formatDate(details.current_period_end!) })
      };
    }
    
    if (details.status === 'canceled') {
      return {
        label: t('moduleManagement.canceled'),
        color: 'bg-gray-500',
        icon: <XCircle className="w-3 h-3" />,
        message: t('moduleManagement.noLongerActive')
      };
    }
    
    if (details.status === 'active') {
      return {
        label: t('moduleManagement.active'),
        color: 'bg-green-500',
        icon: <CheckCircle className="w-3 h-3" />,
        message: t('moduleManagement.renewsOn', { date: formatDate(details.current_period_end!) })
      };
    }
    
    return {
      label: t('moduleManagement.unknown'),
      color: 'bg-gray-500',
      icon: null,
      message: ''
    };
  };
  
  const statusInfo = getStatusInfo();
  
  const handleCancel = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const { error } = await supabase.functions.invoke('cancel-module-subscription', {
        body: { sport, module },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      if (error) throw error;
      
      toast.success(t('moduleManagement.canceledAtPeriodEnd', { moduleName }), {
        description: t('moduleManagement.accessUntil', { date: formatDate(details.current_period_end!) })
      });
      
      onActionComplete();
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error(t('moduleManagement.failedToCancel'));
    } finally {
      setLoading(false);
      setShowCancelDialog(false);
    }
  };
  
  const handleResume = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const { error } = await supabase.functions.invoke('resume-module-subscription', {
        body: { sport, module },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      
      if (error) throw error;
      
      toast.success(t('moduleManagement.cancellationRemoved', { moduleName }), {
        description: t('moduleManagement.subscriptionContinues')
      });
      
      onActionComplete();
    } catch (error) {
      console.error('Resume error:', error);
      toast.error(t('moduleManagement.failedToResume'));
    } finally {
      setLoading(false);
      setShowResumeDialog(false);
    }
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>{emoji}</span>
              <span>{moduleName}</span>
            </CardTitle>
            <Badge className={statusInfo.color}>
              {statusInfo.icon}
              <span className="ml-1">{statusInfo.label}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{statusInfo.message}</span>
          </div>
          
          <div className="flex gap-2">
            {/* Active module - show cancel button */}
            {details.status === 'active' && !details.cancel_at_period_end && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                disabled={loading}
              >
                {t('moduleManagement.cancel')}
              </Button>
            )}
            
            {/* Canceling module - show resume button */}
            {details.cancel_at_period_end && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResumeDialog(true)}
                disabled={loading}
              >
                {t('moduleManagement.keepSubscription')}
              </Button>
            )}
            
            {/* Fully canceled module - show resubscribe button */}
            {details.status === 'canceled' && (
              <Button
                size="sm"
                onClick={() => window.location.href = '/pricing'}
              >
                {t('moduleManagement.resubscribe')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('moduleManagement.cancelModuleTitle', { moduleName })}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>{t('moduleManagement.cancelModuleDescription')}</p>
              <p className="font-semibold">
                {t('moduleManagement.keepAccessUntil', { date: formatDate(details.current_period_end!) })}
              </p>
              <p>{t('moduleManagement.loseAccessAfter')}</p>
              <p className="text-sm text-muted-foreground">
                {t('moduleManagement.noRefunds')}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('moduleManagement.goBack')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={loading}>
              {t('moduleManagement.yesCancelAtEnd')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Resume confirmation dialog */}
      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('moduleManagement.keepModuleTitle', { moduleName })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('moduleManagement.keepModuleDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('moduleManagement.goBack')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleResume} disabled={loading}>
              {t('moduleManagement.yesKeepSubscription')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}