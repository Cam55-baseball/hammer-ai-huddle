import { DashboardLayout } from '@/components/DashboardLayout';
import { OrgVerificationQueue } from '@/components/organization/OrgVerificationCards';

export default function OwnerOrganizations() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-bold">Organization verification</h1>
        <OrgVerificationQueue />
      </div>
    </DashboardLayout>
  );
}
