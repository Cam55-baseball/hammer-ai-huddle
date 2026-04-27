/**
 * PHASE 10 — Consultation Setup (owner-only scaffold)
 * No DB writes. Console-log only on create.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Calendar, ArrowLeft } from 'lucide-react';
import { saveBuild } from '@/lib/ownerBuildStorage';
import { toast } from '@/hooks/use-toast';

export default function ConsultationFlow() {
  const { isOwner, loading } = useOwnerAccess();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const videoId = params.get('videoId') ?? '';

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');

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

  const handleCreate = () => {
    saveBuild({
      id: crypto.randomUUID(),
      type: 'consultation',
      name: title,
      meta: { price, videoId },
      createdAt: Date.now(),
    });
    console.log('[PHASE_10_CONSULTATION_CREATE]', { title, price, videoId });
    toast({ title: 'Consultation offer created', description: title });
    navigate('/owner-dashboard');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/owner-dashboard')}
          className="-ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Owner Dashboard
        </Button>

        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Consultation Setup
          </h1>
          <p className="text-muted-foreground mt-1">
            {videoId ? (
              <>Based on Video ID: <span className="font-mono text-foreground">{videoId}</span></>
            ) : (
              <>Optional: open a video from the Video Library to attach a reference clip.</>
            )}
          </p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="offer-title">Offer Title</Label>
            <Input
              id="offer-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 1:1 Mechanics Breakdown"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer-price">Price</Label>
            <Input
              id="offer-price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 199"
              inputMode="decimal"
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleCreate} disabled={!title.trim()}>Create Offer</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
