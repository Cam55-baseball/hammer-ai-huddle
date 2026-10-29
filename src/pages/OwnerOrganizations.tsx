import { DashboardLayout } from '@/components/DashboardLayout';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function OwnerOrganizations() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-bold">Organizations</h1>
        <p>Organizations are active immediately. No approval is needed.</p>
        <Button asChild variant="outline"><Link to="/organization">Organization Dashboard</Link></Button>
      </div>
    </DashboardLayout>
  );
}
