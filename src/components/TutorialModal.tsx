import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, UserCircle, Upload, Target, Library, Users, TrendingUp, Settings, Search, Filter, UserCheck, Video, Award, Sparkles, Play } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useScoutAccess } from "@/hooks/useScoutAccess";
import { TutorialSpotlight } from "@/components/TutorialSpotlight";

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
  { id: 1, title: "Welcome to Hammers Modality", description: "Your complete baseball training and scouting platform. Analyze your performance with AI-powered feedback, connect with scouts, and track your progress to the next level.", icon: Sparkles },
  { id: 2, title: "Meet the Creator", description: "Learn about the developer and owner of Hammers Modality. Click the Owner Bio section in the sidebar to view their background, credentials, and contact information.", icon: UserCircle, highlightTarget: ".owner-bio-section" },
  { id: 3, title: "Your Training Modules", description: "Access your Hitting, Pitching, and Throwing analysis tools. Each module is designed with cutting-edge AI to help you improve specific aspects of your game.", icon: Target, highlightTarget: ".module-cards" },
  { id: 4, title: "Upload & Analyze Videos", description: "Click any module to upload videos of your workouts or games. Our AI analyzes your mechanics in real-time, providing instant feedback on your technique.", icon: Upload, highlightTarget: ".module-upload" },
  { id: 5, title: "Get Personalized Coaching", description: "Receive detailed efficiency scores, customized drills, and technique feedback tailored to your performance. Improve specific areas with data-driven recommendations.", icon: Award },
  { id: 6, title: "Your Video Library", description: "All your videos are saved in the Players Club. Review past analyses, mark videos as private or public, and share them with scouts and coaches following you.", icon: Library, highlightTarget: ".players-club" },
  { id: 7, title: "Build Your Following", description: "View scouts and coaches following you in My Followers. Accept or decline follow requests, and control who can see your public training videos.", icon: Users },
  { id: 8, title: "Track Your Ranking", description: "Your ranking updates automatically based on scout and coach engagement. The more visibility you gain through quality content, the higher you climb!", icon: TrendingUp },
  { id: 9, title: "Complete Your Profile", description: "Go to Settings to add your bio, upload photos, list teams and schools, and connect social media. This information is visible to scouts—make it count!", icon: Settings, highlightTarget: ".settings-profile" },
];

const scoutTutorialSlides: TutorialSlide[] = [
  { id: 1, title: "Welcome Scouts & Coaches", description: "Your comprehensive scouting platform to discover, evaluate, and follow talented players. Access detailed profiles, training videos, and performance analytics.", icon: Sparkles },
  { id: 2, title: "Meet the Creator", description: "Learn about the developer and owner of Hammers Modality. Click the Owner Bio section in the sidebar to view their background and credentials.", icon: UserCircle, highlightTarget: ".owner-bio-section" },
  { id: 3, title: "Discover Talent", description: "Use the Scout Dashboard to search for players based on name, position, location, and more. Find hidden gems and track rising stars in baseball and softball.", icon: Search, highlightTarget: ".player-search" },
  { id: 4, title: "Advanced Player Search", description: "Apply filters to narrow your search by position, throwing hand, batting side, height, weight, graduation year, state, and commitment status for precise talent scouting.", icon: Filter, highlightTarget: ".search-filters" },
  { id: 5, title: "Follow Players", description: "Send follow requests to players you're interested in. Once accepted, you'll gain access to their training videos, stats, and progress updates.", icon: UserCheck, highlightTarget: ".follow-button" },
  { id: 6, title: "View Player Profiles", description: "Click any player to view their complete profile including bio, physical stats, team affiliations, social media, and contact information for recruiting.", icon: UserCircle, highlightTarget: ".player-profiles" },
  { id: 7, title: "Watch Player Videos", description: "Review public training videos from players you follow. See their hitting, pitching, and throwing mechanics along with AI-generated analysis and efficiency scores.", icon: Video },
  { id: 8, title: "Track Rankings", description: "View player rankings based on engagement and follower counts. Identify trending players and discover who's gaining attention from other scouts.", icon: Award },
];

export function TutorialModal({ open, onClose, userId }: TutorialModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { isScout } = useScoutAccess();
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const slides = isScout ? scoutTutorialSlides : playerTutorialSlides;
  const slide = slides[currentSlide];

  useEffect(() => {
    if (open && slide?.highlightTarget) {
      const timer = setTimeout(() => setActiveHighlight(slide.highlightTarget || null), 300);
      return () => clearTimeout(timer);
    } else {
      setActiveHighlight(null);
    }
  }, [currentSlide, slide, open]);

  const handleNext = () => currentSlide < slides.length - 1 && setCurrentSlide(currentSlide + 1);
  const handlePrevious = () => currentSlide > 0 && setCurrentSlide(currentSlide - 1);

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await supabase.from('profiles').update({ tutorial_completed: true }).eq('id', userId);
      toast.success(isScout ? "Tutorial completed! Start scouting talent now." : "Tutorial completed! Start analyzing your performance now.");
      setTimeout(onClose, 1000);
    } catch (error) {
      toast.error("Failed to save tutorial completion");
    }
    setIsCompleting(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrevious();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentSlide]);

  const progress = ((currentSlide + 1) / slides.length) * 100;
  const SlideIcon = slide?.icon;

  if (!open) return null;

  return (
    <>
      {activeHighlight && <TutorialSpotlight target={activeHighlight} onDismiss={() => setActiveHighlight(null)} />}
      
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-30 w-[90vw] sm:w-[420px] animate-in slide-in-from-bottom-8 fade-in duration-500">
        <Card className="max-h-[70vh] md:max-h-[80vh] shadow-2xl border-2 border-primary/20 overflow-hidden">
          <CardHeader className="relative space-y-3 pb-4">
            <button 
              onClick={onClose} 
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity" 
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="flex items-center justify-between pr-8">
              <CardTitle className="text-xl font-bold">{slide?.title}</CardTitle>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Step {currentSlide + 1} of {slides.length}</span>
              <Badge variant="secondary" className="text-xs">{isScout ? "Scout/Coach" : "Player"}</Badge>
            </div>
            
            <Progress value={progress} className="w-full" />
          </CardHeader>
          
          <CardContent className="space-y-4 pb-4 overflow-y-auto max-h-[40vh]">
            {SlideIcon && (
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <SlideIcon className="h-10 w-10 text-primary" />
                </div>
              </div>
            )}
            <p className="text-sm md:text-base leading-relaxed text-center">{slide?.description}</p>
          </CardContent>
          
          <CardFooter className="flex justify-between pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handlePrevious} 
              disabled={currentSlide === 0} 
              className="gap-2"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            {currentSlide === slides.length - 1 ? (
              <Button 
                variant="hero" 
                onClick={handleComplete} 
                disabled={isCompleting} 
                className="gap-2"
                size="sm"
              >
                {isCompleting ? "Completing..." : "Start Competing"}
                <Play className="h-4 w-4" />
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={handleNext} 
                className="gap-2"
                size="sm"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
