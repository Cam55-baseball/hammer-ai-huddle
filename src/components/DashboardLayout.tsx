import { ReactNode, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SidebarProvider, SidebarTrigger, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { FloatingChatButton } from "./FloatingChatButton";
import { TutorialButton } from "./TutorialButton";
import { TutorialModal } from "./TutorialModal";
import { OfflineIndicator } from "./OfflineIndicator";
import { Button } from "@/components/ui/button";
import { Menu, ShoppingBag, RefreshCw } from "lucide-react";
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
        
      </div>
      <div className="ml-auto flex items-center gap-2">
        {/* Refresh Button - Always visible for troubleshooting */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.location.reload()}
          className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
          title={t('dashboard.header.refresh')}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        
        {/* Small but mighty Merch button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => window.open('https://hammers-modality-shop.fourthwall.com', '_blank')}
          className="h-8 w-8 bg-gradient-to-r from-amber-500/10 to-orange-500/10 
                     hover:from-amber-500/20 hover:to-orange-500/20
                     border-amber-500/40 hover:border-amber-500/60
                     text-amber-700 dark:text-amber-400
                     shadow-sm hover:shadow-md transition-all
                     group relative overflow-hidden"
          title={t('dashboard.header.merch')}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                          translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <ShoppingBag className="h-4 w-4 relative z-10" />
        </Button>
        
        {user && (
          <TutorialButton onClick={onTutorialOpen} />
        )}
      </div>
    </header>
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
