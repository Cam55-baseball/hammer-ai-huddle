import { useNavigate } from "react-router-dom";
import { BackButton } from "@/components/common/BackButton";
import { Button } from "@/components/ui/button";
import { OrganizationRegistration } from "@/components/organization/OrganizationRegistration";
import { useOrganization } from "@/hooks/useOrganization";

/** Register immediately, then subscribe. No organization validation step. */
export default function OrganizationSetup() {
  const navigate = useNavigate();
  const { myOrgs } = useOrganization() as any;
  const org = (myOrgs?.data ?? [])[0];
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pt-safe pb-safe">
      <BackButton fallback="/" />
      <h1 className="text-2xl font-bold">Set up your organization</h1>
      {!org ? (
        <>
          <p className="text-sm text-muted-foreground">Step 2 of 2: name your organization.</p>
          <OrganizationRegistration />
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{org.name}</span> is active. Continue to your Organization plan.</p>
        </>
      )}
      <Button className="min-h-11 w-full" variant={org ? "default" : "outline"} onClick={() => navigate("/staff-plans")}>
        Continue to Organization plan
      </Button>
    </div>
  );
}
