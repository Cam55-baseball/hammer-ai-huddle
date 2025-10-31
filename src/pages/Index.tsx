import { useEffect } from "react";
import { User, Users, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RoleButton } from "@/components/RoleButton";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAuth } from "@/hooks/useAuth";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import heroImage from "@/assets/hero-baseball.jpg";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isOwner } = useOwnerAccess();

  useEffect(() => {
    // Always redirect to auth page - let Auth component handle routing logic
    navigate("/auth");
  }, [navigate]);

  const handleGetStarted = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">H</span>
            </div>
            <h1 className="text-xl font-bold">Hammers Modality</h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />
            {user ? (
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Dashboard
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate("/auth")}>
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
              <span className="text-secondary text-4xl md:text-5xl block mt-2">Hammer AI-Powered Results</span>
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Transform your game with advanced motion capture, real-time analytics, 
              and professional development tools used by elite athletes worldwide.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button onClick={handleGetStarted} size="lg">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Role Selection */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-4">
            <h3 className="text-3xl md:text-4xl font-bold">Choose Your Path</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select your role to access tailored tools, analytics, and training programs 
              designed for your specific needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <RoleButton
              icon={User}
              title="Player"
              description="Get In The Game!"
              onClick={handleGetStarted}
            />
            <RoleButton
              icon={Users}
              title="Coach"
              description="Get In The Game!"
              onClick={handleGetStarted}
            />
            <RoleButton
              icon={Target}
              title="Recruiter/Scout"
              description="Get In The Game!"
              onClick={handleGetStarted}
            />
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
                <span className="text-2xl">🎯</span>
              </div>
              <h4 className="text-xl font-bold mb-2">AI Motion Capture</h4>
              <p className="text-muted-foreground">
                Advanced computer vision analyzes every throw, pitch, and swing with professional-grade accuracy
              </p>
            </div>

            <div className="bg-card p-8 rounded-xl shadow-lg border border-border hover:border-primary/50 transition-all duration-300">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h4 className="text-xl font-bold mb-2">Real-Time Analytics</h4>
              {isOwner ? (
                <p className="text-muted-foreground">
                  Instant feedback on velocity, spin rate, release point, and 20+ biomechanical metrics
                </p>
              ) : (
                <p className="text-muted-foreground">
                  <span className="inline-block px-3 py-1 bg-muted rounded-full text-sm font-medium mb-2">
                    Under Construction
                  </span>
                  <br />
                  Advanced analytics coming soon for all users
                </p>
              )}
            </div>

            <div className="bg-card p-8 rounded-xl shadow-lg border border-border hover:border-primary/50 transition-all duration-300">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🏆</span>
              </div>
              <h4 className="text-xl font-bold mb-2">Performance Rankings</h4>
              <p className="text-muted-foreground">
                <span className="inline-block px-3 py-1 bg-muted rounded-full text-sm font-medium mb-2">
                  Coming Soon
                </span>
                <br />
                Compare your stats against players worldwide and track your progress over time
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="text-sm">
            © 2025 Hammers Modality. Training content only — consult professionals for medical issues.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
