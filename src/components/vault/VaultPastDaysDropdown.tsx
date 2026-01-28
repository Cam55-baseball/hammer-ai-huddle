import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarDays, ChevronDown, ChevronUp, Bookmark, 
  BookmarkCheck, X, FileDown
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { VaultDayRecapCard } from './VaultDayRecapCard';
import { 
  VaultFocusQuiz, VaultFreeNote, VaultWorkoutNote, 
  VaultPerformanceTest, VaultProgressPhoto, VaultScoutGrade, VaultNutritionLog 
} from '@/hooks/useVault';
import { CustomActivityLog } from '@/types/customActivity';

interface HistoryEntry {
  date: string;
  quizzes: VaultFocusQuiz[];
  notes: VaultFreeNote[];
  workouts: VaultWorkoutNote[];
  nutritionLogged: boolean;
  nutritionLog: VaultNutritionLog | null;
  performanceTests: VaultPerformanceTest[];
  progressPhotos: VaultProgressPhoto[];
  scoutGrades: VaultScoutGrade[];
  customActivities?: CustomActivityLog[];
}

interface VaultPastDaysDropdownProps {
  fetchHistoryForDate: (date: string) => Promise<HistoryEntry>;
  entriesWithData: string[];
}

const SAVED_DAYS_KEY = 'vault_saved_days';

export function VaultPastDaysDropdown({ 
  fetchHistoryForDate, 
  entriesWithData 
}: VaultPastDaysDropdownProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [historyData, setHistoryData] = useState<HistoryEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedDays, setSavedDays] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Load saved days from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_DAYS_KEY);
      if (saved) {
        setSavedDays(JSON.parse(saved));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Fetch data when date is selected
  const loadDateData = useCallback(async (date: Date) => {
    setLoading(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    const data = await fetchHistoryForDate(dateStr);
    setHistoryData(data);
    setLoading(false);
  }, [fetchHistoryForDate]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      loadDateData(date);
      setCalendarOpen(false);
    }
  };

  const hasDataForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return entriesWithData.includes(dateStr);
  };

  const isDateSaved = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return savedDays.includes(dateStr);
  };

  const toggleSaveDay = () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    let newSavedDays: string[];
    if (savedDays.includes(dateStr)) {
      newSavedDays = savedDays.filter(d => d !== dateStr);
      toast.success(t('vault.pastDays.unsaved', 'Removed from saved days'));
    } else {
      newSavedDays = [dateStr, ...savedDays];
      toast.success(t('vault.pastDays.savedSuccess', 'Saved to library'));
    }
    
    setSavedDays(newSavedDays);
    localStorage.setItem(SAVED_DAYS_KEY, JSON.stringify(newSavedDays));
  };

  const handleExportPdf = async () => {
    if (!historyData || !selectedDate) return;
    
    try {
      toast.info(t('vault.pastDays.exportingPdf', 'Preparing PDF...'));
      
      // Dynamic import for jsPDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const dateStr = format(selectedDate, 'MMMM d, yyyy');
      let yPos = 20;
      
      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`Vault Journal - ${dateStr}`, 20, yPos);
      yPos += 15;
      
      // Helper function to add section
      const addSection = (title: string, content: string[]) => {
        if (content.length === 0) return;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 20, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        content.forEach(line => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 25, yPos);
          yPos += 6;
        });
        yPos += 5;
      };
      
      // Wellness Overview
      const wellnessContent: string[] = [];
      historyData.quizzes.forEach(quiz => {
        const type = quiz.quiz_type === 'morning' ? 'Morning' : 
                     quiz.quiz_type === 'pre_lift' ? 'Pre-Workout' : 'Night';
        wellnessContent.push(`${type}: Mental ${quiz.mental_readiness}/5, Physical ${quiz.physical_readiness}/5, Emotional ${quiz.emotional_state}/5`);
      });
      addSection('Daily Wellness', wellnessContent);
      
      // Workouts
      const workoutContent: string[] = [];
      historyData.workouts.forEach(w => {
        workoutContent.push(`Week ${w.week_number} Day ${w.day_number}: ${w.total_weight_lifted.toLocaleString()} lbs lifted`);
        if (w.notes) workoutContent.push(`  Notes: ${w.notes}`);
      });
      addSection('Training', workoutContent);
      
      // Nutrition
      if (historyData.nutritionLog) {
        const n = historyData.nutritionLog;
        addSection('Nutrition', [
          `Calories: ${n.calories || 'N/A'}, Protein: ${n.protein_g || 'N/A'}g, Carbs: ${n.carbs_g || 'N/A'}g`,
          `Hydration: ${n.hydration_oz || 'N/A'}oz, Energy Level: ${n.energy_level || 'N/A'}/10`
        ]);
      }
      
      // Notes
      if (historyData.notes.length > 0) {
        addSection('Journal Notes', historyData.notes.map(n => n.note_text));
      }
      
      // Custom Activities
      if (historyData.customActivities && historyData.customActivities.length > 0) {
        addSection('Activities Completed', 
          historyData.customActivities.map(a => 
            `${a.template?.title || 'Activity'}${a.actual_duration_minutes ? ` (${a.actual_duration_minutes}min)` : ''}`
          )
        );
      }
      
      doc.save(`vault-journal-${format(selectedDate, 'yyyy-MM-dd')}.pdf`);
      toast.success(t('vault.pastDays.pdfExported', 'PDF exported successfully'));
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('vault.pastDays.pdfError', 'Failed to export PDF'));
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedDate(null);
    setHistoryData(null);
  };

  // Count entries for selected date
  const entryCount = historyData ? (
    historyData.quizzes.length +
    historyData.notes.length +
    historyData.workouts.length +
    (historyData.nutritionLogged ? 1 : 0) +
    historyData.performanceTests.length +
    historyData.progressPhotos.length +
    historyData.scoutGrades.length +
    (historyData.customActivities?.length || 0)
  ) : 0;

  return (
    <Card className="border-2 border-dashed border-muted-foreground/20 bg-gradient-to-br from-muted/30 to-background">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <span>{t('vault.pastDays.title', 'Past Days')}</span>
                {savedDays.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {savedDays.length} {t('vault.pastDays.saved', 'saved')}
                  </Badge>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Date Selector */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={cn(
                      "justify-start text-left font-normal flex-1",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {selectedDate 
                      ? format(selectedDate, 'MMMM d, yyyy')
                      : t('vault.pastDays.selectDate', 'Select a date')
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-card" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate || undefined}
                    onSelect={handleDateSelect}
                    disabled={(date) => date > new Date() || date < subDays(new Date(), 90)}
                    modifiers={{
                      hasData: (date) => hasDataForDate(date),
                      saved: (date) => isDateSaved(date),
                    }}
                    modifiersStyles={{
                      hasData: { 
                        fontWeight: 'bold',
                        textDecoration: 'underline',
                        textDecorationColor: 'hsl(var(--primary))',
                      },
                      saved: {
                        backgroundColor: 'hsl(var(--primary) / 0.1)',
                      },
                    }}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {/* Quick access to saved days */}
              {savedDays.length > 0 && !selectedDate && (
                <div className="flex flex-wrap gap-1">
                  {savedDays.slice(0, 3).map(dateStr => (
                    <Button
                      key={dateStr}
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8"
                      onClick={() => {
                        const date = new Date(dateStr + 'T12:00:00');
                        setSelectedDate(date);
                        loadDateData(date);
                      }}
                    >
                      <Bookmark className="h-3 w-3 mr-1" />
                      {format(new Date(dateStr + 'T12:00:00'), 'MMM d')}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Date Content */}
            {selectedDate && (
              <div className="space-y-3">
                {/* Header with date and entry count */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">
                      {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </h4>
                    {entryCount > 0 && (
                      <Badge variant="secondary">
                        {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Journal Recap */}
                <div className="rounded-lg border bg-card">
                  <VaultDayRecapCard 
                    historyData={historyData || {
                      date: format(selectedDate, 'yyyy-MM-dd'),
                      quizzes: [],
                      notes: [],
                      workouts: [],
                      nutritionLogged: false,
                      nutritionLog: null,
                      performanceTests: [],
                      progressPhotos: [],
                      scoutGrades: [],
                      customActivities: [],
                    }}
                    isLoading={loading}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    variant={isDateSaved(selectedDate) ? "secondary" : "outline"}
                    size="sm"
                    onClick={toggleSaveDay}
                    className="gap-1"
                  >
                    {isDateSaved(selectedDate) ? (
                      <>
                        <BookmarkCheck className="h-4 w-4" />
                        {t('vault.pastDays.savedLabel', 'Saved')}
                      </>
                    ) : (
                      <>
                        <Bookmark className="h-4 w-4" />
                        {t('vault.pastDays.save', 'Save to Library')}
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPdf}
                    disabled={!historyData || entryCount === 0}
                    className="gap-1"
                  >
                    <FileDown className="h-4 w-4" />
                    {t('vault.pastDays.export', 'Export PDF')}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="gap-1 ml-auto"
                  >
                    <X className="h-4 w-4" />
                    {t('common.close', 'Close')}
                  </Button>
                </div>
              </div>
            )}

            {/* Empty state when open but no date selected */}
            {!selectedDate && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('vault.pastDays.selectDatePrompt', 'Select a date to view your journal entries. Dates with entries are underlined.')}
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
