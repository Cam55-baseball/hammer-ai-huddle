import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ConfettiEffect } from '@/components/bounce-back-bay/ConfettiEffect';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Lock,
  BookOpen,
  Moon,
  Sun,
  Dumbbell,
  NotebookPen,
  CheckCircle,
  Clock,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import { useVault } from '@/hooks/useVault';
import { useSubscription } from '@/hooks/useSubscription';
import { 
  parseVaultParams, 
  scrollToVaultSection, 
  getTabForSection,
  shouldAutoOpen,
  type VaultSection 
} from '@/utils/vaultNavigation';
import { useRecapCountdown } from '@/hooks/useRecapCountdown';
import { VaultStreakRecapCard } from '@/components/vault/VaultStreakRecapCard';

import { VaultFocusQuizDialog } from '@/components/vault/VaultFocusQuizDialog';
import { VaultNutritionLogCard } from '@/components/vault/VaultNutritionLogCard';
import { VaultSavedItemsCard } from '@/components/vault/VaultSavedItemsCard';
import { VaultPerformanceTestCard } from '@/components/vault/VaultPerformanceTestCard';
import { VaultProgressPhotosCard } from '@/components/vault/VaultProgressPhotosCard';
import { VaultScoutGradesCard } from '@/components/vault/VaultScoutGradesCard';
// VaultRecapCard removed - merged into VaultStreakRecapCard
import { VaultHistoryTab } from '@/components/vault/VaultHistoryTab';
import { VaultWeeklySummary } from '@/components/vault/VaultWeeklySummary';
import { VaultNutritionWeeklySummary } from '@/components/vault/VaultNutritionWeeklySummary';
import { VaultDisciplineTrendCard } from '@/components/vault/VaultDisciplineTrendCard';
import { VaultMentalWellnessTrendCard } from '@/components/vault/VaultMentalWellnessTrendCard';
import { VaultCorrelationAnalysisCard } from '@/components/vault/VaultCorrelationAnalysisCard';
import { VaultWellnessGoalsCard, checkWellnessGoalsAndNotify } from '@/components/vault/VaultWellnessGoalsCard';
import { VaultTexVisionCard } from '@/components/vault/VaultTexVisionCard';

import { useAuth } from '@/hooks/useAuth';

export default function Vault() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    loading,
    streak,
    todaysQuizzes,
    todaysNotes,
    workoutNotes,
    nutritionLogs,
    nutritionGoals,
    savedDrills,
    savedTips,
    performanceTests,
    progressPhotos,
    scoutGrades,
    pitchingGrades,
    recaps,
    entriesWithData,
    favoriteMeals,
    supplementTracking,
    saveFocusQuiz,
    saveFreeNote,
    saveNutritionLog,
    saveNutritionGoals,
    toggleSupplementTaken,
    deleteSavedDrill,
    deleteSavedTip,
    savePerformanceTest,
    saveProgressPhoto,
    saveScoutGrade,
    generateRecap,
    fetchHistoryForDate,
    checkVaultAccess,
    deleteQuiz,
    deleteFreeNote,
    deleteWorkoutNote,
    deleteNutritionLog,
    deletePerformanceTest,
    deleteProgressPhoto,
    deleteScoutGrade,
    fetchWeeklyData,
    fetchWeeklyNutrition,
    saveFavoriteMeal,
    deleteFavoriteMeal,
    useFavoriteMeal,
  } = useVault();

  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState('today');
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [selectedQuizType, setSelectedQuizType] = useState<'pre_lift' | 'night' | 'morning'>('pre_lift');
  const [freeNote, setFreeNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [userSport, setUserSport] = useState<'baseball' | 'softball'>('baseball');
  const { modules: subscribedModules } = useSubscription();
  
  // Use shared recap countdown hook
  const { daysUntilRecap, recapProgress, canGenerateRecap: canGenRecap } = useRecapCountdown();
  
  // Centralized ref map for vault sections
  const sectionRefs = useMemo(() => ({
    'performance-tests': useRef<HTMLDivElement>(null),
    'progress-photos': useRef<HTMLDivElement>(null),
    'scout-grades': useRef<HTMLDivElement>(null),
    'pitching-grades': useRef<HTMLDivElement>(null),
    'nutrition': useRef<HTMLDivElement>(null),
    'wellness-goals': useRef<HTMLDivElement>(null),
    'saved-items': useRef<HTMLDivElement>(null),
  }), []);
  
  // Detect module access for grader display
  const hasHittingModule = subscribedModules.some(m => m.includes('hitting'));
  const hasThrowingModule = subscribedModules.some(m => m.includes('throwing'));
  const hasPitchingModule = subscribedModules.some(m => m.includes('pitching'));
  const showHittingThrowingGrader = hasHittingModule || hasThrowingModule;
  const showPitchingGrader = hasPitchingModule;

  // State for auto-opening sections from URL
  const [autoOpenSection, setAutoOpenSection] = useState<VaultSection | null>(null);

  // Handle URL params for direct navigation using centralized utility
  useEffect(() => {
    const { section, quiz } = parseVaultParams(searchParams);
    
    // Handle quiz dialog opening
    if (quiz) {
      setSelectedQuizType(quiz);
      setQuizDialogOpen(true);
      // Clear the param
      searchParams.delete('openQuiz');
      setSearchParams(searchParams, { replace: true });
    }
    
    // Handle section navigation
    if (section) {
      // Switch to the correct tab for this section
      const targetTab = getTabForSection(section);
      setActiveTab(targetTab);
      
      // Set auto-open state if section should expand
      if (shouldAutoOpen(section)) {
        setAutoOpenSection(section);
      }
      
      // Scroll to section using centralized utility
      scrollToVaultSection(
        sectionRefs,
        section,
        () => {
          // Clear params after successful scroll
          searchParams.delete('openSection');
          setSearchParams(searchParams, { replace: true });
        }
      );
    }
  }, [searchParams, setSearchParams, sectionRefs]);

  // Check if all 3 daily quizzes are completed
  const allQuizzesCompleted = useCallback(() => {
    return todaysQuizzes.some(q => q.quiz_type === 'morning') &&
           todaysQuizzes.some(q => q.quiz_type === 'pre_lift') &&
           todaysQuizzes.some(q => q.quiz_type === 'night');
  }, [todaysQuizzes]);

  // Check access and detect sport
  useEffect(() => {
    const checkAccess = async () => {
      const access = await checkVaultAccess();
      setHasAccess(access);
      
      // Detect sport from localStorage or subscribed modules
      const storedSport = localStorage.getItem('selectedSport');
      if (storedSport === 'softball' || storedSport === 'baseball') {
        setUserSport(storedSport);
      }
    };
    checkAccess();
  }, [checkVaultAccess]);


  // Legacy functions removed - using shared useRecapCountdown hook instead

  const hasCompletedQuiz = (type: string) => {
    return todaysQuizzes.some(q => q.quiz_type === type);
  };

  const openQuizDialog = (type: 'pre_lift' | 'night' | 'morning') => {
    setSelectedQuizType(type);
    setQuizDialogOpen(true);
  };

  const handleSaveFreeNote = async () => {
    if (!freeNote.trim()) return;
    setSavingNote(true);
    const result = await saveFreeNote(freeNote);
    setSavingNote(false);
    if (result.success) {
      toast.success(t('vault.freeNote.saved'));
      setFreeNote('');
    } else {
      toast.error(t('vault.freeNote.error'));
    }
  };

  const handleQuizSubmit = async (data: any) => {
    const quizzesBeforeSave = todaysQuizzes.length;
    const result = await saveFocusQuiz(selectedQuizType, data);
    if (result.success) {
      toast.success(t('vault.quiz.saved'));
      
      // Check wellness goals and notify if off track (only for morning quiz)
      if (selectedQuizType === 'morning' && user) {
        setTimeout(() => {
          checkWellnessGoalsAndNotify(user.id, t);
        }, 1000);
      }
      
      // Check if this completes all 3 quizzes (was 2 before, now 3)
      if (quizzesBeforeSave === 2) {
        setTimeout(() => {
          setShowConfetti(true);
          toast.success(t('vault.quiz.allCompleted'), {
            icon: '🎉',
            duration: 5000,
          });
          setTimeout(() => setShowConfetti(false), 4000);
        }, 300);
      }
    } else {
      toast.error(t('vault.quiz.error'));
    }
    return result;
  };

  const handleSaveNutrition = async (data: any) => {
    const result = await saveNutritionLog(data);
    if (result.success) {
      toast.success(t('vault.nutrition.saved'));
    } else {
      toast.error(t('vault.nutrition.error'));
    }
    return result;
  };

  const handleSavePerformanceTest = async (testType: string, results: Record<string, number>) => {
    const result = await savePerformanceTest(testType, results);
    if (result.success) {
      toast.success(t('vault.performance.saved'));
    } else {
      toast.error(t('vault.performance.error'));
    }
    return result;
  };

  const handleSaveProgressPhoto = async (data: any) => {
    const result = await saveProgressPhoto(data);
    if (result.success) {
      toast.success(t('vault.photos.saved'));
    } else {
      toast.error(t('vault.photos.error'));
    }
    return result;
  };

  const handleSaveScoutGrade = async (data: any) => {
    const result = await saveScoutGrade(data);
    if (result.success) {
      toast.success(t('vault.scoutGrades.saved'));
    } else {
      toast.error(t('vault.scoutGrades.error'));
    }
    return result;
  };

  const handleGenerateRecap = async () => {
    const result = await generateRecap();
    if (result.success) {
      toast.success(t('vault.recap.generated'));
    } else {
      toast.error(t('vault.recap.error'));
    }
    return result;
  };

  // Loading state
  if (loading || hasAccess === null) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">
              {t('common.loading')}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Locked state
  if (!hasAccess) {
  return (
    <DashboardLayout>
      {showConfetti && <ConfettiEffect particleCount={80} duration={4000} />}
      <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
          <div className="space-y-6">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-background p-6 sm:p-8 border border-primary/20">
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl" />
              <div className="relative z-10 text-center space-y-4">
                <div className="inline-flex p-4 rounded-full bg-primary/10 border border-primary/20">
                  <Lock className="h-12 w-12 text-primary" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black">{t('vault.title')}</h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {t('vault.locked.description')}
                </p>
                <Button 
                  onClick={() => {
                    const sport = localStorage.getItem('selectedSport') || 'baseball';
                    const role = localStorage.getItem('selectedRole') || localStorage.getItem('userRole') || 'player';
                    navigate('/select-modules', { state: { sport, role } });
                  }} 
                  size="lg" 
                  className="mt-4"
                >
                  {t('vault.locked.unlockButton')}
                </Button>
              </div>
            </div>

          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
        <div className="space-y-6">
          {/* Hero Header */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-background p-6 sm:p-8 border border-primary/20">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                <h1 className="text-3xl sm:text-4xl font-black">{t('vault.title')}</h1>
              </div>
              <p className="text-muted-foreground max-w-md">
                {t('vault.subtitle')}
              </p>
            </div>
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Streak & Quizzes */}
            <div className="space-y-6">
              <VaultStreakRecapCard 
                streak={streak} 
                recaps={recaps}
                canGenerateRecap={canGenRecap}
                daysUntilNextRecap={daysUntilRecap}
                recapProgress={recapProgress}
                onGenerateRecap={handleGenerateRecap}
                isLoading={loading}
              />

              {/* Weekly Trend Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <VaultDisciplineTrendCard isLoading={loading} />
                <VaultMentalWellnessTrendCard isLoading={loading} />
              </div>

              {/* Correlation Analysis & Wellness Goals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <VaultCorrelationAnalysisCard />
                <VaultWellnessGoalsCard />
              </div>

              {/* Daily Check-In Container */}
              <div className="rounded-xl border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-background p-4 sm:p-6 space-y-4">
                {/* Section Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-emerald-500/20">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Sparkles className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{t('vault.dailyCheckIn.title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('vault.dailyCheckIn.description')}</p>
                  </div>
                </div>

                {/* Daily Focus Quizzes */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      {t('vault.quiz.title')}
                    </CardTitle>
                    <CardDescription>
                      {t('vault.quiz.todayStatus')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Quiz Completion Status Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Morning Status */}
                      <div 
                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                          hasCompletedQuiz('morning') 
                            ? 'bg-green-500/10 border-green-500' 
                            : 'bg-muted/50 border-border'
                        }`}
                      >
                        <Sun className={`h-5 w-5 ${hasCompletedQuiz('morning') ? 'text-amber-500' : 'text-muted-foreground'}`} />
                        <span className="text-xs mt-1 font-medium">{t('vault.quiz.morningLabel')}</span>
                        {hasCompletedQuiz('morning') ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground mt-1">{t('vault.quiz.pending')}</span>
                        )}
                      </div>

                      {/* Pre-Lift Status */}
                      <div 
                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                          hasCompletedQuiz('pre_lift') 
                            ? 'bg-green-500/10 border-green-500' 
                            : 'bg-muted/50 border-border'
                        }`}
                      >
                        <Dumbbell className={`h-5 w-5 ${hasCompletedQuiz('pre_lift') ? 'text-orange-500' : 'text-muted-foreground'}`} />
                        <span className="text-xs mt-1 font-medium">{t('vault.quiz.preLift')}</span>
                        {hasCompletedQuiz('pre_lift') ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground mt-1">{t('vault.quiz.pending')}</span>
                        )}
                      </div>

                      {/* Night Status */}
                      <div 
                        className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                          hasCompletedQuiz('night') 
                            ? 'bg-green-500/10 border-green-500' 
                            : 'bg-muted/50 border-border'
                        }`}
                      >
                        <Moon className={`h-5 w-5 ${hasCompletedQuiz('night') ? 'text-indigo-500' : 'text-muted-foreground'}`} />
                        <span className="text-xs mt-1 font-medium">{t('vault.quiz.nightLabel')}</span>
                        {hasCompletedQuiz('night') ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground mt-1">{t('vault.quiz.pending')}</span>
                        )}
                      </div>
                    </div>

                    {/* Quiz Buttons */}
                    <div className="space-y-2 pt-2 border-t border-border">
                      {/* Morning Quiz */}
                      <Button
                        variant={hasCompletedQuiz('morning') ? 'secondary' : 'outline'}
                        className="w-full justify-start gap-3"
                        onClick={() => openQuizDialog('morning')}
                        disabled={hasCompletedQuiz('morning')}
                      >
                        <Sun className="h-4 w-4 text-amber-500" />
                        <span className="flex-1 text-left">{t('vault.quiz.morningLabel')}</span>
                        {hasCompletedQuiz('morning') ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>

                      {/* Pre-Lift Quiz */}
                      <Button
                        variant={hasCompletedQuiz('pre_lift') ? 'secondary' : 'outline'}
                        className="w-full justify-start gap-3"
                        onClick={() => openQuizDialog('pre_lift')}
                        disabled={hasCompletedQuiz('pre_lift')}
                      >
                        <Dumbbell className="h-4 w-4 text-orange-500" />
                        <span className="flex-1 text-left">{t('vault.quiz.preLift')}</span>
                        {hasCompletedQuiz('pre_lift') ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>

                      {/* Night Quiz */}
                      <Button
                        variant={hasCompletedQuiz('night') ? 'secondary' : 'outline'}
                        className="w-full justify-start gap-3"
                        onClick={() => openQuizDialog('night')}
                        disabled={hasCompletedQuiz('night')}
                      >
                        <Moon className="h-4 w-4 text-indigo-500" />
                        <span className="flex-1 text-left">{t('vault.quiz.nightLabel')}</span>
                        {hasCompletedQuiz('night') ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Nutrition Log */}
                <div ref={sectionRefs['nutrition']}>
                  <VaultNutritionLogCard 
                    todaysLogs={nutritionLogs}
                    goals={nutritionGoals}
                    supplementTracking={supplementTracking}
                    onSave={handleSaveNutrition}
                    onDelete={deleteNutritionLog}
                    onSaveGoals={saveNutritionGoals}
                    onToggleSupplementTaken={toggleSupplementTaken}
                    isLoading={loading}
                    favoriteMeals={favoriteMeals}
                    onSaveFavorite={saveFavoriteMeal}
                    onDeleteFavorite={deleteFavoriteMeal}
                    onUseFavorite={useFavoriteMeal}
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="today">{t('vault.tabs.today')}</TabsTrigger>
                  <TabsTrigger value="weekly">{t('vault.tabs.weekly')}</TabsTrigger>
                  <TabsTrigger value="history">{t('vault.tabs.history')}</TabsTrigger>
                </TabsList>

                <TabsContent value="today" className="space-y-4 mt-4">
                  {/* Free Note Entry */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <NotebookPen className="h-5 w-5 text-primary" />
                        {t('vault.freeNote.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {todaysNotes ? (
                        <Alert className="bg-green-500/10 border-green-500/30">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <AlertDescription>
                            {t('vault.freeNote.alreadySaved')}
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <>
                          <Textarea
                            value={freeNote}
                            onChange={(e) => setFreeNote(e.target.value)}
                            placeholder={t('vault.freeNote.placeholder')}
                            className="min-h-[120px]"
                          />
                          <Button
                            onClick={handleSaveFreeNote}
                            disabled={!freeNote.trim() || savingNote}
                            className="w-full sm:w-auto"
                          >
                            {savingNote ? t('common.loading') : t('vault.freeNote.save')}
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Today's Workout Notes */}
                  {workoutNotes.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Dumbbell className="h-5 w-5 text-orange-500" />
                          {t('vault.workoutNotes.todayTitle')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="max-h-[300px]">
                          <div className="space-y-3">
                            {workoutNotes.map((note) => (
                              <div
                                key={note.id}
                                className="p-3 rounded-lg bg-muted/50 border border-border space-y-2"
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="secondary">
                                    {t('workoutModules.week')} {note.week_number}
                                  </Badge>
                                  <Badge variant="outline">
                                    {t('workoutModules.day')} {note.day_number}
                                  </Badge>
                                  {note.total_weight_lifted > 0 && (
                                    <Badge className="bg-orange-500/20 text-orange-600">
                                      {note.total_weight_lifted.toLocaleString()} lbs
                                    </Badge>
                                  )}
                                </div>
                                {note.notes && (
                                  <p className="text-sm text-muted-foreground">
                                    {note.notes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  )}

                  {/* Saved Drills & Tips */}
                  <VaultSavedItemsCard
                    drills={savedDrills}
                    tips={savedTips}
                    onDeleteDrill={deleteSavedDrill}
                    onDeleteTip={deleteSavedTip}
                  />

                  {/* 6-Week Tracking Section */}
                  <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background p-4 sm:p-6 space-y-4">
                    {/* Section Header */}
                    <div className="flex items-center gap-3 pb-3 border-b border-primary/20">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <CalendarDays className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{t('vault.sixWeekTracking.title')}</h3>
                        <p className="text-sm text-muted-foreground">{t('vault.sixWeekTracking.description')}</p>
                      </div>
                    </div>

                    {/* Performance Tests */}
                    <div ref={sectionRefs['performance-tests']}>
                      <VaultPerformanceTestCard
                        tests={performanceTests}
                        onSave={handleSavePerformanceTest}
                        sport={userSport}
                        subscribedModules={subscribedModules}
                        autoOpen={autoOpenSection === 'performance-tests'}
                      />
                    </div>

                    {/* Progress Photos */}
                    <div ref={sectionRefs['progress-photos']}>
                      <VaultProgressPhotosCard
                        photos={progressPhotos}
                        onSave={handleSaveProgressPhoto}
                      />
                    </div>
                  </div>

                  {/* 12-Week Tracking Section */}
                  {(showHittingThrowingGrader || showPitchingGrader) && (
                    <div className="rounded-xl border-2 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-background p-4 sm:p-6 space-y-4">
                      {/* Section Header */}
                      <div className="flex items-center gap-3 pb-3 border-b border-amber-500/20">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                          <Clock className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{t('vault.twelveWeekTracking.title')}</h3>
                          <p className="text-sm text-muted-foreground">{t('vault.twelveWeekTracking.description')}</p>
                        </div>
                      </div>

                      {/* Hitting/Throwing Scout Self-Grades */}
                      {showHittingThrowingGrader && (
                        <div ref={sectionRefs['scout-grades']}>
                          <VaultScoutGradesCard
                            grades={scoutGrades}
                            sport={userSport}
                            gradeType="hitting_throwing"
                            autoOpen={autoOpenSection === 'scout-grades'}
                            onSave={handleSaveScoutGrade}
                          />
                        </div>
                      )}

                      {/* Pitching Scout Self-Grades */}
                      {showPitchingGrader && (
                        <div ref={sectionRefs['pitching-grades']}>
                          <VaultScoutGradesCard
                            grades={pitchingGrades}
                            sport={userSport}
                            gradeType="pitching"
                            autoOpen={autoOpenSection === 'pitching-grades'}
                            onSave={handleSaveScoutGrade}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* 6-Week Recap moved to VaultStreakRecapCard in left column */}
                </TabsContent>

                <TabsContent value="weekly" className="mt-4 space-y-6">
                  <VaultWeeklySummary 
                    fetchWeeklyData={fetchWeeklyData}
                    streak={streak}
                  />
                  <VaultNutritionWeeklySummary 
                    fetchWeeklyNutrition={fetchWeeklyNutrition}
                    goals={nutritionGoals}
                  />
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <VaultHistoryTab
                    fetchHistoryForDate={fetchHistoryForDate}
                    entriesWithData={entriesWithData}
                    onDeleteQuiz={deleteQuiz}
                    onDeleteNote={deleteFreeNote}
                    onDeleteWorkout={deleteWorkoutNote}
                    onDeleteNutrition={deleteNutritionLog}
                    onDeletePerformanceTest={deletePerformanceTest}
                    onDeletePhoto={deleteProgressPhoto}
                    onDeleteGrade={deleteScoutGrade}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Dialog */}
      <VaultFocusQuizDialog
        open={quizDialogOpen}
        onOpenChange={setQuizDialogOpen}
        quizType={selectedQuizType}
        onSubmit={handleQuizSubmit}
      />
    </DashboardLayout>
  );
}
