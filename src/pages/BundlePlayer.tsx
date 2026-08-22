/**
 * Purchased bundle delivery — /bundle/:id
 * Access is enforced server-side by get_bundle_videos (owner or user_build_access).
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerAccess } from '@/hooks/useOwnerAccess';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, CheckCircle2, PlayCircle, Lock } from 'lucide-react';
import { safeGet, safeSet } from '@/lib/safeStorage';
import { claimPurchases, getBundleVideos, type BundleVideo } from '@/lib/bundles';
import { supabase } from '@/integrations/supabase/client';

const watchedKey = (bundleId: string) => `bundle_watched_${bundleId}`;

function loadWatched(bundleId: string): string[] {
  try {
    const raw = safeGet(watchedKey(bundleId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function BundlePlayer() {
  const { id: bundleId = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isOwner, loading: ownerLoading } = useOwnerAccess();

  const [videos, setVideos] = useState<BundleVideo[]>([]);
  const [bundleName, setBundleName] = useState<string>('Your bundle');
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [watched, setWatched] = useState<string[]>(() => loadWatched(bundleId));

  useEffect(() => {
    let cancelled = false;
    if (authLoading || ownerLoading) return;
    if (!user?.id || !bundleId) {
      setLoading(false);
      return;
    }

    (async () => {
      // A purchase made while signed out (or before signup) lands here first.
      await claimPurchases();
      const [rows, meta] = await Promise.all([
        getBundleVideos(bundleId).catch(() => [] as BundleVideo[]),
        supabase.from('bundles').select('name').eq('id', bundleId).maybeSingle(),
      ]);
      if (cancelled) return;
      setVideos(rows);
      if (meta.data?.name) setBundleName(meta.data.name);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, bundleId, authLoading, ownerLoading]);

  const active = videos[activeIdx];

  const markWatched = (videoId: string) => {
    setWatched((prev) => {
      if (prev.includes(videoId)) return prev;
      const next = [...prev, videoId];
      safeSet(watchedKey(bundleId), JSON.stringify(next));
      return next;
    });
  };

  const progress = useMemo(
    () => (videos.length ? Math.round((watched.length / videos.length) * 100) : 0),
    [watched.length, videos.length],
  );

  if (authLoading || ownerLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">Sign in to watch</h1>
          <p className="text-muted-foreground">
            Use the same email you bought with and this bundle unlocks automatically.
          </p>
          <Button onClick={() => navigate('/auth')}>Sign in</Button>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold">You don't have access yet</h1>
          <p className="text-muted-foreground">
            If you just purchased, make sure you're signed in with the email used at checkout.
          </p>
          <Button onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Dashboard
        </Button>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{bundleName}</h1>
            <p className="text-sm text-muted-foreground">
              {watched.length} of {videos.length} watched · {progress}% complete
            </p>
          </div>
          {isOwner && (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
              Owner preview
            </Badge>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
          <div className="space-y-3">
            <Card className="overflow-hidden">
              {active ? (
                <video
                  key={active.id}
                  src={active.video_url}
                  poster={active.thumbnail_url ?? undefined}
                  controls
                  playsInline
                  onEnded={() => {
                    markWatched(active.id);
                    if (activeIdx < videos.length - 1) setActiveIdx(activeIdx + 1);
                  }}
                  className="w-full aspect-video bg-black"
                />
              ) : null}
            </Card>
            {active ? (
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">{active.title}</h2>
                {active.description ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {active.description}
                  </p>
                ) : null}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => markWatched(active.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Mark watched
                  </Button>
                  {activeIdx < videos.length - 1 && (
                    <Button size="sm" onClick={() => setActiveIdx(activeIdx + 1)}>
                      Next video
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <ul className="space-y-2">
            {videos.map((v, i) => {
              const done = watched.includes(v.id);
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setActiveIdx(i)}
                    className={`w-full text-left flex items-start gap-2 rounded-lg border px-3 py-2 transition-colors ${
                      i === activeIdx ? 'bg-primary/10 border-primary/40' : 'bg-muted/30 hover:bg-muted/60'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                    ) : (
                      <PlayCircle className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0">
                      <span className="block text-sm font-medium truncate">{v.title}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        Video {i + 1} of {videos.length}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
