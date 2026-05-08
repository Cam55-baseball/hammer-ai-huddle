import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Users,
  UserCog,
  UserPlus,
  Video,
  Settings,
  Search,
  ArrowLeft,
  Library,
  Film,
  Dumbbell,
  Package,
  CreditCard,
  ChevronDown,
  Pin,
  PinOff,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type OwnerSection =
  | "overview"
  | "builds"
  | "users"
  | "admin-requests"
  | "scout-applications"
  | "videos"
  | "video-library"
  | "promo-engine"
  | "drill-cms"
  | "engine-settings"
  | "subscriptions"
  | "settings"
  | "player-search";

interface SidebarItem {
  id: OwnerSection;
  label: string;
  icon: React.ElementType;
  badgeKey?: "admin" | "scout";
}

interface SidebarGroup {
  id: string;
  label: string;
  items: SidebarItem[];
}

const GROUPS: SidebarGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [{ id: "overview", label: "Overview", icon: LayoutDashboard }],
  },
  {
    id: "people",
    label: "People",
    items: [
      { id: "users", label: "User Management", icon: Users },
      { id: "admin-requests", label: "Admin Requests", icon: UserCog, badgeKey: "admin" },
      { id: "scout-applications", label: "Scout Applications", icon: UserPlus, badgeKey: "scout" },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { id: "videos", label: "Recent Videos", icon: Video },
      { id: "video-library", label: "Video Library", icon: Library },
      { id: "drill-cms", label: "Drill CMS", icon: Dumbbell },
      { id: "promo-engine", label: "Promo Engine", icon: Film },
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    items: [
      { id: "builds", label: "Builds", icon: Package },
      { id: "subscriptions", label: "Subscriptions", icon: CreditCard },
    ],
  },
  {
    id: "system",
    label: "Engine & System",
    items: [
      { id: "engine-settings", label: "Engine Settings", icon: Settings },
      { id: "settings", label: "Settings", icon: Settings },
      { id: "player-search", label: "Player Search", icon: Search },
    ],
  },
];

const ALL_ITEMS: SidebarItem[] = GROUPS.flatMap((g) => g.items);

const PINS_KEY = "owner_dashboard_pins_v1";
const COLLAPSED_KEY = "owner_dashboard_collapsed_groups_v1";

function loadList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function saveList(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* ignore */
  }
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
  const navigate = useNavigate();

  const [pinned, setPinned] = useState<string[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);

  useEffect(() => {
    setPinned(loadList(PINS_KEY));
    setCollapsedGroups(loadList(COLLAPSED_KEY));
  }, []);

  const badgeFor = (item: SidebarItem) => {
    if (item.badgeKey === "admin") return pendingAdminRequests;
    if (item.badgeKey === "scout") return pendingScoutApplications;
    return undefined;
  };

  const togglePin = (id: string) => {
    setPinned((prev) => {
      const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
      saveList(PINS_KEY, next);
      return next;
    });
  };

  const movePin = (id: string, dir: -1 | 1) => {
    setPinned((prev) => {
      const idx = prev.indexOf(id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      saveList(PINS_KEY, next);
      return next;
    });
  };

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => {
      const next = prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id];
      saveList(COLLAPSED_KEY, next);
      return next;
    });
  };

  const handleSectionClick = (section: OwnerSection) => {
    onSectionChange(section);
    if (isMobile && onMobileOpenChange) onMobileOpenChange(false);
  };

  const pinnedItems = useMemo(
    () =>
      pinned
        .map((id) => ALL_ITEMS.find((i) => i.id === id))
        .filter((i): i is SidebarItem => !!i),
    [pinned],
  );

  const renderItem = (item: SidebarItem, opts: { pinned?: boolean; pinIndex?: number; pinTotal?: number } = {}) => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;
    const badge = badgeFor(item);
    const isPinned = pinned.includes(item.id);

    return (
      <div key={`${opts.pinned ? "pin-" : ""}${item.id}`} className="group/item relative">
        <button
          onClick={() => handleSectionClick(item.id)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          {opts.pinned ? (
            <Star className={cn("h-3.5 w-3.5 shrink-0 fill-current", isActive ? "" : "text-amber-500")} />
          ) : (
            <Icon className="h-4 w-4 shrink-0" />
          )}
          <span className="flex-1 text-left truncate">{item.label}</span>
          {badge !== undefined && badge > 0 && (
            <Badge
              variant={isActive ? "secondary" : "default"}
              className={cn(
                "h-5 min-w-[20px] px-1.5 text-xs font-semibold",
                isActive && "bg-primary-foreground/20 text-primary-foreground",
              )}
            >
              {badge}
            </Badge>
          )}
        </button>
        {/* Pin / reorder controls */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover/item:flex items-center gap-0.5">
          {opts.pinned && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  movePin(item.id, -1);
                }}
                disabled={opts.pinIndex === 0}
                title="Move up"
              >
                <ChevronDown className="h-3 w-3 rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  movePin(item.id, 1);
                }}
                disabled={opts.pinIndex !== undefined && opts.pinTotal !== undefined && opts.pinIndex === opts.pinTotal - 1}
                title="Move down"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              togglePin(item.id);
            }}
            title={isPinned ? "Unpin" : "Pin to top"}
          >
            {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    );
  };

  const SidebarContent = () => (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {pinnedItems.length > 0 && (
          <div>
            <div className="px-2 pb-1.5 flex items-center gap-1.5">
              <Star className="h-3 w-3 text-amber-500 fill-current" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pinned
              </span>
            </div>
            <div className="space-y-0.5">
              {pinnedItems.map((item, i) =>
                renderItem(item, { pinned: true, pinIndex: i, pinTotal: pinnedItems.length }),
              )}
            </div>
          </div>
        )}

        {GROUPS.map((group) => {
          const isCollapsed = collapsedGroups.includes(group.id);
          const containsActive = group.items.some((i) => i.id === activeSection);
          const open = !isCollapsed || containsActive;
          return (
            <Collapsible
              key={group.id}
              open={open}
              onOpenChange={() => toggleGroup(group.id)}
            >
              <CollapsibleTrigger className="w-full flex items-center justify-between px-2 py-1 hover:bg-muted/50 rounded">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 text-muted-foreground transition-transform",
                    !open && "-rotate-90",
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-1">
                {group.items.map((item) => renderItem(item))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </ScrollArea>
  );

  const ReturnToAppButton = () => (
    <div className="border-t p-3 mt-auto">
      <button
        onClick={() => navigate("/dashboard")}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Return to App</span>
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <div className="flex flex-col h-full">
            <div className="p-4 border-b flex items-center gap-2">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">H</span>
              </div>
              <span className="font-semibold">Owner</span>
            </div>
            <SidebarContent />
            <ReturnToAppButton />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="w-64 border-r bg-card shrink-0 hidden md:flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">H</span>
          </div>
          <span className="font-semibold">Owner</span>
        </div>
      </div>
      <SidebarContent />
      <ReturnToAppButton />
    </aside>
  );
};
