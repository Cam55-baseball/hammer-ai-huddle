import { useNavigate } from "react-router-dom";
import { BackButton } from "@/components/common/BackButton";
import { Button } from "@/components/ui/button";
import { OrganizationRegistration } from "@/components/organization/OrganizationRegistration";
import { useOrganization } from "@/hooks/useOrganization";

/** Step 1 for a new organization: register it here (no plan needed), then subscribe. */
export default function OrganizationSetup() {
  const navigate = useNavigate();
  const org = useOrganization() as any;
  const hasOrg = !!org?.myOrgs?.data?.length;
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <BackButton />
      <h1 className="text-2xl font-bold">Set up your organization</h1>
      <p className="text-sm text-muted-foreground">
        Register your organization first. Then you can subscribe to the Hammers Organization plan.
      </p>
      <OrganizationRegistration />
      <Button className="w-full min-h-11" variant={hasOrg ? "default" : "outline"} onClick={() => navigate("/staff-plans")}>
        Continue to Organization plan
      </Button>
    </div>
  );
}
