import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, UserCircle, Upload, Target, Library, Users, TrendingUp, Settings, Search, Filter, UserCheck, Video, Award, Sparkles, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useScoutAccess } from "@/hooks/useScoutAccess";

interface TutorialSlide {
  id: number;
  titleKey: string;
  descriptionKey: string;
  icon: React.ElementType;
}

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

const playerTutorialSlides: TutorialSlide[] = [
  { id: 1, titleKey: "tutorial.player.welcome.title", descriptionKey: "tutorial.player.welcome.description", icon: Sparkles },
  { id: 2, titleKey: "tutorial.player.creator.title", descriptionKey: "tutorial.player.creator.description", icon: UserCircle },
  { id: 3, titleKey: "tutorial.player.modules.title", descriptionKey: "tutorial.player.modules.description", icon: Target },
  { id: 4, titleKey: "tutorial.player.upload.title", descriptionKey: "tutorial.player.upload.description", icon: Upload },
  { id: 5, titleKey: "tutorial.player.coaching.title", descriptionKey: "tutorial.player.coaching.description", icon: Award },
  { id: 6, titleKey: "tutorial.player.library.title", descriptionKey: "tutorial.player.library.description", icon: Library },
  { id: 7, titleKey: "tutorial.player.following.title", descriptionKey: "tutorial.player.following.description", icon: Users },
  { id: 8, titleKey: "tutorial.player.ranking.title", descriptionKey: "tutorial.player.ranking.description", icon: TrendingUp },
  { id: 9, titleKey: "tutorial.player.profile.title", descriptionKey: "tutorial.player.profile.description", icon: Settings },
];

const scoutTutorialSlides: TutorialSlide[] = [
  { id: 1, titleKey: "tutorial.scout.welcome.title", descriptionKey: "tutorial.scout.welcome.description", icon: Sparkles },
  { id: 2, titleKey: "tutorial.scout.creator.title", descriptionKey: "tutorial.scout.creator.description", icon: UserCircle },
  { id: 3, titleKey: "tutorial.scout.discover.title", descriptionKey: "tutorial.scout.discover.description", icon: Search },
  { id: 4, titleKey: "tutorial.scout.search.title", descriptionKey: "tutorial.scout.search.description", icon: Filter },
  { id: 5, titleKey: "tutorial.scout.follow.title", descriptionKey: "tutorial.scout.follow.description", icon: UserCheck },
  { id: 6, titleKey: "tutorial.scout.videos.title", descriptionKey: "tutorial.scout.videos.description", icon: Video },
  { id: 7, titleKey: "tutorial.scout.rankings.title", descriptionKey: "tutorial.scout.rankings.description", icon: TrendingUp },
  { id: 8, titleKey: "tutorial.scout.analyze.title", descriptionKey: "tutorial.scout.analyze.description", icon: Play },
];

export const TutorialModal = ({ open, onClose, userId }: TutorialModalProps) => {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const { isScout } = useScoutAccess();

  const slides = isScout ? scoutTutorialSlides : playerTutorialSlides;
  const totalSlides = slides.length;
  const progress = ((currentSlide + 1) / totalSlides) * 100;
  const slide = slides[currentSlide];
  const CurrentIcon = slide.icon;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrevious();
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [open, currentSlide]);

  const handleNext = () => {
    if (currentSlide === totalSlides - 1) {
      handleComplete();
    } else {
      setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  };

  const handleComplete = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ tutorial_completed: true })
        .eq("id", userId);

      if (error) throw error;

      toast.success(t('tutorial.completed'));
      onClose();
    } catch (error) {
      console.error("Error completing tutorial:", error);
      toast.error(t('tutorial.failedToComplete'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CurrentIcon className="h-6 w-6 text-primary" />
              <span>{t(slide.titleKey)}</span>
            </div>
            <Badge variant="secondary">
              {t('tutorial.step', { current: currentSlide + 1, total: totalSlides })}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center text-center space-y-4">
            <CurrentIcon className="h-16 w-16 text-primary" />
            <p className="text-muted-foreground text-lg leading-relaxed">
              {t(slide.descriptionKey)}
            </p>
          </div>

          <Progress value={progress} className="w-full" />
        </div>

        <div className="flex justify-between gap-4 pt-4">
          <Button
            onClick={handlePrevious}
            disabled={currentSlide === 0}
            variant="outline"
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('tutorial.previous')}
          </Button>

          <Button
            onClick={handleNext}
            className="gap-2"
          >
            {currentSlide === totalSlides - 1 ? (
              t('tutorial.startCompeting')
            ) : (
              <>
                {t('tutorial.next')}
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
