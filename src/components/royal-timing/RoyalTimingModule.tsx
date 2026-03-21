import { useState, useRef, useCallback } from 'react';
import { Crown, Play, Pause, SkipBack, SkipForward, Camera, Timer, Loader2, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSportTheme } from '@/contexts/SportThemeContext';
import { useRoyalTimingTimer } from '@/hooks/useRoyalTimingTimer';
import { VideoPlayer } from './VideoPlayer';
import { TimerDisplay } from './TimerDisplay';

type VideoMode = 'single' | 'comparison';

export function RoyalTimingModule() {
  const { user } = useAuth();
  const { sport: selectedSport } = useSportTheme();
  const { toast } = useToast();

  const [mode, setMode] = useState<VideoMode>('single');
  const [video1Url, setVideo1Url] = useState<string | null>(null);
  const [video2Url, setVideo2Url] = useState<string | null>(null);
  const [subjectReason, setSubjectReason] = useState('');
  const [findings, setFindings] = useState('');
  const [askHammer, setAskHammer] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [masterSpeed, setMasterSpeed] = useState(1);

  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);

  const timer1 = useRoyalTimingTimer();
  const timer2 = useRoyalTimingTimer();
  const masterTimer = useRoyalTimingTimer();

  const handleFileSelect = useCallback((file: File, slot: 1 | 2) => {
    const url = URL.createObjectURL(file);
    if (slot === 1) setVideo1Url(url);
    else setVideo2Url(url);
  }, []);

  const handleRemoveVideo = useCallback((slot: 1 | 2) => {
    if (slot === 1) { setVideo1Url(null); timer1.clear(); }
    else { setVideo2Url(null); timer2.clear(); }
  }, [timer1, timer2]);

  const handleScreenshot = useCallback((videoRef: React.RefObject<HTMLVideoElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const link = document.createElement('a');
    link.download = `royal-timing-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast({ title: 'Screenshot saved' });
  }, [toast]);

  // Master controls
  const masterPlay = useCallback(() => {
    video1Ref.current?.play();
    if (mode === 'comparison') video2Ref.current?.play();
  }, [mode]);

  const masterPause = useCallback(() => {
    video1Ref.current?.pause();
    if (mode === 'comparison') video2Ref.current?.pause();
  }, [mode]);

  const masterRewind = useCallback(() => {
    if (video1Ref.current) video1Ref.current.currentTime = Math.max(0, video1Ref.current.currentTime - 5);
    if (mode === 'comparison' && video2Ref.current) video2Ref.current.currentTime = Math.max(0, video2Ref.current.currentTime - 5);
  }, [mode]);

  const masterSkip = useCallback(() => {
    if (video1Ref.current) video1Ref.current.currentTime += 5;
    if (mode === 'comparison' && video2Ref.current) video2Ref.current.currentTime += 5;
  }, [mode]);

  const masterFrameStep = useCallback((direction: 1 | -1) => {
    const step = direction * (1 / 30);
    if (video1Ref.current) { video1Ref.current.pause(); video1Ref.current.currentTime += step; }
    if (mode === 'comparison' && video2Ref.current) { video2Ref.current.pause(); video2Ref.current.currentTime += step; }
  }, [mode]);

  const handleSpeedChange = useCallback((speed: number) => {
    setMasterSpeed(speed);
    if (video1Ref.current) video1Ref.current.playbackRate = speed;
    if (video2Ref.current) video2Ref.current.playbackRate = speed;
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      const timerData = {
        timer1: { elapsed: timer1.elapsed, wasSynced: timer1.isSynced },
        timer2: mode === 'comparison' ? { elapsed: timer2.elapsed, wasSynced: timer2.isSynced } : null,
        master: mode === 'comparison' ? { elapsed: masterTimer.elapsed, wasSynced: masterTimer.isSynced } : null,
      };

      let aiAnalysis = null;

      if (askHammer && (subjectReason || findings)) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const royalTimingContext = JSON.stringify({
            subject: subjectReason,
            findings,
            sport: selectedSport,
            timerData,
          });

          const response = await supabase.functions.invoke('ai-chat', {
            body: {
              messages: [{ role: 'user', content: `Analyze my timing study. Subject: ${subjectReason}. My findings: ${findings}` }],
              royalTimingContext,
              stream: false,
            },
          });

          if (response.data?.message) {
            aiAnalysis = { response: response.data.message, generated_at: new Date().toISOString() };
            setAiResponse(response.data.message);
          }
        }
      }

      const { error } = await supabase.from('royal_timing_sessions').insert({
        user_id: user.id,
        subject_reason: subjectReason || null,
        findings: findings || null,
        ai_analysis: aiAnalysis,
        timer_data: {
          timer1: { elapsed: timer1.elapsed },
          timer2: mode === 'comparison' ? { elapsed: timer2.elapsed } : null,
          master: mode === 'comparison' ? { elapsed: masterTimer.elapsed } : null,
        },
        video_urls: [video1Url, video2Url].filter(Boolean) as string[],
        sport: selectedSport,
      });

      if (error) throw error;
      toast({ title: 'Session saved', description: 'Your timing study has been recorded.' });
    } catch (err) {
      console.error('Submit error:', err);
      toast({ title: 'Error saving session', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }, [user, subjectReason, findings, askHammer, selectedSport, timer1, timer2, masterTimer, mode, video1Url, video2Url, toast]);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Crown className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Royal Timing</h1>
          <p className="text-sm text-muted-foreground">Video-based timing audit & comparison system</p>
        </div>
        <Badge variant="outline" className="ml-auto capitalize">{selectedSport}</Badge>
      </div>

      {/* Mode Selector */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">Mode:</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as VideoMode)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Video</SelectItem>
                <SelectItem value="comparison">Comparison (Dual)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Video Players */}
      <div className={`grid gap-4 ${mode === 'comparison' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-3xl mx-auto'}`}>
        <VideoPlayer
          label="Video 1"
          videoRef={video1Ref}
          videoUrl={video1Url}
          speed={masterSpeed}
          onFileSelect={(f) => handleFileSelect(f, 1)}
          onRemove={() => handleRemoveVideo(1)}
          onScreenshot={() => handleScreenshot(video1Ref)}
          onSpeedChange={handleSpeedChange}
        />
        {mode === 'comparison' && (
          <VideoPlayer
            label="Video 2"
            videoRef={video2Ref}
            videoUrl={video2Url}
            speed={masterSpeed}
            onFileSelect={(f) => handleFileSelect(f, 2)}
            onRemove={() => handleRemoveVideo(2)}
            onScreenshot={() => handleScreenshot(video2Ref)}
            onSpeedChange={handleSpeedChange}
          />
        )}
      </div>

      {/* Master Controls (Dual Mode) */}
      {mode === 'comparison' && (video1Url || video2Url) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Play className="h-4 w-4" /> Master Controls (Both Videos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => masterFrameStep(-1)}>⏪ Frame</Button>
              <Button size="sm" variant="outline" onClick={masterRewind}><SkipBack className="h-4 w-4" /></Button>
              <Button size="sm" onClick={masterPlay}><Play className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={masterPause}><Pause className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={masterSkip}><SkipForward className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => masterFrameStep(1)}>Frame ⏩</Button>
              <div className="flex items-center gap-2 ml-4">
                <Label className="text-xs whitespace-nowrap">Speed:</Label>
                <Select value={String(masterSpeed)} onValueChange={(v) => handleSpeedChange(parseFloat(v))}>
                  <SelectTrigger className="w-20 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                      <SelectItem key={s} value={String(s)}>{s}x</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timers */}
      <div className={`grid gap-4 ${mode === 'comparison' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 max-w-md mx-auto'}`}>
        <TimerDisplay
          label="Timer 1"
          timer={timer1}
          videoRef={video1Ref}
          hasVideo={!!video1Url}
        />
        {mode === 'comparison' && (
          <>
            <TimerDisplay
              label="Timer 2"
              timer={timer2}
              videoRef={video2Ref}
              hasVideo={!!video2Url}
            />
            <TimerDisplay
              label="Master Timer"
              timer={masterTimer}
              videoRef={video1Ref}
              hasVideo={!!video1Url}
            />
          </>
        )}
      </div>

      <Separator />

      {/* Input + AI Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="h-5 w-5" /> Study Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="subject" className="text-sm font-medium">Subject at Hand? (Reason for use)</Label>
            <Input
              id="subject"
              placeholder="e.g., Comparing stride timing between fastball and changeup delivery"
              value={subjectReason}
              onChange={(e) => setSubjectReason(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="findings" className="text-sm font-medium">Findings after studying?</Label>
            <Textarea
              id="findings"
              placeholder="Describe what you observed during your timing analysis..."
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              className="mt-1 min-h-[100px]"
            />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <div className="flex-1">
              <Label htmlFor="ask-hammer" className="text-sm font-medium cursor-pointer">Ask Hammer</Label>
              <p className="text-xs text-muted-foreground">Get elite-level AI insight on your timing study</p>
            </div>
            <Switch
              id="ask-hammer"
              checked={askHammer}
              onCheckedChange={setAskHammer}
            />
          </div>

          {aiResponse && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Hammer's Analysis
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{aiResponse}</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || (!subjectReason && !findings)}
            className="w-full"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Submit Study</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
