import { HMLoadingFallback } from "@/components/loading/HMLoadingScreen";
import { SavedMovementSummary } from "@/components/assessment/SavedMovementSummary";
import { isAnalysisType } from "../../supabase/functions/_shared/analysisTypes";
import { Fragment, useEffect, useState, useRef } from "react";
import { runClipPreflight, type PreflightVerdict } from "@/lib/biomech/pose/clipPreflight";
import { ClipPreflightCard } from "@/components/analyze/ClipPreflightCard";
import { UploadAnalysisReport } from "@/components/analyze/UploadAnalysisReport";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useOwnerAccess } from "@/hooks/useOwnerAccess";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowLeft, Upload, Video, Trash2, BookMarked, Home, Target, Camera } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SaveToLibraryDialog } from "@/components/SaveToLibraryDialog";

import { EnhancedVideoPlayer } from "@/components/EnhancedVideoPlayer";
import { AnalysisResultSkeleton } from "@/components/skeletons/AnalysisResultSkeleton";
import { AnalysisProgressIndicator } from "@/components/report-card/hammer/AnalysisProgressIndicator";
import { noteProtectedEditing, clearProtectedEditing } from "@/lib/auth/protectedEditing";
import { useSideContext } from "@/contexts/SideContext";
import { UPLOAD_ERRORS, friendlyRejectReason, friendlyThrownError } from "@/lib/upload/uploadErrorCopy";
import { describeVideoSaveFailure } from "@/lib/upload/saveFailure";
import { isAnalysisVideoFile, analysisVideoContentType, withAnalysisVideoType } from "@/lib/upload/analysisVideoFile";
import { extractClassicKeyFrames } from "@/lib/frameExtraction";
import { ANALYSIS_DID_NOT_FINISH, temporaryUploadUntil } from "@/lib/upload/temporaryUpload";
import { normalizeAnalysisResponse, analysisErrorDetails, settleAnalysisReport, hasCoachingContent } from "@/lib/upload/analysisResponse";
import { AnalysisToggle, type AnalysisView } from "@/components/report-card/hammer/AnalysisToggle";
import { HammerReportCard } from "@/components/report-card/hammer/HammerReportCard";
import { ReportCardAccessGate } from "@/components/report-card/hammer/ReportCardAccessGate";
import { canSeeReportCard, videoGradesShown, VIDEO_GRADE_PLACEHOLDER } from "@/lib/reportCard/visibility";
import { InternalLabel } from "@/components/InternalLabel";
import { generateVideoThumbnail, uploadVideoThumbnail } from "@/lib/videoHelpers";
import { densePoseRowToPoseFrameRow, type PoseFrameRow } from "@/lib/biomech/pose/poseRunner";
import { resolveClipSide, frontAnkleIndex, deriveDirectionSign } from "@/lib/biomech/side/strideSide";
import { checkDeclaredSide } from "@/lib/biomech/side/sideCheck";
import { captureDenseLandmarkSeries, WindowSelectionFailure, UNKNOWN_FPS_SAMPLING_GRID_HZ } from "@/lib/biomech/pose/denseLandmarkCapture";
import { writeLandmarkSeries } from "@/lib/biomech/pose/landmarkSeriesStorage";
import { runPitchingTiles } from "@/lib/biomech/metrics/pitchingTiles";
import { toStrideFrames } from "@/lib/biomech/pose/toAnchorFrames";
import { runTempoPipeline } from "@/lib/biomech/pipeline/tempoPipeline";
import { useVault } from "@/hooks/useVault";
import { AnalysisPrescriptionSection } from "@/components/analyze/AnalysisPrescriptionSection";
import { matchPrescriptionDrills } from "@/lib/prescription/matchDrills";
import { AnalysisResultsPanel } from "@/components/analyze/AnalysisResultsPanel";
import { VideoSuggestionsPanel } from "@/components/video-suggestions/VideoSuggestionsPanel";
import { AnalysisVideoRecommendations } from "@/components/analyze/AnalysisVideoRecommendations";
import { BackLegFinding } from "@/components/analyze/BackLegFinding";
import { useQueryClient } from "@tanstack/react-query";
import { analysisFeedbackToTaxonomy } from "@/lib/analysisFeedbackToTaxonomy";
import { moduleToSkillDomain, mapHIEAreaToMovement } from "@/lib/analysisToTaxonomy";
import { emitVideoMoment } from "@/lib/videoMoments/bus";
import { HighFpsCapture } from "@/components/analyze/HighFpsCapture";
import { evaluateMovementGate, type MovementGateResult } from "@/lib/biomech/gates/movementGate";
import { diagnoseTrack } from "@/lib/biomech/pose/trackDiagnosis";
import { detectCameraView } from "@/lib/biomech/camera/cameraView";
import { fpsProvenance, probeVideoMetadata, type ProbedVideoMetadata } from "@/lib/biomech/probeVideoMetadata";
import { readUploadFacts } from "@/lib/upload/uploadFacts";
import { classifyFps } from "@/lib/capture/highFpsCapture";
import { PitchingFilmingGuide } from "@/components/analyze/PitchingFilmingGuide";
import { useSmartBack } from "@/hooks/useSmartBack";
import { runHittingPoseTiles } from "@/lib/biomech/metrics/hittingPoseTiles";
import { runHittingCardTiles } from "@/lib/biomech/metrics/hittingCardTiles";
import { runHittingOwnerTiles } from "@/lib/biomech/metrics/hittingOwnerTiles";
import { runFrontLegGather } from "@/lib/biomech/metrics/frontLegGather";
import { runActiveStride, runStrideCoil } from "@/lib/biomech/metrics/strideRhythm";
import { runThrowingTiles } from "@/lib/biomech/metrics/throwingTiles";
import { runPitchingCardTiles } from "@/lib/biomech/metrics/pitchingCardTiles";
import { runSoftballPitchingTiles } from "@/lib/biomech/metrics/softballPitchingTiles";
import type { MeasuredClipTiles } from "@/lib/reportCard/measuredClipSpec";

/**
 * A replayed (cached) analysis comes back wrapped as `{ replay_cache, ai_analysis }`,
 * while a fresh one is returned flat. Unwrap it so the fault flags, scorecard and
 * metrics are in the same place either way — video suggestions and prescriptions
 * read those keys directly.
 */


export default function AnalyzeVideo({ assessment }: { assessment?: { module: "hitting" | "throwing" | "pitching"; sport: "baseball" | "softball"; onDone: () => void; onSaved?: (report: unknown) => void } } = {}) {
  const { t } = useTranslation();
  const { module: routeModule } = useParams<{ module: string }>();
  const module = assessment?.module ?? routeModule;
  const [searchParams] = useSearchParams();
  const sport = assessment?.sport ?? searchParams.get("sport") ?? localStorage.getItem('selectedSport') ?? "baseball";
  const { user, session, loading: authLoading, isAuthStable } = useAuth();
  const queryClient = useQueryClient();
  const { modules: subscribedModules, loading: subLoading, initialized, refetch, hasAccessForSport } = useSubscription();
  const { isOwner } = useOwnerAccess();
  const { isAdmin } = useAdminAccess();
  const showReportCard = canSeeReportCard({ isOwner, isAdmin });
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const location = useLocation();
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<string | null>(null);
  // Analysis opens first; Report Card reads only this clip's measured tiles.
  const [analysisView, setAnalysisView] = useState<AnalysisView>("analysis");
  const [clipTiles, setClipTiles] = useState<MeasuredClipTiles | null>(null);
  const [preflight, setPreflight] = useState<PreflightVerdict | null>(null);
  const [preflightChecking, setPreflightChecking] = useState(false);
  const [preparingVideo, setPreparingVideo] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<number | null>(null);
  const selectionRef = useRef(0);

  const [analyzing, setAnalyzing] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    efficiency_score: number | null;
    report_status?: string;
    saved?: boolean;
    save_error?: string | null;
    summary?: string[];
    feedback: string;
    positives?: string[];
    improvements?: Array<{ phase: string; fault: string; why: string; fix: string; fault_key?: string }>;
    clean_reason?: string | null;
    drills: Array<{
      title: string;
      purpose: string;
      steps: string[];
      reps_sets: string;
      equipment: string;
      cues?: string[];
    }>;
    scorecard?: {
      improvements: Array<{ area: string; description: string; trend?: string }>;
      regressions: Array<{ area: string; description: string; trend?: string }>;
      neutral: Array<{ area: string; description: string }>;
      overall_trend: string;
      score_trend?: {
        direction: "improving" | "declining" | "stable";
        average_change: number;
        comparison_to_first: number;
      };
      is_first_analysis: boolean;
      historical_scores?: number[];
    };
    /** Hammer Report Card — structured per-tile metrics with confidence/missingness. */
    metrics?: Record<string, unknown> | null;
    report_card_contract_id?: string | null;
    /** Raw AI violation flags — drive the in-report prescription section. */
    violations_detected?: Record<string, boolean> | null;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<any>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  // Phase 51 — persisted deterministic tempo (single source of truth from
  // `video_metric_runs`). Either a numeric `value` or a canonical missingness
  // reason — never a fabricated default.
  const [persistedTempo, setPersistedTempo] = useState<
    | { value: number | null; missing_reason: string | null; evidence_sha256_hex: string }
    | null
  >(null);
  // Rebuilt deterministic pitching tiles — the only source the report card reads for those four tiles.
  const [pitchingTilesDet, setPitchingTilesDet] = useState<ReturnType<typeof runPitchingTiles> | null>(null);
  const [playbackRate, setPlaybackRate] = useState<string>(() => {
    return localStorage.getItem('videoPlaybackRate') || '1';
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const analysisEnabled = true;
  const [showScorecard, setShowScorecard] = useState<boolean>(() => {
    return localStorage.getItem('showProgressReport') !== 'false';
  });
  const [scorecardFilter, setScorecardFilter] = useState<'all' | 'improvements' | 'regressions'>(() => {
    const saved = localStorage.getItem('scorecardDisplayFilter');
    return (saved === 'improvements' || saved === 'regressions') ? saved : 'all';
  });
  const [savedDrillIds, setSavedDrillIds] = useState<Set<string>>(new Set());
  const [landingTime, setLandingTime] = useState<number | null>(null);
  const [extractingFrames, setExtractingFrames] = useState(false);
  // Every analysis entry (sidebar buttons, dashboard module cards) lands on a
  // method chooser first, with exactly two real choices: record in-app at the
  // highest frame rate the device allows, or upload a file they already have.
  // DelayCam is NOT here — it is a delayed mirror for self-review with no
  // report card, so it has its own module at /delaycam.
  const [captureMode, setCaptureMode] = useState<"choose" | "upload" | "capture">("choose");
  // Owner ruling: Analysis is body mechanics only. Ball speed / reference
  // distance live in DelayCam (code kept in src/lib/cv + src/lib/capture).
  const { saveDrill, savedDrills } = useVault();

  // Side-aware analysis: hitting → hit discipline; pitching/throwing → throw.
  const sideDiscipline: 'hit' | 'throw' = module === 'hitting' ? 'hit' : 'throw';
  const { shouldShowPicker, profileSide, saveProfileSide, loading: sideLoading } = useSideContext();
  // Owner rule (2026-09-27): the side decides which ankle is the front foot, so
  // it must be ESTABLISHED before analysis — never assumed, never defaulted.
  //   profile single side → used, overridable per clip
  //   switch hitter / ambidextrous → per-clip choice required
  //   nothing recorded → ask and save to the profile
  const [clipSide, setClipSide] = useState<'L' | 'R' | null>(null);
  const [savingProfileSide, setSavingProfileSide] = useState(false);
  const [showSideOverride, setShowSideOverride] = useState(false);
  const profileSideValue = profileSide(sideDiscipline);
  const sideResolution = resolveClipSide(profileSideValue, clipSide);
  const clipSideKnown = sideResolution.status === 'known';
  const activeSide: 'L' | 'R' = sideResolution.status === 'known' ? sideResolution.side : 'R'; // display/filing only when known
  const requiresSideConfirmation = shouldShowPicker(sideDiscipline);
  const sideWord = sideDiscipline === 'hit' ? 'batting' : 'throwing';
  const chooseClipSide = async (s: 'L' | 'R') => {
    if (profileSideValue == null) {
      // Case 3 — save to the profile so the athlete is never asked again.
      setSavingProfileSide(true);
      const ok = await saveProfileSide(sideDiscipline, s, (sport === 'softball' ? 'softball' : 'baseball'));
      setSavingProfileSide(false);
      if (!ok) toast.error(`We couldn't save your ${sideWord} side to your profile. It's used for this clip only — try again later.`);
    }
    setClipSide(s);
    setShowSideOverride(false);
  };

  // Track which drills are already saved
  useEffect(() => {
    if (savedDrills && analysis?.drills) {
      const saved = new Set(
        savedDrills
          .filter(d => d.module_origin === module && d.sport === sport)
          .map(d => d.drill_name)
      );
      setSavedDrillIds(saved);
    }
  }, [savedDrills, analysis?.drills, module, sport]);

  const handleSaveDrill = async (drill: any) => {
    // Build complete description with explicit section markers for consistent parsing
    let fullDescription = `Purpose: ${drill.purpose || 'N/A'}`;
    
    if (drill.steps && drill.steps.length > 0) {
      fullDescription += `\n\nSteps:\n${drill.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`;
    }
    
    if (drill.reps_sets) {
      fullDescription += `\n\nReps/Sets: ${drill.reps_sets}`;
    }
    
    if (drill.equipment) {
      fullDescription += `\n\nEquipment: ${drill.equipment}`;
    }
    
    if (drill.cues && drill.cues.length > 0) {
      fullDescription += `\n\nCoaching Cues: ${drill.cues.join(', ')}`;
    }

    const result = await saveDrill({
      drill_name: drill.title,
      drill_description: fullDescription || null,
      module_origin: module || '',
      sport: sport,
      side: shouldShowPicker(sideDiscipline) ? activeSide : null,
    });

    if (result.success) {
      setSavedDrillIds(prev => new Set(prev).add(drill.title));
      toast.success(t('vault.drills.saveSuccess', 'Drill saved to your Vault!'));
    } else if (result.error === 'already_saved') {
      toast.info(t('vault.drills.alreadySaved', 'Already saved'));
    } else {
      toast.error(t('vault.drills.saveFailed', 'Failed to save drill'));
    }
  };

  const handleScorecardToggle = (checked: boolean) => {
    setShowScorecard(checked);
    localStorage.setItem('showProgressReport', String(checked));
  };

  const handleScorecardFilterChange = (value: string) => {
    if (value) {
      const filter = value as 'all' | 'improvements' | 'regressions';
      setScorecardFilter(filter);
      localStorage.setItem('scorecardDisplayFilter', filter);
    }
  };

  // Opt-in subscription refresh — only when explicitly requested (e.g. after Checkout returns with ?refresh=1).
  // The unconditional mount-time refetch caused a race where `subscribedModules` was briefly empty,
  // triggering a false-positive `navigate("/dashboard")`. Refetch is now intent-driven.
  useEffect(() => {
    if (searchParams.get("refresh") === "1") refetch();
  }, [searchParams, refetch]);

  // Bullet-proof guards: never evict the user on transient auth/subscription state.
  // Both the auth-missing and access-denied branches require a second-tick confirmation
  // and are skipped while the tab is hidden (avoids tab-switch evictions).
  useEffect(() => {
    if (authLoading || subLoading || !initialized || !isAuthStable) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

    const isOwnerOrAdmin = isOwner || isAdmin;

    // 1. Missing session — confirm via fresh getSession() before redirecting to /auth.
    if (!user && !session) {
      const t1 = setTimeout(async () => {
        if (document.visibilityState === "hidden") return;
        const { data } = await supabase.auth.getSession();
        if (data.session) return; // we're actually signed in, AuthContext just hadn't caught up
        navigate("/auth", {
          replace: true,
          state: { returnTo: location.pathname + location.search },
        });
      }, 400);
      return () => clearTimeout(t1);
    }

    // 2. Missing module param — that's a structural issue, redirect immediately.
    if (!module) {
      navigate("/dashboard", { replace: true });
      return;
    }
    if (!isAnalysisType(module)) return;

    // 3. Owner/Admin short-circuit — never gate them on subscription data.
    if (isOwnerOrAdmin) return;

    // 4. Access check — only deny if the subscription snapshot is settled AND a 400ms
    // grace window confirms access is still absent. This eliminates the transient-empty race.
    const hasAccess = hasAccessForSport(module as string, sport, isOwnerOrAdmin);
    if (hasAccess) return;

    const t2 = setTimeout(() => {
      if (document.visibilityState === "hidden") return;
      // Re-evaluate; if Owner/Admin/access flipped true, abort the eviction.
      if (isOwner || isAdmin) return;
      if (hasAccessForSport(module as string, sport, isOwner || isAdmin)) return;
      console.warn('AnalyzeVideo — access denied after grace window', { sport, module, subscribedModules });
      toast.error(t('errors.noModuleAccess', "You don't have access to this module. Please subscribe."));
      if (assessment) assessment.onDone();
      else navigate("/dashboard", { replace: true });
    }, 400);
    return () => clearTimeout(t2);
  }, [authLoading, subLoading, initialized, isAuthStable, user, session, subscribedModules, module, sport, isOwner, isAdmin, hasAccessForSport, navigate, t]);

  // Clean upload space when module or sport changes
  useEffect(() => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview(null);
    setAnalysis(null);
    setAnalysisView("analysis");
    setClipTiles(null);
    setAnalysisError(null);
    setCurrentVideoId(null);
    currentVideoIdRef.current = null;
    setLandingTime(null);
    if (module && sport && !assessment) {
      toast.info(t('videoAnalysis.switchedContext', { sport, module, defaultValue: 'Switched to {{sport}} - {{module}}. Upload space cleared.' }));
    }
  }, [module, sport, t]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = parseFloat(playbackRate);
    }
  }, [playbackRate]);

  // Auth-eviction guard: while the video is uploading, frames are extracting,
  // or analyze-video is running, hold the protected-editing heartbeat open so
  // a transient auth/visibility blip cannot kick the user to /auth or /home
  // mid-analysis. Matches the pattern used by SeasonScheduleImporterDialog.
  useEffect(() => {
    const busy = analyzing || uploading || extractingFrames || preparingVideo;
    if (!busy) return;
    noteProtectedEditing(180_000); // refresh every tick up to the edge budget
    const id = window.setInterval(() => noteProtectedEditing(180_000), 10_000);
    return () => {
      window.clearInterval(id);
      clearProtectedEditing();
    };
  }, [analyzing, uploading, extractingFrames, preparingVideo]);

  // Auto-recompute report card ONCE per video when metrics are missing/sparse.
  // Lineage-preserving: only mutates ai_analysis.metrics via the edge function.
  const autoRecomputedRef = useRef<Set<string>>(new Set());
  const lastMotionCentreRef = useRef<number | null>(null);
  useEffect(() => {
    if (!currentVideoId || !analysis) return;
    // recompute-report-card is owner/admin only; a player must never call it
    // (it answers 403). The call is also non-fatal by design: the analysis is
    // the product, the recompute is an extra.
    if (!showReportCard) return;
    if (autoRecomputedRef.current.has(currentVideoId)) return;
    const m = (analysis as any).metrics as Record<string, any> | null | undefined;
    const present = m && typeof m === "object"
      ? Object.values(m).filter((v: any) => v && typeof v === "object" && !(v.missing === true) && ("value" in v)).length
      : 0;
    const sparse = !m || Object.keys(m).length === 0 || present < 3;
    if (!sparse) return;
    autoRecomputedRef.current.add(currentVideoId);
    supabase.functions.invoke("recompute-report-card", { body: { video_id: currentVideoId } })
      .then(({ data, error }) => {
        if (error) { console.warn("[auto-recompute]", error); return; }
        const metrics = (data as { metrics?: Record<string, unknown> })?.metrics;
        if (metrics && Object.keys(metrics).length > 0) {
          setAnalysis((prev) => (prev ? { ...prev, metrics } : prev));
        }
      })
      .catch((e) => console.warn("[auto-recompute] failed", e));
  }, [currentVideoId, analysis, showReportCard]);

  const handlePlaybackRateChange = (rate: string) => {
    setPlaybackRate(rate);
    localStorage.setItem('videoPlaybackRate', rate);
  };

  const handleRemoveVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview(null);
    setAnalysis(null);
    setAnalysisView("analysis");
    setClipTiles(null);
    setAnalysisError(null);
    setCurrentVideoId(null);
    setLandingTime(null);
    setCaptureMode("choose");
    toast.success(t('videoAnalysis.videoRemoved', "Video removed. Select a new video to analyze."));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAnalysisVideoFile(file)) {
      toast.error(UPLOAD_ERRORS.notAVideo);
      return;
    }

    if (file.size > 52428800) { // 50MB limit
      toast.error(UPLOAD_ERRORS.tooLarge);
      return;
    }


    // Oct 28: the ORIGINAL file is uploaded untouched. The server watches it
    // itself, so the phone never converts, decodes or plays the clip first
    // (iPhone Safari often can't, which left a black box and no report).
    ++selectionRef.current;
    setPreparingVideo(false);
    setConversionProgress(null);
    const prepared: File = file;
    setVideoFile(prepared);
    setVideoPreview(URL.createObjectURL(prepared));
    // One-second clip check before analysis (advisory; never blocks).
    setPreflight(null);
    setPreflightChecking(true);
    void (async () => {
      try {
        // Advisory only; a phone that can't play the clip just skips it.
        const giveUp = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("preflight_timeout")), 15_000));
        await Promise.race([(async () => {
          const meta = await probeVideoMetadata(prepared).catch(() => null);
          const fps = meta && meta.fps_source === "container" ? meta.fps_true ?? null : null;
          setPreflight(await runClipPreflight(prepared, fps));
        })(), giveUp]);
      } catch (err) {
        console.warn("[clip-preflight] skipped", err);
      } finally {
        setPreflightChecking(false);
      }
    })();
    setAnalysis(null);
    setAnalysisView("analysis");
    setClipTiles(null);
    setAnalysisError(null);
    setCurrentVideoId(null);
    setLandingTime(null);
    // Per-clip side choice resets with every new clip (profile side persists).
    setClipSide(null);
    setShowSideOverride(false);
  };

  // The clip row created by this upload, readable from catch paths.
  const currentVideoIdRef = useRef<string | null>(null);

  // Owner P0 (Oct 28): a failed analysis shows only "Tap Retry", never a report shell.
  const showRetryScreen = () => {
    setAnalysis(null);
    setAnalysisError({ status: 0, message: ANALYSIS_DID_NOT_FINISH, terminal: false });
    setUploading(false);
    setAnalyzing(false);
  };
  // The original pictures, started as soon as the clip is chosen for analysis.
  const classicFramesRef = useRef<Promise<string[]> | null>(null);

  const handleUploadAndAnalyze = async () => {
    if (!videoFile || !user || !isAnalysisType(module)) return;

    // Side gate: analysis refuses honestly when the side is not established.
    // It picks the front foot, so a guessed side invalidates the plant anchor
    // and everything after it. Defaulting to right-handed caused that bug.
    if (analysisEnabled && !clipSideKnown) {
      toast.error(
        sideDiscipline === 'hit'
          ? 'Choose which side you are batting from in this clip before analysis.'
          : 'Choose which hand you are throwing with in this clip before analysis.',
      );
      return;
    }


    // Phase 52 — pre-upload session assertion. RLS on `videos` requires
    // `auth.uid() = user_id`; if the Supabase client has no live session
    // (expired token, preview-origin session drift, race with auth restore),
    // the insert silently fails with "new row violates row-level security
    // policy". Verify the live session matches `useAuth().user` BEFORE any
    // storage upload or DB write so the failure mode is explicit.
    const { data: sessionCheck, error: sessionErr } = await supabase.auth.getSession();
    const liveSession = sessionCheck?.session ?? null;
    console.log('[upload] auth check', {
      useAuthUserId: user.id,
      liveSessionUserId: liveSession?.user?.id ?? null,
      hasAccessToken: !!liveSession?.access_token,
      sessionErr: sessionErr?.message ?? null,
    });
    // Do NOT auto-navigate to /auth here — that's the bug that kicks users
    // off the upload screen mid-flow. Surface an actionable toast instead;
    // the file stays selected so they can retry after re-signing in.
    const returnTo = `${location.pathname}${location.search}`;
    if (!liveSession?.user?.id) {
      toast.error(
        t('videoAnalysis.sessionExpired', 'Your session expired. Sign in again to upload — your video stays selected.'),
        {
          duration: 12000,
          action: {
            label: t('common.signIn', 'Sign in'),
            onClick: () => navigate('/auth', { state: { returnTo } }),
          },
        }
      );
      return;
    }
    if (liveSession.user.id !== user.id) {
      console.warn('[upload] auth-origin mismatch', {
        useAuthUserId: user.id,
        liveSessionUserId: liveSession.user.id,
      });
      toast.error(
        t('videoAnalysis.sessionMismatch', 'Two accounts detected on this device. Sign in again to continue.'),
        {
          duration: 12000,
          action: {
            label: t('common.signIn', 'Sign in'),
            onClick: () => navigate('/auth', { state: { returnTo } }),
          },
        }
      );
      return;
    }

    setUploading(true);
    // January–September engine: sample the original pictures on the phone,
    // alongside the upload. No gates; zero pictures means the server watches
    // the uploaded clip instead.
    classicFramesRef.current = analysisEnabled ? extractClassicKeyFrames(videoFile, landingTime) : null;

    // ===== PHASE 0 — Clip fingerprint =====
    // Oct 28: the server watches the uploaded clip itself. The phone only
    // fingerprints the file; it never has to play or decode the video, so a
    // black preview or an unreadable codec on the phone can't stop a report.
    setUploadStage('Reading your clip…');
    const upload = await readUploadFacts(videoFile);
    const probed = upload.probe;
    console.log("[ANALYSIS] upload facts", { ...upload, probe: probed ? "read" : "unreadable" });

    // Owner ruling 2026-10-27: a small, soft, slow, short or long clip is still
    // coached from what is visible. Only a clip with no readable frame refuses.

    // ===== PHASE 1 — Deterministic frame extraction =====
    // Phase 42B — D-POSE Build Authority. Real-landmark execution artifacts
    // captured here and persisted into `video_landmark_runs` after the video
    // row is created. Surfaced on `window.__DPOSE_LAST_RUN__` for proof capture.
    // STEP 1 — dense capture replaces the 7-frame pose sample. The full series
    // is persisted to storage so metrics can be RECOMPUTED when the engine
    // improves, without re-filming the athlete.
    let denseRun: Awaited<ReturnType<typeof captureDenseLandmarkSeries>> | null = null;
    let poseRows: PoseFrameRow[] = [];
    let tempoRun: Awaited<ReturnType<typeof runTempoPipeline>> | null = null;
    let trackingFailure: { reason: string; emitted_by: string | null } | null = null;
    // Movement gate — decided from the persisted-format landmark series before
    // any analysis output. No series (pose failed) = cannot confirm movement.
    let movementGate: MovementGateResult = evaluateMovementGate(null);
    // Seconds where the scout pass found the movement (null = not found).
    let scoutCentreSec: number | null = null;

    // Frame rate unknown (container unreadable): the clip is still accepted and
    // saved with fps unknown, but every frame-indexed step needs a real rate,
    // so frame-by-frame analysis cannot run. Never assume one.
    // Unknown rate: still analysed. Seeks use a fixed time grid (not a frame
    // rate); fps stays null everywhere it is recorded, and every metric that
    // needs a frame-density tier refuses on its own.
    const fpsTrue = upload.fps_true;
    const seekHz = fpsTrue ?? UNKNOWN_FPS_SAMPLING_GRID_HZ;
    const runAnalysis = analysisEnabled;
    // Optional on-phone body tracking. Runs only AFTER the report is on
    // screen and can never block, delay or replace it.
    const capturePose = async (probed: ProbedVideoMetadata) => {
      // Silent: this runs after the report, so it never shows a stage.
      const setUploadStage = (_stage: string) => {};
      const seekHz = fpsTrue ?? UNKNOWN_FPS_SAMPLING_GRID_HZ;
      void seekHz;
      // ===== STEP 1 — Dense D-POSE landmark production =====
      // Contiguous native-frame-rate sweep across the movement window (not the
      // 7 AI frames). Produces 2D normalized + world landmarks + per-landmark
      // visibility for every frame in the window. Feeds the existing
      // `runTempoPipeline` (D-3 → D-5 → D-6) untouched.
      try {
        setUploadStage('Finding your body in the clip…');
        const poseStarted = Date.now();
        const checkPoseBudget = () => { if (Date.now() - poseStarted > 45_000) throw new Error("pose_timeout: measurements unavailable; continue coaching"); };
    denseRun = await captureDenseLandmarkSeries({
          videoFile,
          video_sha256_hex: probed.sha256_hex,
          fps_true: fpsTrue,
          duration_sec: probed.duration_sec,
          width: probed.width,
          height: probed.height,
          orientation: probed.orientation,
          landingTimeSec: landingTime ?? null,
          fps_source: fpsTrue == null ? "unknown" : "container",
          fps_playback: probed.fps_playback.status === "ok" ? probed.fps_playback.fps : null,
          onScoutProgress: (d, n) => { checkPoseBudget(); if (d === n) setUploadStage('Tracking your movement…'); },
          onProgress: (d, n) => {
            checkPoseBudget();
            const f = d / n;
            if (d % 10 === 0) console.log('[D-POSE] dense progress', d, n);
            setUploadStage(f < 0.33 ? 'Tracking your movement — just started…' : f < 0.66 ? 'Tracking your movement — about halfway…' : 'Tracking your movement — nearly done…');
          },
        });
        {
          const c = (denseRun.series.header as { scout_motion_centre_frame?: number | null }).scout_motion_centre_frame;
          scoutCentreSec = c != null ? c / seekHz : null;
        }
        movementGate = evaluateMovementGate(denseRun.series);
        // The report card reads the same local deterministic tile code as the
        // server's generated bundle. Never use the AI analysis's legacy metrics.
        if (movementGate.status === "movement" && sideResolution.status === "known") {
          try {
            const side = sideResolution.side;
            const readings = module === "hitting"
              ? {
                  pose: runHittingPoseTiles(denseRun.series, { side }),
                  card: runHittingCardTiles(denseRun.series, { side }),
                  owner: runHittingOwnerTiles(denseRun.series, { side, athlete_height_in: null }),
                  gather: runFrontLegGather(denseRun.series, { side }),
                  rhythm: { active: runActiveStride(denseRun.series, { side }) },
                  coil: runStrideCoil(denseRun.series, { side }),
                }
              : module === "throwing"
                ? runThrowingTiles(denseRun.series, side)
                : module === "pitching" && sport === "softball"
                  ? runSoftballPitchingTiles(denseRun.series, { throwing_side: side })
                  : module === "pitching"
                    ? { tiles: runPitchingTiles(denseRun.series, { throwing_side: side }), card: runPitchingCardTiles(denseRun.series, { throwing_side: side, athlete_height_in: null }) }
                    : null;
            if (readings) setClipTiles({ card: module === "pitching" ? (sport === "softball" ? "pitching_softball_windmill" : "pitching_baseball") : module || "", readings });
          } catch (tileError) {
            // Tile presentation cannot prevent an otherwise valid analysis.
            console.warn("[report-card] clip tiles unavailable", tileError);
            setClipTiles(null);
          }
        }
        console.log('[MOVEMENT-GATE]', movementGate);
        poseRows = denseRun.series.frames.map((f) =>
          densePoseRowToPoseFrameRow(f.frame_index, f.timestamp_seconds, f),
        );
        console.log('[D-POSE] dense capture complete', {
          producer: denseRun.series.header.landmark_model_version,
          fps_true: fpsTrue,
          density_tier: denseRun.density_tier,
          window: denseRun.window,
          frames_processed: denseRun.frames_processed,
          frames_with_pose: denseRun.frames_with_pose,
          frames_dropped: denseRun.frames_dropped,
          mean_visibility: denseRun.mean_visibility,
        });

        // Lift and plant read the SAME foot — the front foot for this clip's
        // established side (gate above guarantees it is known).
        const merged = toStrideFrames(poseRows, frontAnkleIndex(activeSide));
        const derivedDir = deriveDirectionSign(denseRun.series, activeSide);
        // Side-mismatch check (diagnostics). No signal has passed validation yet,
        // so it reports "inconclusive" and never blocks or switches the side.
        const sideCheck = checkDeclaredSide(denseRun.series, activeSide);
        console.log('[SIDE-CHECK]', sideCheck);
        (window as unknown as { __SIDE_CHECK__?: unknown }).__SIDE_CHECK__ = sideCheck;

        tempoRun = await runTempoPipeline({
          video_sha256_hex: probed.sha256_hex,
          // Unknown rate → tempo refuses (invalid fps) rather than guessing.
          fps_true: fpsTrue ?? Number.NaN,
          landing_time_sec: landingTime ?? null,
          // Derived from side + ankle positions; 0 = could not be derived (never guessed).
          direction_sign: derivedDir ?? 0,
          calibration_h_px: probed.height,
          pose_frames: merged,
        });
        console.log('[D-POSE] tempo pipeline result', {
          metric: tempoRun.metric,
          evidence_sha256_hex: tempoRun.evidence.evidence_sha256_hex,
          cache_fingerprint_hex: tempoRun.evidence.cache_fingerprint_hex,
        });

        // Expose for Playwright proof capture without affecting UI behavior.
        (window as unknown as { __DPOSE_LAST_RUN__?: unknown }).__DPOSE_LAST_RUN__ = {
          pose: {
            landmark_producer_version: denseRun.series.header.landmark_model_version,
            frames_processed: denseRun.frames_processed,
            frames_with_pose: denseRun.frames_with_pose,
            frames_dropped: denseRun.frames_dropped,
            mean_visibility: denseRun.mean_visibility,
            density_tier: denseRun.density_tier,
            window: denseRun.window,
            header: denseRun.series.header,
          },
          tempo: tempoRun,
        };
      } catch (poseErr: any) {
        trackingFailure = { reason: poseErr instanceof WindowSelectionFailure ? poseErr.missingness.missing_reason : "pose_inference_failed", emitted_by: poseErr instanceof WindowSelectionFailure ? poseErr.missingness.emitted_by : null };
        // STEP 4 — a window-selection failure is not an inference crash: the
        // scout pass found no athlete anywhere in the clip, so there is no
        // honest window to analyse. Logged with its canonical missingness
        // reason instead of being smoothed into a guessed window.
        if (poseErr instanceof WindowSelectionFailure) {
          if (poseErr.scout.motion_centre_frame != null) scoutCentreSec = poseErr.scout.motion_centre_frame / seekHz;
          console.error('[D-POSE] window selection failed:', {
            missing_reason: poseErr.missingness.missing_reason,
            emitted_by: poseErr.missingness.emitted_by,
            scout: poseErr.scout,
          });
        } else {
          console.error('[D-POSE] pose inference failed:', poseErr);
        }
        // Owner 2026-10-27: body tracking is optional; coaching continues from the
        // frames, so no "couldn't follow" error is shown mid-analysis.
      }
    };

    try {

      // Upload video to storage
      setUploadStage('Uploading your clip…');
    const fileExt = videoFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(fileName, withAnalysisVideoType(videoFile), { contentType: analysisVideoContentType(videoFile) });

      if (uploadError) {
        console.error('[upload] storage upload failed', uploadError);
        toast.error(UPLOAD_ERRORS.storageFailed);
        throw new Error(UPLOAD_ERRORS.storageFailed);
      }


      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(fileName);

      // Generate and upload thumbnail
      let thumbnailUrl: string | null = null;
      try {
        console.log('=== THUMBNAIL GENERATION START ===');
        console.log('Video file:', {
          name: videoFile.name,
          size: videoFile.size,
          type: videoFile.type
        });
        
        const thumbnailBlob = await generateVideoThumbnail(videoFile, 0.1);
        console.log('Thumbnail generated successfully, uploading...');
        
        thumbnailUrl = await uploadVideoThumbnail(thumbnailBlob, user.id, fileName);
        console.log('Thumbnail uploaded successfully:', thumbnailUrl);
        console.log('=== THUMBNAIL GENERATION SUCCESS ===');
      } catch (thumbnailError: any) {
        console.error('=== THUMBNAIL GENERATION FAILED ===');
        console.error('Error details:', thumbnailError);
        console.error('Error message:', thumbnailError.message);
        console.error('Error stack:', thumbnailError.stack);

        // Honest, non-blaming message. Analysis still proceeds without a thumbnail.
        toast.error(
          t(
            'videoAnalysis.thumbnailFailed',
            "Couldn't generate a preview image for this video — the analysis will still run. You can upload a custom cover image later from the session."
          ),
          { duration: 6000 }
        );
      }

      // Create video record with appropriate status — Phase 0 fields populated up front.
      // The row is a hidden temporary record until Save to Players Club; the
      // id is made here because temporary rows can't be read back.
      const newVideoId = crypto.randomUUID();
      const { error: videoError } = await supabase
        .from("videos")
        .insert([{
          id: newVideoId,
          temporary_until: temporaryUploadUntil(),
          user_id: user.id,
          sport: sport as "baseball" | "softball",
          module: module as "hitting" | "pitching" | "throwing",
          video_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          status: runAnalysis ? "uploading" : "completed",
          sha256_hex: upload.sha256_hex,
          fps_true: upload.fps_true,
          duration_sec: upload.duration_sec,
          width: upload.width,
          height: upload.height,
          orientation: upload.orientation,
          // Uploaded footage: we never requested a frame rate, we only measured
          // what the file already had. Stored so analysis can scope its claims.
          capture_source: "upload",
          achieved_fps: upload.fps_true,
          capture_fps_tier: upload.fps_true == null ? null : classifyFps(upload.fps_true),
          capture_fps_source: upload.fps_source === "container" ? "file_container" : "unknown",
          ...(landingTime != null ? { landing_time_sec: landingTime } : {}),

          // Side stamp — the established side for this clip (gate guarantees it
          // when analysis runs). Library-only uploads with no side stay unstamped.
          ...(clipSideKnown
            ? (sideDiscipline === 'hit'
                ? { batting_side: activeSide }
                : { throwing_hand: activeSide })
            : {}),
        }] as never);
      const videoData = videoError ? null : { id: newVideoId };

      if (videoError || !videoData) {
        const failure = describeVideoSaveFailure(videoError as any, { surface: 'analyze-upload', module, userId: user.id });
        toast.error(failure.message, { duration: 12000 });
        throw new Error(failure.message);
      }



      setCurrentVideoId(videoData.id);
      currentVideoIdRef.current = videoData.id;

      const persistEnrichment = async (probed: ProbedVideoMetadata, videoData: { id: string }) => {
      // Phase 51 — persist the full deterministic-tempo lineage chain
      // (landmark_run → event_run → metric_run → analysis_run) so the
      // value (or its canonical missingness reason) is retrievable from
      // `video_metric_runs` after the upload completes. No fabrication:
      // if D-POSE produced no usable anchors, the canonical missingness
      // reason is what gets persisted and rendered.
      setPitchingTilesDet(
        denseRun && module === 'pitching' && sport === 'baseball' && sideResolution.status === 'known'
          ? runPitchingTiles(denseRun.series, { throwing_side: sideResolution.side })
          : null,
      );
      // A failed tempo calculation must not discard a successfully captured series.
      // Unknown FPS remains unknown: the landmark table requires a measured rate.
      if (!tempoRun && (denseRun || trackingFailure) && probed.fps_true != null) {
        try {
          const stored = denseRun ? await writeLandmarkSeries(user.id, videoData.id, denseRun.series) : null;
          const result = await supabase.from("video_landmark_runs").insert({
            video_id: videoData.id,
            landmark_model_id: denseRun?.series.header.landmark_model_id ?? "unavailable",
            landmark_model_version: denseRun?.series.header.landmark_model_version ?? "not_run",
            fps_true: probed.fps_true,
            frame_count: denseRun?.frames_processed ?? 0,
            landmarks_storage_path: stored?.path ?? null,
            landmarks_sha256_hex: stored?.series_sha256_hex ?? probed.sha256_hex,
            mean_visibility: denseRun?.mean_visibility ?? null,
            diagnostics: { tracking_failure: trackingFailure, tempo_status: "not_measured", frames_with_pose: denseRun?.frames_with_pose ?? 0, video_sha256_hex: probed.sha256_hex, hash_source: stored ? "landmark_series" : "video_only_no_landmarks" },
          });
          if (result.error) console.error("[D-POSE] tracking diagnostic save failed:", result.error.message);
        } catch (error) { console.error("[D-POSE] partial tracking persistence failed:", error); }
      }
      if (denseRun && tempoRun) {
        // STEP 1 — persist the FULL landmark series before the lineage row, so
        // `landmarks_storage_path` records a real, readable object key. If the
        // write fails we store null and say why in diagnostics; we never claim
        // a path that does not exist.
        let seriesWrite: Awaited<ReturnType<typeof writeLandmarkSeries>> | null = null;
        let seriesWriteError: string | null = null;
        try {
          seriesWrite = await writeLandmarkSeries(user.id, videoData.id, denseRun.series);
          console.log('[D-POSE] landmark series persisted', seriesWrite);
        } catch (seriesErr: any) {
          seriesWriteError = String(seriesErr?.message ?? seriesErr);
          console.error('[D-POSE] landmark series persistence failed:', seriesErr);
        }

        try {
          const { data: landmarkRow, error: landmarkErr } = await (supabase
            .from("video_landmark_runs")
            .insert([{
              video_id: videoData.id,
              landmark_model_id: denseRun.series.header.landmark_model_id,
              landmark_model_version: denseRun.series.header.landmark_model_version,
              fps_true: denseRun.series.header.fps_true,
              frame_count: denseRun.frames_processed,
              landmarks_storage_path: seriesWrite?.path ?? null,
              landmarks_sha256_hex:
                seriesWrite?.series_sha256_hex ?? tempoRun.evidence.evidence_sha256_hex,
              mean_visibility: denseRun.mean_visibility,
              diagnostics: {
                phase: "step1_dense_capture",
                fps_provenance: fpsProvenance(probed),
                track_diagnosis: diagnoseTrack(denseRun.series),
                camera_view: detectCameraView(denseRun.series),
                // Flat, always-written tracking record so a failed clip can be explained from the row alone.
                tracking: (() => {
                  const h = denseRun.series.header;
                  const td = diagnoseTrack(denseRun.series);
                  const gaps: Record<string, number> = {};
                  for (const f of denseRun.series.frames) if (!f.pose_detected) gaps[f.gap_reason ?? "unknown"] = (gaps[f.gap_reason ?? "unknown"] ?? 0) + 1;
                  return {
                    frames_total: denseRun.frames_processed,
                    frames_locked: h.subject_frames_locked ?? null,
                    frames_lost: h.subject_frames_lost ?? null,
                    subject_reacquisitions: h.subject_reacquisitions ?? null,
                    subject_track_reliable: h.subject_track_reliable ?? null,
                    subject_locked_on_ordinal: h.subject_locked_on_ordinal ?? null,
                    subjects_detected_min: h.subjects_detected_min ?? null,
                    subjects_detected_median: h.subjects_detected_median ?? null,
                    subjects_detected_max: h.subjects_detected_max ?? null,
                    lost_frames_by_reason: gaps,
                    track_failure_cause: td.status === "clean" ? null : (td.causes?.[0]?.kind ?? "undetermined"),
                    movement_gate_status: movementGate.status,
                    movement_score: movementGate.movement_score,
                    movement_gate_reason: movementGate.status === "refused" ? movementGate.reason : null,
                    window_start_sec: h.window_start_sec ?? null,
                    window_end_sec: h.window_end_sec ?? null,
                    scout_motion_centre_frame: h.scout_motion_centre_frame ?? null,
                  };
                })(),
                series_format: denseRun.series.header.format,
                series_bucket: seriesWrite ? "pose-landmarks" : null,
                series_bytes_stored: seriesWrite?.bytes_stored ?? null,
                series_bytes_uncompressed: seriesWrite?.bytes_uncompressed ?? null,
                series_gzipped: seriesWrite?.gzipped ?? null,
                series_write_error: seriesWriteError,
                density_tier: denseRun.density_tier,
                window_rule: denseRun.window.rule,
                window_start_frame: denseRun.window.start_frame,
                window_end_frame: denseRun.window.end_frame,
                frames_with_pose: denseRun.frames_with_pose,
                frames_dropped: denseRun.frames_dropped,
                evidence_sha256_hex: tempoRun.evidence.evidence_sha256_hex,
                cache_fingerprint_hex: tempoRun.evidence.cache_fingerprint_hex,
                tempo_sec: tempoRun.metric.value,
                tempo_missingness: tempoRun.metric.missingness,
                peak_leg_lift_frame_index: tempoRun.evidence.anchors.peak_leg_lift.frame_index,
                front_foot_strike_frame_index: tempoRun.evidence.anchors.front_foot_strike.frame_index,
              },
            }] as never)
            .select("id")
            .single() as unknown as Promise<{ data: { id: string } | null; error: { message: string } | null }>);
          if (landmarkErr || !landmarkRow) {
            console.error('[D-POSE] landmark run persistence failed:', landmarkErr);
          } else {
            console.log('[D-POSE] persisted video_landmark_runs row', landmarkRow.id);

            const detectorVersion = tempoRun.evidence.engine_version.detector;
            const metricEngineVersion = tempoRun.evidence.engine_version.metric_engine;

            const { data: eventRow, error: eventErr } = await (supabase
              .from("video_event_runs")
              .insert([{
                video_id: videoData.id,
                landmark_run_id: landmarkRow.id,
                detector_version: detectorVersion,
                events_jsonb: {
                  peak_leg_lift: tempoRun.evidence.anchors.peak_leg_lift,
                  front_foot_strike: tempoRun.evidence.anchors.front_foot_strike,
                },
                events_sha256_hex: tempoRun.evidence.evidence_sha256_hex,
              }] as never)
              .select("id")
              .single() as unknown as Promise<{ data: { id: string } | null; error: { message: string } | null }>);

            if (eventErr || !eventRow) {
              console.error('[TEMPO] event run persistence failed:', eventErr);
            } else {
              const { data: metricRow, error: metricErr } = await (supabase
                .from("video_metric_runs")
                .insert([{
                  video_id: videoData.id,
                  landmark_run_id: landmarkRow.id,
                  event_run_id: eventRow.id,
                  metric_engine_version: metricEngineVersion,
                  metrics_jsonb: {
                    tempo_sec: {
                      value: tempoRun.metric.value,
                      missingness: tempoRun.metric.missingness,
                    },
                    evidence_sha256_hex: tempoRun.evidence.evidence_sha256_hex,
                    cache_fingerprint_hex: tempoRun.evidence.cache_fingerprint_hex,
                  },
                  metrics_sha256_hex: tempoRun.evidence.evidence_sha256_hex,
                }] as never)
                .select("id")
                .single() as unknown as Promise<{ data: { id: string } | null; error: { message: string } | null }>);

              if (metricErr || !metricRow) {
                console.error('[TEMPO] metric run persistence failed:', metricErr);
              } else {
                console.log('[TEMPO] persisted video_metric_runs row', metricRow.id);

                const { error: analysisErr } = await (supabase
                  .from("video_analysis_runs")
                  .insert([{
                    video_id: videoData.id,
                    requested_by: user.id,
                    cache_fingerprint_hex: tempoRun.evidence.cache_fingerprint_hex,
                    cache_hit: false,
                    video_sha256_hex: probed.sha256_hex,
                    landmark_model_version: denseRun.series.header.landmark_model_version,
                    detector_version: detectorVersion,
                    metric_engine_version: metricEngineVersion,
                    fps_true: denseRun.series.header.fps_true,
                    landmark_run_id: landmarkRow.id,
                    event_run_id: eventRow.id,
                    metric_run_id: metricRow.id,
                    outcome: "ok",
                  }] as never) as unknown as Promise<{ error: { message: string } | null }>);
                if (analysisErr) {
                  console.error('[TEMPO] analysis run persistence failed:', analysisErr);
                }

                // Read-back from canonical table (no client state shortcut).
                const { data: readback } = await (supabase
                  .from("video_metric_runs")
                  .select("metrics_jsonb")
                  .eq("id", metricRow.id)
                  .single() as unknown as Promise<{ data: { metrics_jsonb: { tempo_sec?: { value: number | null; missingness?: { missing_reason?: string } }; evidence_sha256_hex?: string } } | null }>);
                const m = readback?.metrics_jsonb?.tempo_sec;
                setPersistedTempo({
                  value: m?.value ?? null,
                  missing_reason: m?.missingness?.missing_reason ?? null,
                  evidence_sha256_hex: readback?.metrics_jsonb?.evidence_sha256_hex ?? tempoRun.evidence.evidence_sha256_hex,
                });
              }
            }
          }
        } catch (e) {
          console.error('[TEMPO] persistence chain threw:', e);
        }
      }
      };
      // Optional enrichment after the report: never awaited by the report.
      const savedClip = { id: videoData.id };
      const runEnrichment = () => {
        if (!analysisEnabled || !probed) return;
        void (async () => {
          try { await capturePose(probed); await persistEnrichment(probed, savedClip); }
          catch (enrichError) { console.warn('[analysis] optional enrichment skipped', enrichError); }
        })();
      };

      // Branch based on analysis toggle
      if (!runAnalysis) {
        // No analysis - just upload and prompt to save to library
        if (analysisEnabled) {
          toast.info("Your clip is uploaded. Tap Save to Players Club to keep it.");
        } else {
          toast.success(t('videoAnalysis.uploadSuccess', "Video uploaded successfully!"));
        }
        setUploading(false);
        
        // Automatically open save to library dialog
        setSaveDialogOpen(true);
        return;
      }

      // The movement gate governs pose-measured report-card tiles ONLY (applied
      // above, before any tile runs). It never blocks the analysis: coaching,
      // faults and drills do not come from pose (owner ruling 2026-10-01).

      toast.success(t('videoAnalysis.uploadedStartingAnalysis', "Video uploaded! Starting analysis..."));
      setUploading(false);
      setAnalyzing(true);

      const frames = (await classicFramesRef.current?.catch(() => [])) ?? [];
      console.log(`[ANALYSIS] original picture sampling: ${frames.length} pictures`);
      // Call AI analysis edge function with frames for multimodal analysis
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-video",
        {
          headers: { Authorization: `Bearer ${liveSession.access_token}` },
          body: {
            videoId: videoData.id,
            module,
            sport,
            userId: user.id,
            language: i18n.language,
            frames,
            ...(landingTime != null && frames.length > 0 ? { landingFrameIndex: 3 } : {}),
          },
        }
      );

      if (analysisError) {
        const safeError = await analysisErrorDetails(analysisError);
        // The server may have saved coaching even though this reply failed.
        const recovered = await settleAnalysisReport(supabase, videoData.id, user.id, safeError.report ?? null);
        if (recovered && hasCoachingContent(recovered)) {
          setAnalysis(recovered); setAnalysisError(null); setAnalyzing(false);
          toast.success(t('videoAnalysis.analysisComplete', "Analysis complete!"));
          return;
        }
        // Plain retry only; the hourly fair-use limit keeps its own wording.
        setAnalysis(null);
        setAnalysisError({ status: safeError.status, message: safeError.status === 429 ? safeError.message : ANALYSIS_DID_NOT_FINISH, terminal: false });
        setAnalyzing(false);
        return;

      }

      const normalized = await settleAnalysisReport(supabase, videoData.id, user.id, normalizeAnalysisResponse(analysisData));
      if (!hasCoachingContent(normalized)) { showRetryScreen(); return; }
      setAnalysis(normalized);
      setAnalysisError(null);
      // Extras after the report is on screen must never take it away.
      try {
        assessment?.onSaved?.(normalized);
        void queryClient.invalidateQueries({ queryKey: ["back-leg-finding", user?.id, videoData.id] });
        void queryClient.invalidateQueries({ queryKey: ["cross-domain-faults", user?.id] });
        fireAnalysisVideoMoment(normalized);
      } catch (extraError) { console.warn("[analysis] post-report extra failed", extraError); }
      runEnrichment();

      toast.success(t('videoAnalysis.analysisComplete', "Analysis complete!"));
      setAnalyzing(false);

    } catch (error: any) {
      console.error("Error:", error);
      const savedId = currentVideoIdRef.current;
      const recovered = savedId ? await settleAnalysisReport(supabase, savedId, user.id, null) : null;
      if (recovered && hasCoachingContent(recovered)) {
        setAnalysis(recovered); setAnalysisError(null); setAnalyzing(false);
        return;
      }
      // An upload/network failure is not an analysis: show the problem and a retry, never a blanket report.
      // An upload problem is told once in a toast; the screen shows only Retry.
      if (!error?.userNotified) toast.error(friendlyThrownError(error));
      showRetryScreen();
    } finally {
      setUploading(false);
      setUploadStage(null);
      setExtractingFrames(false);
    }
  };

  /** Pop the post-analysis video moment with whatever the analysis surfaced. */
  const fireAnalysisVideoMoment = (data: any) => {
    const skillDomain = moduleToSkillDomain(module || "");
    if (!skillDomain) return;
    // Taxonomy keys derived from the structured feedback (fault flags +
    // scorecard areas), including the corrections being prescribed.
    const signals = analysisFeedbackToTaxonomy(
      data,
      skillDomain,
      sport === "softball" ? "softball" : "baseball",
    );
    emitVideoMoment({
      kind: "analysis_complete",
      skillDomain,
      movementPatterns: signals.movementPatterns,
      sport: (sport === "softball" ? "softball" : "baseball"),
      side: requiresSideConfirmation ? (activeSide as any) : null,
      label: "Video analysis",
      sourceId: currentVideoId,
    });
  };

  const handleRetryAnalysis = async () => {
    if (!currentVideoId || !user || !isAnalysisType(module)) return;
    
    // Retry re-samples the original pictures when the clip is still on the phone.
    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const frames = videoFile ? await extractClassicKeyFrames(videoFile, landingTime).catch(() => []) : [];
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
        "analyze-video",
        {
          body: {
            videoId: currentVideoId,
            module,
            sport,
            userId: user.id,
            language: i18n.language,
            frames,
            ...(landingTime != null && frames.length > 0 ? { landingFrameIndex: 3 } : {}),
          },
        }
      );

      if (analysisError) {
        console.error("Retry analysis error:", analysisError);
        const safeError = await analysisErrorDetails(analysisError);
        const recovered = await settleAnalysisReport(supabase, currentVideoId, user.id, safeError.report ?? null);
        if (recovered && hasCoachingContent(recovered)) { setAnalysis(recovered); setAnalysisError(null); return; }
        setAnalysis(null);
        setAnalysisError({ status: safeError.status, message: safeError.status === 429 ? safeError.message : ANALYSIS_DID_NOT_FINISH, terminal: false });
        return;

      }

      const normalizedRetry = await settleAnalysisReport(supabase, currentVideoId, user.id, normalizeAnalysisResponse(analysisData));
      if (!hasCoachingContent(normalizedRetry)) { showRetryScreen(); return; }
      setAnalysis(normalizedRetry);
      setAnalysisError(null);
      assessment?.onSaved?.(normalizedRetry);
      void queryClient.invalidateQueries({ queryKey: ["back-leg-finding", user?.id, currentVideoId] });
      void queryClient.invalidateQueries({ queryKey: ["cross-domain-faults", user?.id] });
      fireAnalysisVideoMoment(normalizedRetry);

      toast.success(t('videoAnalysis.analysisComplete', "Analysis complete!"));
    } catch (error: any) {
      console.error("Retry error:", error);
      const recovered = await settleAnalysisReport(supabase, currentVideoId, user.id, null);
      if (recovered && hasCoachingContent(recovered)) { setAnalysis(recovered); return; }
      showRetryScreen();
    } finally {
      setAnalyzing(false);
      setExtractingFrames(false);
    }
  };

  if (authLoading || subLoading || !initialized)  return <HMLoadingFallback />;
  const Layout = assessment ? Fragment : DashboardLayout;
  if (!isAnalysisType(module)) return <Layout><p className="py-8 text-lg">This analysis is coming soon</p></Layout>;

  return (
    <Layout>
      <div
        className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full analysis-zoomable"
        data-protected-editing="true"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold capitalize">{module} {t('videoAnalysis.analysis')}</h1>
            <p className="text-sm sm:text-base text-muted-foreground capitalize">{t('videoAnalysis.mechanicsEvaluation', { sport, module, defaultValue: '{{sport}} - {{module}} mechanics evaluation' })}</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {videoPreview && (
              <Button variant="outline" size="sm" onClick={handleRemoveVideo} className="flex-1 sm:flex-initial">
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('videoAnalysis.deleteVideo')}</span>
              </Button>
            )}
            {!assessment && <Button variant="outline" size="sm" onClick={goBack} className="flex-1 sm:flex-initial">
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('videoAnalysis.back')}</span>
            </Button>}
          </div>
        </div>

        {/* Analysis is upload-only: one clip, deeply analysed. Live recording
            lives in DelayCam. */}
        <SavedMovementSummary />
        {!videoPreview && !analysis && (
          <div className="space-y-4">
            {assessment && <HighFpsCapture module={assessment.module} sport={assessment.sport} onAnalysis={(report, videoId) => { const normalized = normalizeAnalysisResponse(report); setCurrentVideoId(videoId); setAnalysis(normalized); setAnalysisError(null); assessment.onSaved?.(normalized); }} />}
            <PitchingFilmingGuide />
            <Card data-tour="upload" className="mx-auto max-w-xl p-6 sm:p-8 text-center border-dashed border-2">
              <div className="flex flex-col items-center space-y-3">
                <div className="p-3 sm:p-4 rounded-full bg-primary/10">
                  <Upload className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold">{t('videoAnalysis.uploadYourVideo')}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
                  {t('videoAnalysis.uploadOnlyDescription', {
                    module,
                    defaultValue: 'Choose one clip of your {{module}} from your phone or camera roll. Hammer analyzes it frame by frame for mechanics feedback and drills.',
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('videoAnalysis.maxFileSize')}
                </p>
                <label htmlFor="video-upload">
                  <Button asChild size="sm">
                    <span>
                      <Video className="h-4 w-4 mr-2" />
                      {t('videoAnalysis.selectVideo')}
                    </span>
                  </Button>
                </label>
                <input
                  id="video-upload"
                  type="file"
                  accept="video/*,.mov,.mp4,.m4v,.avi,.webm,.mkv,.3gp"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={preparingVideo}
                />
                {preparingVideo && <p role="status" className="text-sm text-muted-foreground">
                  {conversionProgress == null ? "Reading your clip…" : `Preparing your clip… ${conversionProgress}%`}
                </p>}
              </div>
            </Card>
            <div className="mx-auto w-full max-w-xl">
              <div data-tour="analysis-report"><UploadAnalysisReport /></div>
            </div>
          </div>
        )}

        {/* Video Preview & Analysis */}
        {(videoPreview || analysis) && (
          <div className="space-y-6">
            {videoPreview && <Card className="p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                  <h3 className="text-base sm:text-lg font-semibold">{t('videoAnalysis.videoPreview')}</h3>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{t('videoAnalysis.speed')}</span>
                    <Select value={playbackRate} onValueChange={handlePlaybackRateChange}>
                      <SelectTrigger className="w-20 sm:w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.25">0.25x</SelectItem>
                        <SelectItem value="0.5">0.5x</SelectItem>
                        <SelectItem value="0.75">0.75x</SelectItem>
                        <SelectItem value="1">1.0x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <ClipPreflightCard verdict={preflight} checking={preflightChecking} />

                {/* File metadata and analysis context */}
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium capitalize">{sport} - {module} {t('videoAnalysis.analysis')}</p>
                      {videoFile && (
                        <p className="text-muted-foreground text-xs">
                          {videoFile.name} • {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      )}
                    </div>
                  </div>
                </div>


                {/* Side is asked exactly once, in the confirmation card below.
                    Do not add a second side control on this screen. */}


                {/* Landing Marker for Pitching/Throwing */}
                {analysisEnabled && (module === 'pitching' || module === 'throwing') && (
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-dashed">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        {t('videoAnalysis.markLanding', 'Mark Landing Moment')}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {landingTime != null 
                          ? t('videoAnalysis.landingMarked', `Landing marked at ${landingTime.toFixed(2)}s`)
                          : t('videoAnalysis.landingHint', 'Optional: Pause at front foot landing, then click "Mark Landing"')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {landingTime != null && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setLandingTime(null)}
                          className="text-muted-foreground"
                        >
                          {t('common.clear', 'Clear')}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <EnhancedVideoPlayer
                  videoSrc={videoPreview}
                  playbackRate={parseFloat(playbackRate)}
                  onMarkLanding={analysisEnabled && (module === 'pitching' || module === 'throwing') ? setLandingTime : undefined}
                  landingTime={landingTime}
                />
              </div>
            </Card>}

            {analysisEnabled && videoFile && !analysis && !analyzing && !sideLoading && (
              <Card className={cn(
                "p-3 sm:p-4 border",
                clipSideKnown ? "border-primary/40 bg-primary/5" : "border-warning/60 bg-warning/5",
              )}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {sideResolution.status === 'known'
                        ? `Filing this clip under ${activeSide === 'L' ? 'Left' : 'Right'} ${sideWord}${sideResolution.source === 'profile' ? ' — from your profile.' : ' for this clip.'}`
                        : sideResolution.case === 'switch'
                          ? (sideDiscipline === 'hit'
                              ? 'Which side are you hitting from in this video?'
                              : 'Which hand are you throwing with in this video?')
                          : (sideDiscipline === 'hit'
                              ? "We don't have your batting side yet. Which side do you hit from?"
                              : "We don't have your throwing hand yet. Which hand do you throw with?")}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {sideResolution.status === 'known'
                        ? 'This decides which foot is your front foot. If this video is from the other side, change it for this clip.'
                        : sideResolution.case === 'switch'
                          ? 'Required — it decides which foot is your front foot.'
                          : "We'll save it to your profile so you're only asked once."}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {sideResolution.status === 'known' && !showSideOverride && sideResolution.source === 'profile' ? (
                      <Button size="sm" variant="ghost" onClick={() => setShowSideOverride(true)}>
                        Change for this clip
                      </Button>
                    ) : (
                      (['L', 'R'] as const).map((sd) => (
                        <Button
                          key={sd}
                          size="sm"
                          disabled={savingProfileSide}
                          variant={clipSideKnown && activeSide === sd ? 'default' : 'outline'}
                          onClick={() => void chooseClipSide(sd)}
                        >
                          {sd === 'L' ? 'Left' : 'Right'}
                        </Button>
                      ))
                    )}
                  </div>
                </div>
              </Card>
            )}

            {!analyzing && !analysis && (
              <Button
                onClick={handleUploadAndAnalyze}
                disabled={preparingVideo || uploading || extractingFrames || savingProfileSide || (analysisEnabled && !clipSideKnown)}
                size="lg"
                className="w-full"
              >
                {extractingFrames ? (
                  t('videoAnalysis.extractingFrames', "Extracting frames...")
                ) : uploading ? (
                  uploadStage ?? t('videoAnalysis.uploading')
                ) : analysisEnabled ? (
                  <>
                    <Upload className="h-4 w-4 sm:mr-2" />
                    <span className="hidden xs:inline">{t('videoAnalysis.uploadAndAnalyze')}</span>
                    <span className="xs:hidden">{t('videoAnalysis.uploadAndAnalyze')}</span>
                  </>
                ) : (
                  <>
                    <BookMarked className="h-4 w-4 sm:mr-2" />
                    <span className="hidden xs:inline">{t('videoAnalysis.uploadToLibrary')}</span>
                    <span className="xs:hidden">{t('videoAnalysis.uploadToLibrary')}</span>
                  </>
                )}
              </Button>
            )}

            {/* Non-analyzed upload success message */}
            {currentVideoId && !analysisEnabled && !analyzing && !analysis && !uploading && (
              <Card className="p-4 sm:p-6 border-primary">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookMarked className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{t('videoAnalysis.videoUploaded')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('videoAnalysis.uploadedWithoutAnalysis')}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground">
                    {t('videoAnalysis.readyToSave')}
                  </p>
                  
                  <div className="flex flex-col xs:flex-row gap-2 max-w-full overflow-x-hidden">
                    <Button onClick={() => setSaveDialogOpen(true)} className="w-full xs:flex-1">
                      <BookMarked className="h-4 w-4 sm:mr-2" />
                      <span className="hidden xs:inline">{t('videoAnalysis.saveToLibrary')}</span>
                      <span className="xs:hidden">{t('videoAnalysis.saveToLibrary')}</span>
                    </Button>
                    <Button onClick={() => assessment ? assessment.onDone() : navigate('/dashboard')} variant="outline" className="w-full xs:flex-1">
                      <Home className="h-4 w-4 xs:hidden" />
                      <span className="hidden xs:inline">{t('videoAnalysis.returnToDashboard')}</span>
                      <span className="xs:hidden">{t('navigation.dashboard')}</span>
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {(analyzing || extractingFrames) && (
              <div className="space-y-4">
                <AnalysisProgressIndicator
                  module={module}
                  stageLabel={
                    extractingFrames
                      ? t('videoAnalysis.extractingFrames', 'Extracting key frames for analysis…')
                      : t('videoAnalysis.analyzing', 'Analyzing your video')
                  }
                />

                <AnalysisResultSkeleton />
              </div>
            )}



            {analysisError && !analyzing && (
              <Card className="p-6 space-y-4" data-testid="analysis-retry">
                <p className="text-base font-medium">{analysisError.status === 429 && analysisError.message ? analysisError.message : ANALYSIS_DID_NOT_FINISH}</p>
                <Button onClick={currentVideoId ? handleRetryAnalysis : handleUploadAndAnalyze} disabled={uploading || analyzing} className="w-full">
                  {t('videoAnalysis.retryAnalysis')}
                </Button>
              </Card>
            )}

            {analysis && (
              <div className="space-y-4">
                {showReportCard ? (
                  <div className="space-y-1">{!videoGradesShown() && <InternalLabel />}<AnalysisToggle value={analysisView} onChange={setAnalysisView} /></div>
                ) : null}

                {showReportCard && analysisView === "report_card" ? (
                  <ReportCardAccessGate>
                    <HammerReportCard
                      sport={sport}
                      module={module}
                      analysis={{
                        deterministic_clip_tiles: clipTiles,
                      } as never}
                      measuredOnly
                      showShare={false}
                    />
                  </ReportCardAccessGate>
                ) : (
                  <>
                    {module === "hitting" && <BackLegFinding videoId={currentVideoId} />}
                  <AnalysisResultsPanel
                    analysis={analysis}
                    moduleKey={module || 'hitting'}
                    persistedTempo={persistedTempo}
                    savedDrillIds={savedDrillIds}
                    onSaveDrill={handleSaveDrill}
                    onSaveToLibrary={() => setSaveDialogOpen(true)}
                    onReturnToDashboard={() => assessment ? assessment.onDone() : navigate('/dashboard')}
                    hideGeneratedDrills={matchPrescriptionDrills({
                      faultKeys: (analysis.improvements ?? []).map((i) => i.fault_key ?? "").filter(Boolean),
                      violations: analysis.violations_detected ?? null,
                      module, sport,
                      includePendingReview: isOwner || isAdmin,
                    }).length > 0}
                    prescriptionExtra={
                      <AnalysisPrescriptionSection
                        embedded
                        module={module}
                        sport={sport}
                        violations={analysis.violations_detected ?? null}
                        faultKeys={(analysis.improvements ?? []).map((i) => i.fault_key ?? "").filter(Boolean)}
                        includePendingReview={isOwner || isAdmin}
                        historyKey={currentVideoId}
                      />
                    }
                     recommendations={
                       <AnalysisVideoRecommendations
                         analysis={analysis}
                         module={module}
                         sport={sport}
                         persistenceError={(analysis as { fault_persistence?: { error?: string | null } })?.fault_persistence?.error ?? null}
                       />
                     }
                  />
                  </>
                )}





              </div>
            )}

          </div>
        )}



      </div>


      {/* Save to Library Dialog */}
      {currentVideoId && (
        <SaveToLibraryDialog
          open={saveDialogOpen}
          onClose={() => setSaveDialogOpen(false)}
          videoId={currentVideoId}
          sport={sport}
          module={module || ''}
          requireAnalysis
        />
      )}
    </Layout>
  );
}
