/**
 * PHASE 10 — Program Builder (owner-only scaffold)
 * No DB writes. Console-log only on save.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Wrench } from 'lucide-react';
import { saveBuild } from '@/lib/ownerBuildStorage';
import { toast } from '@/hooks/use-toast';

export default function ProgramBuilder() {
  const { isOwner, loading } = useOwnerAccess();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const videoId = params.get('videoId') ?? '';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!loading && !isOwner) navigate('/dashboard');
  }, [isOwner, loading, navigate]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }
  if (!isOwner) return null;

  const handleSave = () => {
    saveBuild({
      id: crypto.randomUUID(),
      type: 'program',
      name,
      meta: { description, videoId },
      createdAt: Date.now(),
    });
    console.log('[PHASE_10_PROGRAM_SAVE]', { name, description, videoId });
    toast({ title: 'Program saved', description: name });
    navigate('/owner/builds');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wrench className="h-8 w-8" />
            Program Builder
          </h1>
          <p className="text-muted-foreground mt-1">
            Building from Video ID: <span className="font-mono text-foreground">{videoId || '—'}</span>
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="program-name">Program Name</Label>
            <Input
              id="program-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 4-Week Power Hitting Block"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="program-description">Description</Label>
            <Textarea
              id="program-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this program teaches and who it's for"
              rows={4}
            />
          </div>
        </Card>

        <Card className="p-6 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Selected Video</h2>
          <p className="font-mono text-sm">{videoId || 'No video selected'}</p>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!name.trim()}>Save Program</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
