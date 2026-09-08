import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AccountDeleted() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full p-8 text-center">
        <CheckCircle2 className="h-10 w-10 mx-auto mb-4 text-primary" />
        <h1 className="text-2xl font-bold mb-2">Your account has been deleted</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Your profile, videos, report cards, grades, training history and saved plans have
          been permanently removed, and any active subscription has been cancelled. You have
          been signed out.
        </p>
        <Button asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </Card>
    </div>
  );
}
