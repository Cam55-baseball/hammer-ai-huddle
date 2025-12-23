import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Play } from "lucide-react";
import { RealTimePlayback } from "./RealTimePlayback";

interface RealTimePlaybackCardProps {
  module: string;
  sport: string;
}

export const RealTimePlaybackCard = ({ module, sport }: RealTimePlaybackCardProps) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

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
