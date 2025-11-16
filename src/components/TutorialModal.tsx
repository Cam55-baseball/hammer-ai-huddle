import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, UserCircle, Upload, Target, Library, Users, TrendingUp, Settings, Search, Filter, UserCheck, Video, Award, Sparkles, Play } from "lucide-react";
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
  highlightTarget?: string;
}

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

const playerTutorialSlides: TutorialSlide[] = [
  {
    id: 1,
    title: "Welcome to Hammers Modality",
    description: "Your complete baseball training and scouting platform. Analyze your performance with AI-powered feedback, connect with scouts, and track your progress to the next level.",
    icon: Sparkles,
  },
  {
    id: 2,
    title: "Meet the Creator",
    description: "Learn about the developer and owner of Hammers Modality. Click the Owner Bio section in the sidebar to view their background, credentials, and contact information.",
    icon: UserCircle,
    highlightTarget: ".owner-bio-section",
  },
  {
    id: 3,
    title: "Your Training Modules",
    description: "Access your Hitting, Pitching, and Throwing analysis tools. Each module is designed with cutting-edge AI to help you improve specific aspects of your game.",
    icon: Target,
    highlightTarget: ".module-cards",
  },
  {
    id: 4,
    title: "Upload & Analyze Videos",
    description: "Click any module to upload videos of your workouts or games. Our AI analyzes your mechanics in real-time, providing instant feedback on your technique.",
    icon: Upload,
    highlightTarget: ".module-upload",
  },
  {
    id: 5,
    title: "Get Personalized Coaching",
    description: "Receive detailed efficiency scores, customized drills, and technique feedback tailored to your performance. Improve specific areas with data-driven recommendations.",
    icon: Award,
    highlightTarget: ".analysis-results",
  },
  {
    id: 6,
    title: "Your Video Library",
    description: "All your videos are saved in the Players Club. Review past analyses, mark videos as private or public, and share them with scouts and coaches following you.",
    icon: Library,
    highlightTarget: ".players-club",
  },
  {
    id: 7,
    title: "Build Your Following",
    description: "View scouts and coaches following you in My Followers. Accept or decline follow requests, and control who can see your public training videos.",
    icon: Users,
  },
  {
    id: 8,
    title: "Track Your Ranking",
    description: "Your ranking updates automatically based on scout and coach engagement. The more visibility you gain through quality content, the higher you climb!",
    icon: TrendingUp,
    highlightTarget: ".rankings-module",
  },
  {
    id: 9,
    title: "Complete Your Profile",
    description: "Go to Settings to add your bio, upload photos, list teams and schools, and connect social media. This information is visible to scouts—make it count!",
    icon: Settings,
    highlightTarget: ".settings-profile",
  },
];

const scoutTutorialSlides: TutorialSlide[] = [
  {
    id: 1,
    title: "Welcome Scouts & Coaches",
    description: "Your comprehensive scouting platform to discover, evaluate, and follow talented players. Access detailed profiles, training videos, and performance analytics.",
    icon: Sparkles,
  },
  {
    id: 2,
    title: "Meet the Creator",
    description: "Learn about the developer and owner of Hammers Modality. Click the Owner Bio section in the sidebar to view their background and credentials.",
    icon: UserCircle,
    highlightTarget: ".owner-bio-section",
  },
  {
    id: 3,
    title: "Discover Talent",
    description: "Use the Scout Dashboard to search through our database of players. Find prospects based on performance, location, and availability.",
    icon: Search,
  },
  {
    id: 4,
    title: "Advanced Player Search",
    description: "Filter players by position, height, weight, graduation year, state, commitment status, and more. Find exactly the talent you're looking for.",
    icon: Filter,
  },
  {
    id: 5,
    title: "Follow Players",
    description: "Send follow requests to players you're interested in. Once accepted, you'll have access to their public training videos and performance updates.",
    icon: UserCheck,
  },
  {
    id: 6,
    title: "View Player Profiles",
    description: "Access comprehensive player profiles including bio, statistics, team affiliations, contact information, and social media links.",
    icon: UserCircle,
  },
  {
    id: 7,
    title: "Watch Training Videos",
    description: "Review public training videos with AI analysis. See efficiency scores, technique breakdowns, and player progress over time.",
    icon: Video,
  },
  {
    id: 8,
    title: "Track Rankings",
    description: "Monitor player rankings based on engagement and performance. Discover rising talent and track prospects you're following.",
    icon: TrendingUp,
    highlightTarget: ".rankings-module",
  },
];

export function TutorialModal({ open, onClose, userId }: TutorialModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const { isScout, loading: roleLoading } = useScoutAccess();

  // Select slides based on role
  const tutorialSlides = isScout ? scoutTutorialSlides : playerTutorialSlides;
  const roleName = isScout ? "Scout/Coach" : "Player";

  const slide = tutorialSlides[currentSlide];
  const progress = ((currentSlide + 1) / tutorialSlides.length) * 100;
  const isLastSlide = currentSlide === tutorialSlides.length - 1;
  const SlideIcon = slide?.icon;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentSlide > 0) {
        setCurrentSlide(currentSlide - 1);
      } else if (e.key === "ArrowRight" && currentSlide < tutorialSlides.length - 1) {
        setCurrentSlide(currentSlide + 1);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentSlide, onClose]);

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleNext = () => {
    if (currentSlide < tutorialSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ tutorial_completed: true })
        .eq("id", userId);

      if (error) throw error;

      const successMessage = isScout 
        ? "Tutorial completed! Start discovering talent!" 
        : "Tutorial completed! Time to start competing!";
      toast.success(successMessage);
      onClose();
      setCurrentSlide(0);
    } catch (error) {
      console.error("Error marking tutorial complete:", error);
      toast.error("Failed to mark tutorial as completed");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleClose = () => {
    setCurrentSlide(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-50"
          aria-label="Close tutorial"
        >
          <X className="h-4 w-4" />
        </button>

        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">{slide?.title}</DialogTitle>
            <Badge variant="secondary" className="ml-4">
              {roleName} Tutorial
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Step {currentSlide + 1} of {tutorialSlides.length}
            </span>
          </div>
        </DialogHeader>

        <Progress value={progress} className="w-full" />

        <div className="py-8 animate-fade-in space-y-6">
          {SlideIcon && (
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-4">
                <SlideIcon className="h-12 w-12 text-primary" />
              </div>
            </div>
          )}
          <p className="text-base leading-relaxed text-center px-4">
            {slide?.description}
          </p>
        </div>

        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentSlide === 0}
            aria-label="Previous slide"
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          {isLastSlide ? (
            <Button
              variant="hero"
              onClick={handleComplete}
              disabled={isCompleting}
              className="gap-2"
            >
              {isCompleting ? "Completing..." : "Start Competing"}
              <Play className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="outline" onClick={handleNext} aria-label="Next slide" className="gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
