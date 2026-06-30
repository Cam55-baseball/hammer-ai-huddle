import { User, Settings, HelpCircle, LogOut, Pencil, ListChecks } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuickEditProfile } from "@/components/profile/QuickEditProfile";
import { useAthleteOnboardingState } from "@/hooks/command/useAthleteOnboardingState";

interface UserMenuProps {
  userName?: string;
  userEmail?: string;
}

export function UserMenu({ userName, userEmail }: UserMenuProps) {
  const navigate = useNavigate();
  const { open: openQuickEdit } = useQuickEditProfile();
  const { hasCompletedOnboarding, loading: onboardingLoading } = useAthleteOnboardingState();
  const showSetup = !onboardingLoading && !hasCompletedOnboarding;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const initials = userName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName || "User"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profile")}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/onboarding/athlete?resume=1")}>
          <ListChecks className="mr-2 h-4 w-4" />
          <span>Setup</span>
          {showSetup && (
            <Badge variant="destructive" className="ml-auto h-4 px-1.5 text-[10px]">
              Finish
            </Badge>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openQuickEdit}>
          <Pencil className="mr-2 h-4 w-4" />
          <span>Quick edit</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/checkout")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Manage Subscription</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <HelpCircle className="mr-2 h-4 w-4" />
          <span>Help</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
