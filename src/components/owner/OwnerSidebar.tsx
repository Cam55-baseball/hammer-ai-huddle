import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  UserPlus, 
  Video, 
  CreditCard, 
  Settings, 
  Search,
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

export type OwnerSection = 
  | 'overview' 
  | 'users' 
  | 'admin-requests' 
  | 'scout-applications' 
  | 'videos' 
  | 'subscriptions' 
  | 'settings' 
  | 'player-search';

interface SidebarItem {
  id: OwnerSection;
  label: string;
  icon: React.ElementType;
  badgeCount?: number;
}

interface OwnerSidebarProps {
  activeSection: OwnerSection;
  onSectionChange: (section: OwnerSection) => void;
  pendingAdminRequests?: number;
  pendingScoutApplications?: number;
}

export const OwnerSidebar = ({
  activeSection,
  onSectionChange,
  pendingAdminRequests = 0,
  pendingScoutApplications = 0,
}: OwnerSidebarProps) => {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarItems: SidebarItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'admin-requests', label: 'Admin Requests', icon: UserCog, badgeCount: pendingAdminRequests },
    { id: 'scout-applications', label: 'Scout Applications', icon: UserPlus, badgeCount: pendingScoutApplications },
    { id: 'videos', label: 'Recent Videos', icon: Video },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'player-search', label: 'Player Search', icon: Search },
  ];

  const handleSectionClick = (section: OwnerSection) => {
    onSectionChange(section);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const SidebarContent = () => (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleSectionClick(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badgeCount && item.badgeCount > 0 && (
                <Badge 
                  variant={isActive ? "secondary" : "default"}
                  className={cn(
                    "h-5 min-w-[20px] px-1.5 text-xs",
                    isActive && "bg-primary-foreground/20 text-primary-foreground"
                  )}
                >
                  {item.badgeCount}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );

  // Mobile: Sheet drawer
  if (isMobile) {
    return (
      <>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="flex flex-col h-full">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-lg">Owner Dashboard</h2>
              </div>
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <aside className="w-64 border-r bg-card shrink-0 hidden md:block">
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Navigation</h2>
        </div>
        <SidebarContent />
      </div>
    </aside>
  );
};
