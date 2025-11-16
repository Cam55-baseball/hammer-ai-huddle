import { useState, useEffect } from "react";
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
  title: string;
  description: string;
  icon: React.ElementType;
}

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

const playerTutorialSlides: TutorialSlide[] = [
  { id: 1, title: "Welcome to Hammers Modality", description: "Your complete baseball training and scouting platform. Analyze your performance with AI-powered feedback, connect with scouts, and track your progress to the next level.", icon: Sparkles },
  { id: 2, title: "Meet the Creator", description: "Learn about the developer and owner of Hammers Modality. Visit the Owner Bio section in the sidebar to view their background, credentials, and contact information.", icon: UserCircle },
  { id: 3, title: "Your Training Modules", description: "Access your Hitting, Pitching, and Throwing analysis tools. Each module is designed with cutting-edge AI to help you improve specific aspects of your game.", icon: Target },
  { id: 4, title: "Upload & Analyze Videos", description: "Use the module cards to upload videos of your workouts or games. Our AI analyzes your mechanics in real-time, providing instant feedback on your technique.", icon: Upload },
  { id: 5, title: "Get Personalized Coaching", description: "Receive detailed efficiency scores, customized drills, and technique feedback tailored to your performance. Improve specific areas with data-driven recommendations.", icon: Award },
  { id: 6, title: "Your Video Library", description: "All your videos are saved in the Players Club. Review past analyses, mark videos as private or public, and share them with scouts and coaches following you.", icon: Library },
  { id: 7, title: "Build Your Following", description: "View scouts and coaches following you in My Followers. Accept or decline follow requests, and control who can see your public training videos.", icon: Users },
  { id: 8, title: "Track Your Ranking", description: "Your ranking updates automatically based on scout and coach engagement. The more visibility you gain through quality content, the higher you climb!", icon: TrendingUp },
  { id: 9, title: "Complete Your Profile", description: "Visit Settings to add your bio, upload photos, list teams and schools, and connect social media. This information is visible to scouts—make it count!", icon: Settings },
];

const scoutTutorialSlides: TutorialSlide[] = [
  { id: 1, title: "Welcome Scouts & Coaches", description: "Your comprehensive scouting platform to discover, evaluate, and follow talented players. Access detailed profiles, training videos, and performance analytics.", icon: Sparkles },
  { id: 2, title: "Meet the Creator", description: "Learn about the developer and owner of Hammers Modality. Visit the Owner Bio section in the sidebar to view their background and credentials.", icon: UserCircle },
  { id: 3, title: "Discover Talent", description: "Use the Scout Dashboard to search for players based on name, position, location, and more. Find hidden gems and track rising stars in baseball and softball.", icon: Search },
  { id: 4, title: "Advanced Player Search", description: "Apply filters to narrow your search by position, throwing hand, batting side, height, weight, graduation year, state, and commitment status for precise talent scouting.", icon: Filter },
  { id: 5, title: "Follow Players", description: "Send follow requests to players you're interested in. When they accept, you gain access to all their public training videos and performance data.", icon: UserCheck },
  { id: 6, title: "View Player Videos", description: "Once you're following a player, access their entire video library in the Players Club. Watch their training sessions, game footage, and AI analysis breakdowns.", icon: Video },
  { id: 7, title: "Rankings System", description: "Players are automatically ranked based on their engagement and visibility with scouts. The more scouts following and interacting with a player, the higher they rank.", icon: TrendingUp },
  { id: 8, title: "Analyze Performance", description: "Review AI-generated reports for each player, including efficiency scores, mechanics analysis, and detailed feedback to help you make informed recruiting decisions.", icon: Play },
];

export const TutorialModal = ({ open, onClose, userId }: TutorialModalProps) => {
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

      toast.success("Tutorial completed! Welcome to Hammers Modality.");
      onClose();
    } catch (error) {
      console.error("Error completing tutorial:", error);
      toast.error("Failed to mark tutorial as complete");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CurrentIcon className="h-6 w-6 text-primary" />
              <span>{slide.title}</span>
            </div>
            <Badge variant="secondary">
              Step {currentSlide + 1} of {totalSlides}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center text-center space-y-4">
            <CurrentIcon className="h-16 w-16 text-primary" />
            <p className="text-muted-foreground text-lg leading-relaxed">
              {slide.description}
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
            Previous
          </Button>

          <Button
            onClick={handleNext}
            className="gap-2"
          >
            {currentSlide === totalSlides - 1 ? (
              "Start Competing!"
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
