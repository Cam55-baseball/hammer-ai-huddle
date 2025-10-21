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
      className="w-full max-w-sm p-8"
      onClick={onClick}
    >
      <Icon className="h-12 w-12" />
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </Button>
  );
};
