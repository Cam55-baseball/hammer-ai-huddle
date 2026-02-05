import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Play, Construction, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RealTimePlayback } from "./RealTimePlayback";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";

interface RealTimePlaybackCardProps {
  module: string;
  sport: string;
}

export const RealTimePlaybackCard = ({ module, sport }: RealTimePlaybackCardProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { isOwner, loading: ownerLoading } = useOwnerAccess();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  // Show loading skeleton while checking roles
  if (ownerLoading || adminLoading) {
    return (
      <Card className="p-4 sm:p-6 border-dashed border-2 border-muted">
        <div className="flex flex-col items-center space-y-3">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-10 w-32" />
        </div>
      </Card>
    );
  }

  // Only owners and admins can access the full feature
  const hasAccess = isOwner || isAdmin;

  // Show Under Construction card for regular users
  if (!hasAccess) {
    return (
      <Card className="p-4 sm:p-6 border-2 border-destructive/50 bg-gradient-to-br from-destructive/5 via-background to-destructive/10">
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="relative p-3 sm:p-4 rounded-full bg-destructive/10">
            <Construction className="h-8 w-8 sm:h-10 sm:w-10 text-destructive animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-destructive" />
            <h3 className="text-lg sm:text-xl font-semibold text-destructive">
              {t('realTimePlayback.underConstructionTitle', 'Real-Time Playback Coming Soon!')}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xs leading-relaxed">
            {t('realTimePlayback.underConstructionDescription', "We're polishing this feature for the best training experience. Stay tuned!")}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <div className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
            <span className="text-xs text-destructive font-medium">
              {t('realTimePlayback.activeDevelopment', 'Active Development')}
            </span>
          </div>
        </div>
      </Card>
    );
  }

  // Full feature for owners and admins
  return (
    <>
      <Card className="p-4 sm:p-6 text-center border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5 hover:border-primary/50 transition-all duration-300 group">
        <div className="flex flex-col items-center space-y-3">
          <div className="relative p-3 sm:p-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 group-hover:scale-110 transition-transform duration-300">
            <Video className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full animate-pulse flex items-center justify-center">
              <div className="w-2 h-2 bg-destructive-foreground rounded-full" />
            </div>
          </div>
          <h3 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t('realTimePlayback.title', 'Real-Time Playback')}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xs leading-relaxed">
            {t('realTimePlayback.description', 'Record yourself and get instant feedback with automatic replay and slow-motion analysis')}
          </p>
          <Button 
            onClick={() => setIsOpen(true)}
            className="mt-2 gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-primary/25 transition-all duration-300"
          >
            <Play className="h-4 w-4" />
            {t('realTimePlayback.startRecording', 'Start Recording')}
          </Button>
        </div>
      </Card>

      <RealTimePlayback 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        module={module}
        sport={sport}
      />
    </>
  );
};
