import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface RoleButtonProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}

export const RoleButton = ({ icon: Icon, title, description, onClick }: RoleButtonProps) => {
  return (
    <Button
      variant="role"
      className="w-full max-w-sm p-6 sm:p-8 h-auto"
      onClick={onClick}
    >
      <Icon className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0" />
      <div className="flex flex-col gap-1 text-left">
        <h3 className="text-lg sm:text-xl font-bold leading-tight">{title}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-tight">{description}</p>
      </div>
    </Button>
  );
};
