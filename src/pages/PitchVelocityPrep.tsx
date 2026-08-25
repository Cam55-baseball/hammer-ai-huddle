import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Crosshair,
  FileVideo,
  Loader2,
  Ruler,
  Upload,
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { noteProtectedEditing } from '@/lib/auth/protectedEditing';
import { probeVideoMetadata } from '@/lib/biomech/probeVideoMetadata';
import { extractKeyFramesDeterministic, getVideoSha256, type ExtractedFrame } from '@/lib/frameExtraction';
import { validateVideoFile, VIDEO_LIMITS } from '@/data/videoLimits';
import { cn } from '@/lib/utils';

type Sport = 'baseball' | 'softball';
type PrepStage = 'idle' | 'extracting' | 'uploading' | 'registering' | 'storing' | 'complete';

const MAX_SOURCE_BYTES = 50 * 1024 * 1024;
const DEFAULT_DISTANCE: Record<Sport, string> = {
  baseball: '60.5',
  softball: '43',
};

const STAGE_PROGRESS: Record<PrepStage, number> = {
  idle: 0,
  extracting: 22,
  uploading: 48,
  registering: 66,
  storing: 84,
  complete: 100,
};

interface CalibrationResult {
  session_id: string;
  calibration_status: string;
  reference_distance_ft: number;
  frame_count: number;
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExtension(file: File): string {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return file.type === 'video/quicktime' ? 'mov' : 'mp4';
}

export default function PitchVelocityPrep() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [sport, setSport] = useState<Sport>(() => {
    return localStorage.getItem('selectedSport') === 'softball' ? 'softball' : 'baseball';
  });
  const [referenceDistance, setReferenceDistance] = useState(() => DEFAULT_DISTANCE[sport]);
  const [distanceTouched, setDistanceTouched] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [stage, setStage] = useState<PrepStage>('idle');
  const [result, setResult] = useState<CalibrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Pitch Velocity Calibration — Hammers Modality';
  }, []);

  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [videoPreview]);

  const isBusy = stage !== 'idle' && stage !== 'complete';

  const distanceValue = useMemo(() => Number(referenceDistance), [referenceDistance]);
  const distanceValid = Number.isFinite(distanceValue) && distanceValue > 0 && distanceValue <= 500;

  const handleSportChange = (next: Sport) => {
    setSport(next);
    localStorage.setItem('selectedSport', next);
    if (!distanceTouched) setReferenceDistance(DEFAULT_DISTANCE[next]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const supported = validateVideoFile(file);
    if (!supported.valid) {
      toast({ title: 'Unsupported video', description: supported.error, variant: 'destructive' });
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      toast({
        title: 'Video too large for calibration',
        description: `Use a clip under ${formatBytes(MAX_SOURCE_BYTES)} so the measurement packet stays reliable.`,
        variant: 'destructive',
      });
      return;
    }

    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setFrames([]);
    setResult(null);
    setError(null);
    setStage('idle');
  };

  const resetSelection = () => {
    if (isBusy) return;
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    setFrames([]);
    setResult(null);
    setError(null);
    setStage('idle');
  };

  const handlePrepare = async () => {
    if (!user || !videoFile) return;
    if (!distanceValid) {
      setError('Enter a known distance greater than 0 and no more than 500 feet.');
      return;
    }

    noteProtectedEditing(5 * 60_000);
    setError(null);
    setResult(null);

    let storagePath: string | null = null;
    let videoId: string | null = null;

    try {
      setStage('extracting');
      const probed = await probeVideoMetadata(videoFile);
      if (!probed.fps_true || !probed.duration_sec) {
        throw new Error('Could not read a reliable frame rate from this video.');
      }

      const videoSha256Hex = await getVideoSha256(videoFile);
      const sampledFrames = await extractKeyFramesDeterministic(videoFile, {
        fps_true: probed.fps_true,
        duration_sec: probed.duration_sec,
        landingTimeSec: null,
        rotationHint: probed.rotation_hint ?? undefined,
      });

      if (sampledFrames.length < 3) {
        throw new Error('Not enough readable frames were found. Try a brighter, steadier clip.');
      }
      setFrames(sampledFrames);

      setStage('uploading');
      storagePath = `${user.id}/cv-source/${crypto.randomUUID()}.${fileExtension(videoFile)}`;
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(storagePath, videoFile, {
          contentType: videoFile.type || 'video/mp4',
          cacheControl: '3600',
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message);

      const { data: publicData } = supabase.storage.from('videos').getPublicUrl(storagePath);

      setStage('registering');
      const { data: videoRow, error: videoError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          video_url: publicData.publicUrl,
          status: 'completed',
          sport,
          module: 'pitching',
          side_view: 'auto',
          landing_time_seconds: null,
          rotation_deg: probed.rotation_hint ?? 0,
          video_type: null,
          metadata: {
            analysis_kind: 'pitch_velocity_calibration',
            camera_kind: 'single_camera',
            storage_path: storagePath,
            original_filename: videoFile.name,
            file_size: videoFile.size,
            video_sha256_hex: videoSha256Hex,
            fps_true: probed.fps_true,
            duration_sec: probed.duration_sec,
            source_width: probed.source_width,
            source_height: probed.source_height,
          },
        })
        .select('id')
        .single();
      if (videoError || !videoRow) throw new Error(videoError?.message ?? 'Could not register the video.');
      videoId = videoRow.id;

      setStage('storing');
      const { data, error: invokeError } = await supabase.functions.invoke('pitch-velocity-prep', {
        body: {
          video_id: videoId,
          reference_distance_ft: distanceValue,
          frames: sampledFrames.map((frame) => ({
            frame_index: frame.frame_index,
            timestamp_seconds: frame.timestamp_seconds,
            data_url: frame.data_url,
            width: frame.width,
            height: frame.height,
          })),
        },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.error) throw new Error(String(data.error));

      setResult(data as CalibrationResult);
      setStage('complete');
      toast({
        title: 'Calibration packet ready',
        description: `${sampledFrames.length} frames are stored for the future velocity model.`,
      });
    } catch (prepareError) {
      const message = prepareError instanceof Error ? prepareError.message : 'Calibration preparation failed.';
      setError(message);
      setStage('idle');
      toast({ title: 'Could not prepare calibration', description: message, variant: 'destructive' });

      if (!videoId && storagePath) {
        await supabase.storage.from('videos').remove([storagePath]);
      }
    }
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <Card className="mx-auto mt-10 max-w-lg">
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>Pitch velocity calibration uses your private video vault.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')}>Go to sign in</Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6 pb-16" data-protected-editing="true">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-3">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3">
                <Crosshair className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pitch Velocity Calibration</h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Single-camera measurement plumbing — no velocity number yet.
                </p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="w-fit border-primary/30 bg-primary/5 text-primary">
            Camera measurement beta
          </Badge>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Plumbing only</AlertTitle>
          <AlertDescription>
            This flow uploads one pitching clip, stores deterministic sample frames, and attaches the known field distance.
            Ball detection and pitch velocity are intentionally not calculated in this first pass.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileVideo className="h-5 w-5 text-primary" /> Source clip
              </CardTitle>
              <CardDescription>
                Use a steady side-view pitch clip under {formatBytes(MAX_SOURCE_BYTES)}. Seven evenly spaced frames are sampled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sport">Sport</Label>
                  <Select value={sport} onValueChange={(value) => handleSportChange(value as Sport)} disabled={isBusy}>
                    <SelectTrigger id="sport">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baseball">Baseball</SelectItem>
                      <SelectItem value="softball">Softball</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference-distance" className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-muted-foreground" /> Known distance (ft)
                  </Label>
                  <Input
                    id="reference-distance"
                    inputMode="decimal"
                    value={referenceDistance}
                    disabled={isBusy}
                    onChange={(event) => {
                      setReferenceDistance(event.target.value);
                      setDistanceTouched(true);
                    }}
                    placeholder={sport === 'baseball' ? '60.5' : '43'}
                    className={cn(!distanceValid && referenceDistance && 'border-destructive focus-visible:ring-destructive')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Usually mound to plate: 60.5 ft baseball, 43 ft softball.
                  </p>
                </div>
              </div>

              {!videoPreview ? (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex min-h-72 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 p-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="rounded-full bg-primary/10 p-4">
                    <Upload className="h-9 w-9 text-primary" />
                  </div>
                  <span className="mt-4 text-lg font-semibold">Choose pitching video</span>
                  <span className="mt-1 max-w-sm text-sm text-muted-foreground">
                    MP4, MOV, WebM, AVI, or M4V up to {VIDEO_LIMITS.MAX_FILE_SIZE_MB} MB; this prep flow recommends under {formatBytes(MAX_SOURCE_BYTES)}.
                  </span>
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-xl border bg-black">
                    <video src={videoPreview} controls playsInline preload="metadata" className="mx-auto max-h-[420px] w-full object-contain" />
                  </div>
                  <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{videoFile?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {videoFile ? formatBytes(videoFile.size) : ''} · {sport} · {referenceDistance || '—'} ft reference
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={resetSelection} disabled={isBusy}>
                      Choose another
                    </Button>
                  </div>
                </div>
              )}

              <input
                ref={inputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-msvideo,video/x-m4v"
                className="hidden"
                onChange={handleFileSelect}
              />

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Preparation stopped</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isBusy && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{stage.replace('_', ' ')}…</span>
                    <span className="text-muted-foreground">{STAGE_PROGRESS[stage]}%</span>
                  </div>
                  <Progress value={STAGE_PROGRESS[stage]} />
                </div>
              )}

              <Button
                size="lg"
                className="w-full"
                disabled={!videoFile || !distanceValid || isBusy}
                onClick={handlePrepare}
              >
                {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crosshair className="mr-2 h-4 w-4" />}
                Prepare measurement packet
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Captured frame set</CardTitle>
                <CardDescription>
                  Deterministic samples are stored with checksums and timestamps for the future detector.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {frames.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Frames appear here after a clip is selected and prepared.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {frames.map((frame) => (
                      <div key={frame.frame_index} className="overflow-hidden rounded-lg border bg-muted/20">
                        <img src={frame.data_url} alt={`Sample frame ${frame.frame_index}`} className="aspect-video w-full object-cover" />
                        <div className="px-2 py-1 text-[10px] text-muted-foreground">
                          #{frame.frame_index} · {frame.timestamp_seconds.toFixed(3)}s
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {result && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-primary">
                    <CheckCircle2 className="h-5 w-5" /> Ready for detection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline">{result.calibration_status}</Badge>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Frames stored</span>
                    <span className="font-medium">{result.frame_count}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-medium">{result.reference_distance_ft} ft</span>
                  </div>
                  <p className="pt-2 text-xs text-muted-foreground">
                    Session ID: <span className="font-mono">{result.session_id}</span>
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Best capture setup</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>Lock the phone or camera so it does not move.</li>
                  <li>Film from the side with the full mound-to-plate line visible.</li>
                  <li>Use the highest available frame rate and avoid digital zoom.</li>
                  <li>Keep the ball, pitcher, and plate inside the frame for the full pitch.</li>
                </ul>
                <Button asChild variant="link" className="mt-3 h-auto p-0">
                  <Link to={`/analyze/pitching?sport=${sport}`}>Open standard pitching analysis</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
