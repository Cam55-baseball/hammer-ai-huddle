import { ReactNode, useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { FloatingChatButton } from "./FloatingChatButton";
import { TutorialButton } from "./TutorialButton";
import { TutorialModal } from "./TutorialModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

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
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4">
            <SidebarTrigger />
            <div className="ml-auto">
              {!loading && user && (
                <TutorialButton onClick={() => setTutorialOpen(true)} />
              )}
            </div>
          </header>
          <main className="flex-1 p-6">{children}</main>
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
