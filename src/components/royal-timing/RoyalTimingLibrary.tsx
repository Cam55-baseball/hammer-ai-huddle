import { useState } from 'react';
import { History, Trash2, Copy, ExternalLink, Inbox, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRoyalTimingSessions, RoyalTimingSession, SharedSession } from '@/hooks/useRoyalTimingSessions';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface RoyalTimingLibraryProps {
  onLoadSession: (session: RoyalTimingSession, readOnly?: boolean) => void;
}

export function RoyalTimingLibrary({ onLoadSession }: RoyalTimingLibraryProps) {
  const { sessions, sessionsLoading, sharedSessions, sharedLoading, deleteSession, duplicateSession } = useRoyalTimingSessions();
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<'mine' | 'shared'>('mine');

  if (!expanded) {
    return (
      <Button variant="outline" className="w-full" onClick={() => setExpanded(true)}>
        <History className="h-4 w-4 mr-2" />
        My Sessions ({sessions.length})
        {sharedSessions.length > 0 && (
          <Badge variant="secondary" className="ml-2">{sharedSessions.length} shared</Badge>
        )}
        <ChevronDown className="h-4 w-4 ml-auto" />
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" /> Royal Timing Library
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          <Button
            size="sm"
            variant={tab === 'mine' ? 'default' : 'outline'}
            onClick={() => setTab('mine')}
          >
            My Sessions ({sessions.length})
          </Button>
          <Button
            size="sm"
            variant={tab === 'shared' ? 'default' : 'outline'}
            onClick={() => setTab('shared')}
          >
            <Inbox className="h-3 w-3 mr-1" />
            Shared ({sharedSessions.length})
          </Button>
        </div>
      </CardHeader>
      <CardContent className="max-h-80 overflow-y-auto space-y-2">
        {tab === 'mine' && (
          <>
            {sessionsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No sessions yet</p>
            ) : (
              sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  onLoad={() => onLoadSession(session)}
                  onDelete={() => deleteSession.mutate(session.id)}
                  onDuplicate={() => duplicateSession.mutate(session)}
                />
              ))
            )}
          </>
        )}
        {tab === 'shared' && (
          <>
            {sharedLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
              </div>
            ) : sharedSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No shared sessions</p>
            ) : (
              sharedSessions.map((shared) => (
                <SharedSessionRow
                  key={shared.id}
                  shared={shared}
                  onLoad={() => shared.session && onLoadSession(shared.session, true)}
                />
              ))
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SessionRow({
  session,
  onLoad,
  onDelete,
  onDuplicate,
}: {
  session: RoyalTimingSession;
  onLoad: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const hasVideos = !!(session.video_1_path || session.video_2_path || (session.video_urls && session.video_urls.length > 0));
  const [showVideos, setShowVideos] = useState(false);
  const [videoUrls, setVideoUrls] = useState<{ v1?: string; v2?: string }>({});
  const [loadingUrls, setLoadingUrls] = useState(false);

  const handleToggleVideos = async () => {
    if (showVideos) {
      setShowVideos(false);
      return;
    }
    if (!videoUrls.v1 && !videoUrls.v2) {
      setLoadingUrls(true);
      const urls: { v1?: string; v2?: string } = {};
      if (session.video_1_path) {
        const { data } = await supabase.storage.from('videos').createSignedUrl(session.video_1_path, 300);
        if (data?.signedUrl) urls.v1 = data.signedUrl;
      }
      if (session.video_2_path) {
        const { data } = await supabase.storage.from('videos').createSignedUrl(session.video_2_path, 300);
        if (data?.signedUrl) urls.v2 = data.signedUrl;
      }
      setVideoUrls(urls);
      setLoadingUrls(false);
    }
    setShowVideos(true);
  };

  return (
    <div className="rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-2 p-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {session.subject_reason || 'Untitled Session'}
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{session.created_at ? format(new Date(session.created_at), 'MMM d, yyyy') : 'Unknown'}</span>
            <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">{session.sport || 'baseball'}</Badge>
            {hasVideos && <Badge variant="secondary" className="text-[10px] px-1 py-0">Video</Badge>}
          </div>
        </div>
        {hasVideos && (
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleToggleVideos} title={showVideos ? 'Hide videos' : 'Preview videos'}>
            {showVideos ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onLoad} title="Open">
          <ExternalLink className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onDuplicate} title="Duplicate">
          <Copy className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-destructive" onClick={onDelete} title="Delete">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      {showVideos && (
        <div className="px-2 pb-2 space-y-2">
          {loadingUrls ? (
            <Skeleton className="h-24 w-full rounded" />
          ) : (
            <>
              {videoUrls.v1 && (
                <video src={videoUrls.v1} controls className="w-full max-h-40 rounded bg-black" preload="metadata" />
              )}
              {videoUrls.v2 && (
                <video src={videoUrls.v2} controls className="w-full max-h-40 rounded bg-black" preload="metadata" />
              )}
              {!videoUrls.v1 && !videoUrls.v2 && (
                <p className="text-xs text-muted-foreground text-center py-2">Videos unavailable</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SharedSessionRow({ shared, onLoad }: { shared: SharedSession; onLoad: () => void }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {shared.session?.subject_reason || 'Untitled Session'}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>From: {shared.sender_profile?.full_name || 'Unknown'}</span>
          <span>{shared.created_at ? format(new Date(shared.created_at), 'MMM d') : ''}</span>
        </div>
        {shared.message && (
          <p className="text-xs text-muted-foreground italic mt-1 truncate">"{shared.message}"</p>
        )}
      </div>
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onLoad} title="Open">
        <ExternalLink className="h-3 w-3" />
      </Button>
    </div>
  );
}
