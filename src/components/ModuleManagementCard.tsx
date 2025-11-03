import { useState } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  
  if (!details) return null;
  
  const moduleName = `${sport.charAt(0).toUpperCase() + sport.slice(1)} ${module.charAt(0).toUpperCase() + module.slice(1)}`;
  const emoji = sport === 'baseball' ? '⚾' : '🥎';
  
  // Determine status display
  const getStatusInfo = () => {
    if (details.cancel_at_period_end && details.status === 'active') {
      return {
        label: 'Canceling',
        color: 'bg-orange-500',
        icon: <AlertCircle className="w-3 h-3" />,
        message: `Access until ${new Date(details.current_period_end!).toLocaleDateString()}`
      };
    }
    
    if (details.status === 'canceled') {
      return {
        label: 'Canceled',
        color: 'bg-gray-500',
        icon: <XCircle className="w-3 h-3" />,
        message: 'No longer active'
      };
    }
    
    if (details.status === 'active') {
      return {
        label: 'Active',
        color: 'bg-green-500',
        icon: <CheckCircle className="w-3 h-3" />,
        message: `Renews ${new Date(details.current_period_end!).toLocaleDateString()}`
      };
    }
    
    return {
      label: 'Unknown',
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
      
      toast.success(`${moduleName} will be canceled at period end`, {
        description: `You'll keep access until ${new Date(details.current_period_end!).toLocaleDateString()}`
      });
      
      onActionComplete();
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel module');
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
      
      toast.success(`${moduleName} cancellation removed`, {
        description: 'Your subscription will continue as normal'
      });
      
      onActionComplete();
    } catch (error) {
      console.error('Resume error:', error);
      toast.error('Failed to resume module');
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
                Cancel
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
                Keep Subscription
              </Button>
            )}
            
            {/* Fully canceled module - show resubscribe button */}
            {details.status === 'canceled' && (
              <Button
                size="sm"
                onClick={() => window.location.href = '/pricing'}
              >
                Resubscribe
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {moduleName}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Your subscription will be canceled at the end of your billing period.</p>
              <p className="font-semibold">
                You'll keep access until: {new Date(details.current_period_end!).toLocaleDateString()}
              </p>
              <p>After that date, you'll lose access to this module.</p>
              <p className="text-sm text-muted-foreground">
                No refunds will be issued for the current period.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={loading}>
              Yes, Cancel at Period End
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Resume confirmation dialog */}
      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keep {moduleName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the scheduled cancellation. Your subscription will continue normally and you'll be billed on your next billing date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleResume} disabled={loading}>
              Yes, Keep Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
