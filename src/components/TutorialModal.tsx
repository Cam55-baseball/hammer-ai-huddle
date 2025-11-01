import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TutorialSlide {
  id: number;
  title: string;
  description: string;
  highlightTarget?: string;
}

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

const tutorialSlides: TutorialSlide[] = [
  {
    id: 1,
    title: "Meet the Creator",
    description: "This is where you can learn more about the developer and owner of Hammers Modality. Click the Owner Bio section in the sidebar to view their background, credentials, and contact information.",
    highlightTarget: ".owner-bio-section",
  },
  {
    id: 2,
    title: "Your Training Modules",
    description: "Here's where all your training modules are located. You have access to Hitting, Pitching, and Throwing analysis tools designed to help you improve your performance.",
    highlightTarget: ".module-cards",
  },
  {
    id: 3,
    title: "Upload Your Videos",
    description: "Each module lets you upload videos of your workouts or games. Simply click on a module, then upload a video from your device or cloud storage for analysis.",
    highlightTarget: ".module-upload",
  },
  {
    id: 4,
    title: "Get Personalized Drills",
    description: "Uploaded videos are analyzed automatically using AI. You'll receive personalized drills, technique feedback, and efficiency scores to help you improve specific areas of your game.",
    highlightTarget: ".analysis-results",
  },
  {
    id: 5,
    title: "Manage Your Videos",
    description: "All your uploaded videos are saved in the Players Club. You can review past analyses, mark videos as private or public, and share them with scouts and coaches who follow you.",
    highlightTarget: ".players-club",
  },
  {
    id: 6,
    title: "Check the Conditions",
    description: "The Weather module gives you real-time playing conditions so you're always prepared. Check temperature, humidity, wind speed, and more before heading to the field.",
    highlightTarget: ".weather-module",
  },
  {
    id: 7,
    title: "Track Your Progress",
    description: "Your ranking updates automatically based on how many scouts and coaches follow you. The more visibility you gain, the higher your ranking!",
    highlightTarget: ".rankings-module",
  },
  {
    id: 8,
    title: "Build Your Profile",
    description: "In Settings, you can add your bio, upload photos, list your teams and schools, and connect social media links. This information is visible to scouts and coaches, so make it count!",
    highlightTarget: ".settings-profile",
  },
  {
    id: 9,
    title: "You're All Set!",
    description: "You now know how to use Hammers Modality to analyze your performance, connect with scouts, and track your progress. Click below to start your journey!",
  },
];

export function TutorialModal({ open, onClose, userId }: TutorialModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  const slide = tutorialSlides[currentSlide];
  const progress = ((currentSlide + 1) / tutorialSlides.length) * 100;
  const isLastSlide = currentSlide === tutorialSlides.length - 1;

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

      toast.success("Tutorial completed! Time to start competing!");
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          aria-label="Close tutorial"
        >
          <X className="h-4 w-4" />
        </button>

        <DialogHeader>
          <DialogTitle className="text-2xl">{slide.title}</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Step {currentSlide + 1} of {tutorialSlides.length}
            </span>
          </div>
        </DialogHeader>

        <Progress value={progress} className="w-full" />

        <div className="py-6 animate-fade-in">
          <p className="text-base leading-relaxed">{slide.description}</p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentSlide === 0}
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {isLastSlide ? (
            <Button
              variant="hero"
              onClick={handleComplete}
              disabled={isCompleting}
              className="gap-2"
            >
              {isCompleting ? "Completing..." : "Begin Competing"}
            </Button>
          ) : (
            <Button variant="outline" onClick={handleNext} aria-label="Next slide">
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
