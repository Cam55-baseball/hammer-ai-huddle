import { ReactNode, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SidebarProvider, SidebarTrigger, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { FloatingChatButton } from "./FloatingChatButton";
import { TutorialButton } from "./TutorialButton";
import { TutorialModal } from "./TutorialModal";
import { OfflineIndicator } from "./OfflineIndicator";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHydrationReminders } from "@/hooks/useHydrationReminders";

interface DashboardLayoutProps {
  children: ReactNode;
}

function DashboardHeader({ tutorialCompleted, user, onTutorialOpen }: { 
  tutorialCompleted: boolean; 
  user: any; 
  onTutorialOpen: () => void;
}) {
  const { t } = useTranslation();
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4">
      <div className="relative flex items-center gap-2">
        {/* Enhanced Menu Button */}
        <Button
          onClick={toggleSidebar}
          variant="outline"
          size="lg"
          className="h-11 px-4 gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 shadow-md transition-all hover:shadow-lg animate-pulse-gentle"
        >
          <Menu className="h-5 w-5" />
          <span className="font-semibold hidden sm:inline">{t('navigation.menu')}</span>
        </Button>
        
        {/* First-time user tooltip */}
        {!tutorialCompleted && (
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-2 rounded-lg shadow-lg animate-fade-in whitespace-nowrap z-50 hidden md:flex items-center gap-2">
            <span className="animate-bounce">←</span>
            <span className="text-sm font-medium">{t('sidebar.tapToOpenMenu')}</span>
            <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-primary" />
          </div>
        )}
      </div>
      <div className="ml-auto">
        {user && (
          <TutorialButton onClick={onTutorialOpen} />
        )}
      </div>
    </header>
  );
}

function MobileFloatingMenuButton() {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      onClick={toggleSidebar}
      className="fixed bottom-20 left-4 z-50 md:hidden h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl hover:bg-primary/90 animate-bounce-subtle border-2 border-primary-foreground/20"
    >
      <Menu className="h-7 w-7" />
    </Button>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Initialize hydration reminders globally so they work across all pages
  useHydrationReminders();

  useEffect(() => {
    const fetchTutorialStatus = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("tutorial_completed")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && data) {
          setTutorialCompleted(data.tutorial_completed || false);
        }
      } catch (error) {
        console.error("Error fetching tutorial status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTutorialStatus();
  }, [user?.id]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden max-w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-x-hidden max-w-full">
          <DashboardHeader 
            tutorialCompleted={tutorialCompleted || loading}
            user={user}
            onTutorialOpen={() => setTutorialOpen(true)}
          />
          <main className="flex-1 p-3 sm:p-6 overflow-x-hidden max-w-full box-border">
            <OfflineIndicator />
            {children}
          </main>
        </SidebarInset>
      </div>
      {/* Mobile Floating Menu Button - Impossible to miss */}
      <MobileFloatingMenuButton />
      <FloatingChatButton />
      {user && (
        <TutorialModal
          open={tutorialOpen}
          onClose={() => setTutorialOpen(false)}
          userId={user.id}
        />
      )}
    </SidebarProvider>
  );
}
