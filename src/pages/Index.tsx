import { BUSINESS_ADDRESS_ONE_LINE } from "@/constants/businessAddress";
import { Shield, Lock, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { LandingDemoVideo } from "@/components/landing/LandingDemoVideo";
import heroImage from "@/assets/hero-baseball.jpg";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOwner } = useOwnerAccess();

  const handleGetStarted = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border pt-safe">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg sm:text-xl">H</span>
            </div>
            <h1 className="truncate text-base sm:text-xl font-bold">Hammers Modality</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <LanguageSelector responsive />
            {user ? (
              <Button variant="outline" size="sm" className="sm:h-10 sm:px-4" onClick={() => navigate("/dashboard")}>
                Dashboard
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="sm:h-10 sm:px-4" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        
        <div className="container relative mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <h2 className="text-5xl md:text-7xl font-extrabold tracking-tight">
              <span className="text-primary block">Elite Training for Champions.</span>
              <span className="text-secondary text-4xl md:text-5xl block mt-2">Hammer Powered Results</span>
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Transform your game with advanced motion capture, real-time analytics, 
              and professional development tools used by elite athletes worldwide.
            </p>
            <LandingDemoVideo />
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button onClick={handleGetStarted} size="lg">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">Powered by Innovation</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Industry-leading technology for baseball and softball athletes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card p-8 rounded-xl shadow-lg border border-border hover:border-primary/50 transition-all duration-300">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📅</span>
              </div>
              <h4 className="text-xl font-bold mb-2">A Plan That Moves With You</h4>
              <p className="text-muted-foreground">Tell Hammers about a game, a trip or a sore arm and the next seven days re-plan around it.</p>
            </div>
            <div className="bg-card p-8 rounded-xl shadow-lg border border-border hover:border-primary/50 transition-all duration-300">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">💪</span>
              </div>
              <h4 className="text-xl font-bold mb-2">Built for Every Arm</h4>
              <p className="text-muted-foreground">Pitchers, catchers, position players and two-way athletes each get a daily and weekly throwing budget.</p>
            </div>
            <div className="bg-card p-8 rounded-xl shadow-lg border border-border hover:border-primary/50 transition-all duration-300">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🧭</span>
              </div>
              <h4 className="text-xl font-bold mb-2">Ramps Back, Never Rushed</h4>
              <p className="text-muted-foreground">After time off, every return builds one step at a time so the body is ready before game speed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mb-8">
            <Badge variant="outline" className="px-4 py-2">
              <Shield className="h-4 w-4 mr-2" />
              256-bit Encryption
            </Badge>
            <Badge variant="outline" className="px-4 py-2">
              <Lock className="h-4 w-4 mr-2" />
              Data Privacy
            </Badge>
            <Badge variant="outline" className="px-4 py-2">
              <CheckCircle className="h-4 w-4 mr-2" />
              Secure Storage
            </Badge>
          </div>
          <div className="text-center text-muted-foreground space-y-4">
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Link to="/privacy" className="hover:text-foreground underline underline-offset-4">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-foreground underline underline-offset-4">Terms of Service</Link>
              <Link to="/support" className="hover:text-foreground underline underline-offset-4">Support</Link>
            </div>
            <p className="text-sm">
              © 2025 Hammers Modality. Training content only — consult professionals for medical issues.
            </p>
            <p className="text-xs">{BUSINESS_ADDRESS_ONE_LINE}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
