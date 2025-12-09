import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
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
} from 'lucide-react';
import { useVault } from '@/hooks/useVault';
import { VaultStreakCard } from '@/components/vault/VaultStreakCard';
import { VaultDailyReminder } from '@/components/vault/VaultDailyReminder';
import { VaultFocusQuizDialog } from '@/components/vault/VaultFocusQuizDialog';
import { VaultNutritionLogCard } from '@/components/vault/VaultNutritionLogCard';
import { VaultSavedItemsCard } from '@/components/vault/VaultSavedItemsCard';
import { VaultPerformanceTestCard } from '@/components/vault/VaultPerformanceTestCard';
import { VaultProgressPhotosCard } from '@/components/vault/VaultProgressPhotosCard';
import { VaultScoutGradesCard } from '@/components/vault/VaultScoutGradesCard';
import { VaultRecapCard } from '@/components/vault/VaultRecapCard';
import { VaultHistoryTab } from '@/components/vault/VaultHistoryTab';
import { VaultWeeklySummary } from '@/components/vault/VaultWeeklySummary';
export default function Vault() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    loading,
    streak,
    todaysQuizzes,
    todaysNotes,
    workoutNotes,
    nutritionLog,
    savedDrills,
    savedTips,
    performanceTests,
    progressPhotos,
    scoutGrades,
    recaps,
    entriesWithData,
    saveFocusQuiz,
    saveFreeNote,
    saveNutritionLog,
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
  } = useVault();

  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState('today');
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [selectedQuizType, setSelectedQuizType] = useState<'pre_lift' | 'night' | 'morning'>('pre_lift');
  const [freeNote, setFreeNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Check access
  useEffect(() => {
    const checkAccess = async () => {
      const access = await checkVaultAccess();
      setHasAccess(access);
    };
    checkAccess();
  }, [checkVaultAccess]);

  // Calculate days until 6-week recap
  const getDaysUntilRecap = () => {
    if (!streak?.last_entry_date) return 42;
    const lastEntry = new Date(streak.last_entry_date);
    const startOfCycle = new Date(lastEntry);
    startOfCycle.setDate(startOfCycle.getDate() - (streak.total_entries % 42));
    const endOfCycle = new Date(startOfCycle);
    endOfCycle.setDate(endOfCycle.getDate() + 42);
    const today = new Date();
    const daysRemaining = Math.ceil((endOfCycle.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(42, daysRemaining));
  };

  const getRecapProgress = () => {
    if (!streak?.total_entries) return 0;
    const daysInCycle = streak.total_entries % 42;
    return (daysInCycle / 42) * 100;
  };

  const canGenerateRecap = () => {
    if (!streak?.total_entries) return false;
    return streak.total_entries >= 42 && getDaysUntilRecap() === 0;
  };

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
    const result = await saveFocusQuiz(selectedQuizType, data);
    if (result.success) {
      toast.success(t('vault.quiz.saved'));
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
                <Button onClick={() => navigate('/pricing')} size="lg" className="mt-4">
                  {t('vault.locked.unlockButton')}
                </Button>
              </div>
            </div>

            <VaultDailyReminder
              daysUntilRecap={42}
              recapProgress={0}
              isLocked={true}
            />
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

          {/* Daily Reminder - Main Visual */}
          <VaultDailyReminder
            daysUntilRecap={getDaysUntilRecap()}
            recapProgress={getRecapProgress()}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Streak & Quizzes */}
            <div className="space-y-6">
              <VaultStreakCard streak={streak} />

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
                <CardContent className="space-y-3">
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

                  {/* Morning Quiz */}
                  <Button
                    variant={hasCompletedQuiz('morning') ? 'secondary' : 'outline'}
                    className="w-full justify-start gap-3"
                    onClick={() => openQuizDialog('morning')}
                    disabled={hasCompletedQuiz('morning')}
                  >
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span className="flex-1 text-left">{t('vault.quiz.morning')}</span>
                    {hasCompletedQuiz('morning') ? (
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
                    <span className="flex-1 text-left">{t('vault.quiz.night')}</span>
                    {hasCompletedQuiz('night') ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </CardContent>
              </Card>
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

                  {/* Nutrition Log */}
                  <VaultNutritionLogCard 
                    todaysLog={nutritionLog}
                    onSave={handleSaveNutrition}
                  />

                  {/* Saved Drills & Tips */}
                  <VaultSavedItemsCard
                    drills={savedDrills}
                    tips={savedTips}
                    onDeleteDrill={deleteSavedDrill}
                    onDeleteTip={deleteSavedTip}
                  />

                  {/* Performance Tests */}
                  <VaultPerformanceTestCard
                    tests={performanceTests}
                    onSave={handleSavePerformanceTest}
                  />

                  {/* Progress Photos */}
                  <VaultProgressPhotosCard
                    photos={progressPhotos}
                    onSave={handleSaveProgressPhoto}
                  />

                  {/* Scout Self-Grades */}
                  <VaultScoutGradesCard
                    grades={scoutGrades}
                    onSave={handleSaveScoutGrade}
                  />

                  {/* 6-Week Recap */}
                  <VaultRecapCard
                    recaps={recaps}
                    canGenerate={canGenerateRecap()}
                    daysUntilNextRecap={getDaysUntilRecap()}
                    onGenerate={handleGenerateRecap}
                    isLoading={loading}
                  />
                </TabsContent>

                <TabsContent value="weekly" className="mt-4">
                  <VaultWeeklySummary
                    fetchWeeklyData={fetchWeeklyData}
                    streak={streak}
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
