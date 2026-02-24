import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganization } from '@/hooks/useOrganization';
import { Building2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrganizationRegistrationProps {
  existingOrg?: any;
}

export function OrganizationRegistration({ existingOrg }: OrganizationRegistrationProps) {
  const { createOrg } = useOrganization();
  const { toast } = useToast();
  const [name, setName] = useState(existingOrg?.name ?? '');
  const [orgType, setOrgType] = useState(existingOrg?.org_type ?? 'team');
  const [sport, setSport] = useState(existingOrg?.sport ?? 'baseball');

  const handleSubmit = async () => {
    if (!name) return;
    try {
      await createOrg.mutateAsync({ name, sport, org_type: orgType });
      toast({ title: 'Created', description: 'Organization registered successfully.' });
      setName('');
    } catch {
      toast({ title: 'Error', description: 'Failed to create organization.', variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          {existingOrg ? 'Edit Organization' : 'Register Organization'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Organization Name" value={name} onChange={e => setName(e.target.value)} className="h-9" />
        <div className="grid grid-cols-2 gap-2">
          <Select value={orgType} onValueChange={setOrgType}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="team">Team</SelectItem>
              <SelectItem value="facility">Facility</SelectItem>
              <SelectItem value="academy">Academy</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sport} onValueChange={setSport}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="baseball">Baseball</SelectItem>
              <SelectItem value="softball">Softball</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSubmit} disabled={!name || createOrg.isPending} className="w-full">
          <Save className="h-4 w-4 mr-1" /> {existingOrg ? 'Update' : 'Register'}
        </Button>
      </CardContent>
    </Card>
  );
}
