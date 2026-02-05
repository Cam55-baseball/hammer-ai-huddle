import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  UserPlus, 
  Video, 
  CreditCard, 
  Settings, 
  Search,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

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
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export const OwnerSidebar = ({
  activeSection,
  onSectionChange,
  pendingAdminRequests = 0,
  pendingScoutApplications = 0,
  mobileOpen = false,
  onMobileOpenChange,
}: OwnerSidebarProps) => {
  const isMobile = useIsMobile();

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
    if (isMobile && onMobileOpenChange) {
      onMobileOpenChange(false);
    }
  };

  const SidebarContent = () => (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-3">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleSectionClick(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.badgeCount !== undefined && item.badgeCount > 0 && (
                <Badge 
                  variant={isActive ? "secondary" : "default"}
                  className={cn(
                    "h-5 min-w-[20px] px-1.5 text-xs font-semibold",
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

  // Mobile: Sheet drawer (controlled from parent)
  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="flex flex-col h-full">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">H</span>
                </div>
                <span className="font-semibold">Navigation</span>
              </div>
            </div>
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <aside className="w-64 border-r bg-card shrink-0 hidden md:flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">H</span>
          </div>
          <span className="font-semibold">Navigation</span>
        </div>
      </div>
      <SidebarContent />
    </aside>
  );
};
