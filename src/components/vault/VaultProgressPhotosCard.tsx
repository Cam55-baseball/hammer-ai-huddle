import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, ChevronDown, Calendar, Upload, ImageIcon, Ruler, Scale, Lock, AlertCircle, Sparkles, Eye, Clock, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PhotoTimelineDialog } from './PhotoTimelineDialog';
import { generateComparisonImage } from '@/utils/generateComparisonImage';
import { generateComparisonPdf } from '@/utils/generateComparisonPdf';

interface ProgressPhoto {
  id: string;
  photo_date: string;
  photo_urls: string[];
  weight_lbs: number | null;
  body_fat_percent: number | null;
  arm_measurement: number | null;
  chest_measurement: number | null;
  waist_measurement: number | null;
  leg_measurement: number | null;
  notes: string | null;
  next_entry_date?: string | null;
}

interface VaultProgressPhotosCardProps {
  photos: ProgressPhoto[];
  onSave: (data: {
    photos: File[];
    weight_lbs: number | null;
    body_fat_percent: number | null;
    arm_measurement: number | null;
    chest_measurement: number | null;
    waist_measurement: number | null;
    leg_measurement: number | null;
    notes: string | null;
  }) => Promise<{ success: boolean }>;
  recapUnlockedAt?: Date | null;
  autoOpen?: boolean;
}

const LOCK_PERIOD_WEEKS = 6;

export function VaultProgressPhotosCard({ photos, onSave, recapUnlockedAt = null, autoOpen = false }: VaultProgressPhotosCardProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle autoOpen changes with delay for smooth animation
  useEffect(() => {
    if (autoOpen) {
      const timer = setTimeout(() => setIsOpen(true), 150);
      return () => clearTimeout(timer);
    }
  }, [autoOpen]);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [arm, setArm] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [leg, setLeg] = useState('');
  const [notes, setNotes] = useState('');
  const [showWeek6, setShowWeek6] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [signedUrlMap, setSignedUrlMap] = useState<Record<string, string>>({});

  // Load signed URLs for private vault-photos bucket
  const loadSignedUrls = async () => {
    const allPaths = photos.flatMap(p => p.photo_urls).filter(Boolean);
    const missing = allPaths.filter(p => !signedUrlMap[p]);
    if (missing.length === 0) return;
    const urlMap: Record<string, string> = { ...signedUrlMap };
    for (const path of missing) {
      const { data } = await supabase.storage.from('vault-photos').createSignedUrl(path, 3600);
      if (data?.signedUrl) urlMap[path] = data.signedUrl;
    }
    setSignedUrlMap(urlMap);
  };

  // Load signed URLs when comparison photos are visible
  useEffect(() => {
    if (photos.length >= 2) loadSignedUrls();
  }, [photos.length]);

  // Check if entry is locked
  // Recap-unlock override: If recap was generated and no entry exists after that date, unlock the card
  const latestPhoto = photos[0];
  const latestPhotoDate = latestPhoto?.photo_date ? new Date(latestPhoto.photo_date) : null;
  const unlockedByRecap = recapUnlockedAt && (!latestPhotoDate || latestPhotoDate < recapUnlockedAt);
  
  const isLocked = justSaved || (!unlockedByRecap && latestPhoto?.next_entry_date && new Date(latestPhoto.next_entry_date) > new Date());
  const daysRemaining = latestPhoto?.next_entry_date 
    ? Math.max(0, Math.ceil((new Date(latestPhoto.next_entry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.size <= 10 * 1024 * 1024 && f.type.startsWith('image/'));
    
    if (validFiles.length !== files.length) {
      toast.error(t('vault.progressPhotos.invalidFiles'));
    }
    
    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 4));
  };

  const handleSave = async () => {
    setSaving(true);
    console.log('[VaultProgressPhotosCard] Saving progress photos...');
    const result = await onSave({
      photos: selectedFiles,
      weight_lbs: weight ? parseFloat(weight) : null,
      body_fat_percent: bodyFat ? parseFloat(bodyFat) : null,
      arm_measurement: arm ? parseFloat(arm) : null,
      chest_measurement: chest ? parseFloat(chest) : null,
      waist_measurement: waist ? parseFloat(waist) : null,
      leg_measurement: leg ? parseFloat(leg) : null,
      notes: notes || null,
    });
    console.log('[VaultProgressPhotosCard] Save result:', result);
    
    if (result.success) {
      console.log('[VaultProgressPhotosCard] Setting justSaved to true');
      setJustSaved(true); // Immediately show as locked
      setSelectedFiles([]);
      setWeight('');
      setBodyFat('');
      setArm('');
      setChest('');
      setWaist('');
      setLeg('');
      setNotes('');
      toast.success(t('vault.progressPhotos.saved'));
    }
    setSaving(false);
  };

  const recentPhotos = photos.slice(0, 3);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-pink-500" />
                <CardTitle className="text-lg">{t('vault.progressPhotos.title')}</CardTitle>
                {photos.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{photos.length}</Badge>
                )}
                {isLocked && (
                  <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-600">
                    <Lock className="h-3 w-3" />
                    {t('vault.lockPeriod.locked')}
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            <CardDescription>{t('vault.progressPhotos.description')}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Lock Period Info */}
            <Alert className="bg-amber-500/10 border-amber-500/30">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  {t('vault.lockPeriod.sixWeeks')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('vault.lockPeriod.entriesImmutable')}
                </p>
              </AlertDescription>
            </Alert>

            {isLocked ? (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  <span className="font-medium">{t('vault.lockPeriod.sectionLocked')}</span>
                  <br />
                  <span className="text-sm text-muted-foreground">
                    {t('vault.lockPeriod.lockedUntil', { days: daysRemaining })}
                  </span>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Photo Upload */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="h-4 w-4 text-green-500" />
                    <Label className="font-medium text-green-700 dark:text-green-400">
                      {t('vault.lockPeriod.readyToRecord')}
                    </Label>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    variant="outline"
                    className="w-full h-24 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="h-6 w-6" />
                      <span className="text-sm">{t('vault.progressPhotos.upload')}</span>
                      <span className="text-xs">{t('vault.progressPhotos.uploadHint')}</span>
                    </div>
                  </Button>
                  
                  {selectedFiles.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {selectedFiles.map((file, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {file.name.slice(0, 20)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Measurements */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Scale className="h-3 w-3" />
                      {t('vault.progressPhotos.weight')}
                    </Label>
                    <Input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="180 lbs"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('vault.progressPhotos.bodyFat')}</Label>
                    <Input
                      type="number"
                      value={bodyFat}
                      onChange={(e) => setBodyFat(e.target.value)}
                      placeholder="15%"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Ruler className="h-3 w-3" />
                      {t('vault.progressPhotos.arm')}
                    </Label>
                    <Input
                      type="number"
                      value={arm}
                      onChange={(e) => setArm(e.target.value)}
                      placeholder="16 in"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('vault.progressPhotos.chest')}</Label>
                    <Input
                      type="number"
                      value={chest}
                      onChange={(e) => setChest(e.target.value)}
                      placeholder="42 in"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('vault.progressPhotos.waist')}</Label>
                    <Input
                      type="number"
                      value={waist}
                      onChange={(e) => setWaist(e.target.value)}
                      placeholder="32 in"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('vault.progressPhotos.leg')}</Label>
                    <Input
                      type="number"
                      value={leg}
                      onChange={(e) => setLeg(e.target.value)}
                      placeholder="25 in"
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <Label className="text-xs">{t('vault.progressPhotos.notes')}</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('vault.progressPhotos.notesPlaceholder')}
                    className="min-h-[60px]"
                  />
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? t('common.loading') : t('vault.progressPhotos.save')}
                </Button>
              </>
            )}

            {/* Recent Entries (Read-Only History) */}
            {recentPhotos.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">{t('vault.progressPhotos.recent')}</Label>
                  <Badge variant="outline" className="text-xs">{t('vault.lockPeriod.readOnly')}</Badge>
                </div>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {recentPhotos.map((photo) => (
                      <div key={photo.id} className="p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(photo.photo_date).toLocaleDateString()}
                          </div>
                          {photo.weight_lbs && (
                            <Badge variant="outline">{photo.weight_lbs} lbs</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {photo.body_fat_percent && <span>BF: {photo.body_fat_percent}%</span>}
                          {photo.arm_measurement && <span>Arm: {photo.arm_measurement}"</span>}
                          {photo.chest_measurement && <span>Chest: {photo.chest_measurement}"</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* 12-Week Milestone Prompt */}
            {(() => {
              if (photos.length < 2) return null;
              const latest = photos[0];
              const latestCycleWeek = (latest as any).cycle_week ?? 0;
              const isMilestone = latestCycleWeek > 0 && latestCycleWeek % 12 === 0;
              const latestDate = new Date(latest.photo_date);
              const twelveWeeksMs = 12 * 7 * 24 * 60 * 60 * 1000;
              
              // Find Week 0 and Week 6 photos for comparison
              const week0Photo = photos.find(p => {
                const pDate = new Date(p.photo_date);
                const diff = latestDate.getTime() - pDate.getTime();
                return diff >= twelveWeeksMs * 0.85 && diff <= twelveWeeksMs * 1.15;
              });
              const sixWeeksMs = 6 * 7 * 24 * 60 * 60 * 1000;
              const week6Photo = photos.find(p => {
                const pDate = new Date(p.photo_date);
                const diff = latestDate.getTime() - pDate.getTime();
                return diff >= sixWeeksMs * 0.8 && diff <= sixWeeksMs * 1.2;
              });

              if (!week0Photo) return null;

              const delta = (current: number | null, previous: number | null) => {
                if (current == null || previous == null) return null;
                const diff = current - previous;
                return diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
              };

              return (
                <div className="space-y-3 pt-2 border-t">
                  {/* Milestone banner */}
                  {isMilestone && (
                    <Alert className="bg-primary/10 border-primary/30">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <AlertDescription className="font-medium text-primary">
                        🎉 View Your 12-Week Transformation!
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-medium">12-Week Comparison</Label>
                    {week6Photo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-6 px-2"
                        onClick={() => setShowWeek6(!showWeek6)}
                      >
                        {showWeek6 ? 'Hide' : 'Show'} Week 6
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="text-[10px] h-6 px-2 gap-1 ml-auto">
                          <Download className="h-3 w-3" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          const exportPhotos = [
                            { imageUrl: week0Photo.photo_urls[0] ? signedUrlMap[week0Photo.photo_urls[0]] : null, label: 'Week 0', date: new Date(week0Photo.photo_date).toLocaleDateString(), weight: week0Photo.weight_lbs },
                            ...(showWeek6 && week6Photo ? [{ imageUrl: week6Photo.photo_urls[0] ? signedUrlMap[week6Photo.photo_urls[0]] : null, label: 'Week 6', date: new Date(week6Photo.photo_date).toLocaleDateString(), weight: week6Photo.weight_lbs }] : []),
                            { imageUrl: latest.photo_urls[0] ? signedUrlMap[latest.photo_urls[0]] : null, label: 'Current', date: new Date(latest.photo_date).toLocaleDateString(), weight: latest.weight_lbs },
                          ];
                          const exportDeltas = [
                            delta(latest.weight_lbs, week0Photo.weight_lbs) ? { label: 'Weight', value: `${delta(latest.weight_lbs, week0Photo.weight_lbs)} lbs` } : null,
                            delta(latest.arm_measurement, week0Photo.arm_measurement) ? { label: 'Arm', value: `${delta(latest.arm_measurement, week0Photo.arm_measurement)}"` } : null,
                            delta(latest.chest_measurement, week0Photo.chest_measurement) ? { label: 'Chest', value: `${delta(latest.chest_measurement, week0Photo.chest_measurement)}"` } : null,
                            delta(latest.waist_measurement, week0Photo.waist_measurement) ? { label: 'Waist', value: `${delta(latest.waist_measurement, week0Photo.waist_measurement)}"` } : null,
                          ].filter(Boolean) as { label: string; value: string }[];
                          generateComparisonImage(exportPhotos, exportDeltas);
                          toast.success('Exporting comparison image...');
                        }}>
                          Export as Image
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const exportPhotos = [
                            { imageUrl: week0Photo.photo_urls[0] ? signedUrlMap[week0Photo.photo_urls[0]] : null, label: 'Week 0', date: new Date(week0Photo.photo_date).toLocaleDateString(), weight: week0Photo.weight_lbs },
                            ...(showWeek6 && week6Photo ? [{ imageUrl: week6Photo.photo_urls[0] ? signedUrlMap[week6Photo.photo_urls[0]] : null, label: 'Week 6', date: new Date(week6Photo.photo_date).toLocaleDateString(), weight: week6Photo.weight_lbs }] : []),
                            { imageUrl: latest.photo_urls[0] ? signedUrlMap[latest.photo_urls[0]] : null, label: 'Current', date: new Date(latest.photo_date).toLocaleDateString(), weight: latest.weight_lbs },
                          ];
                          const exportDeltas = [
                            delta(latest.weight_lbs, week0Photo.weight_lbs) ? { label: 'Weight', value: `${delta(latest.weight_lbs, week0Photo.weight_lbs)} lbs` } : null,
                            delta(latest.arm_measurement, week0Photo.arm_measurement) ? { label: 'Arm', value: `${delta(latest.arm_measurement, week0Photo.arm_measurement)}"` } : null,
                            delta(latest.chest_measurement, week0Photo.chest_measurement) ? { label: 'Chest', value: `${delta(latest.chest_measurement, week0Photo.chest_measurement)}"` } : null,
                            delta(latest.waist_measurement, week0Photo.waist_measurement) ? { label: 'Waist', value: `${delta(latest.waist_measurement, week0Photo.waist_measurement)}"` } : null,
                          ].filter(Boolean) as { label: string; value: string }[];
                          generateComparisonPdf(exportPhotos, exportDeltas);
                          toast.success('Exporting comparison PDF...');
                        }}>
                          Export as PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Side-by-side photos with signed URLs */}
                  <ComparisonPhotoGrid
                    week0={week0Photo}
                    week6={showWeek6 ? week6Photo ?? null : null}
                    week12={latest}
                    signedUrls={signedUrlMap}
                  />

                  {/* Deltas */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {delta(latest.weight_lbs, week0Photo.weight_lbs) && (
                      <Badge variant="secondary" className="text-[10px]">
                        Weight: {delta(latest.weight_lbs, week0Photo.weight_lbs)} lbs
                      </Badge>
                    )}
                    {delta(latest.arm_measurement, week0Photo.arm_measurement) && (
                      <Badge variant="secondary" className="text-[10px]">
                        Arm: {delta(latest.arm_measurement, week0Photo.arm_measurement)}"
                      </Badge>
                    )}
                    {delta(latest.chest_measurement, week0Photo.chest_measurement) && (
                      <Badge variant="secondary" className="text-[10px]">
                        Chest: {delta(latest.chest_measurement, week0Photo.chest_measurement)}"
                      </Badge>
                    )}
                    {delta(latest.waist_measurement, week0Photo.waist_measurement) && (
                      <Badge variant="secondary" className="text-[10px]">
                        Waist: {delta(latest.waist_measurement, week0Photo.waist_measurement)}"
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* View Full Timeline Button */}
            {photos.length > 0 && (
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    loadSignedUrls();
                    setTimelineOpen(true);
                  }}
                >
                  <Clock className="h-4 w-4" />
                  View Full Timeline ({photos.length} entries)
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <PhotoTimelineDialog
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
        photos={photos}
        signedUrls={signedUrlMap}
      />
    </Card>
  );
}

/** Side-by-side photo comparison grid with actual images */
function ComparisonPhotoGrid({ week0, week6, week12, signedUrls }: {
  week0: ProgressPhoto;
  week6: ProgressPhoto | null;
  week12: ProgressPhoto;
  signedUrls: Record<string, string>;
}) {
  const cols = week6 ? 'grid-cols-3' : 'grid-cols-2';
  const renderPhoto = (photo: ProgressPhoto, label: string) => {
    const url = photo.photo_urls[0] ? signedUrls[photo.photo_urls[0]] : null;
    return (
      <div className="p-2 rounded-lg bg-muted/50 border border-border text-center space-y-1">
        <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
        {url ? (
          <img src={url} alt={label} className="w-full aspect-[3/4] object-cover rounded-md" />
        ) : (
          <div className="w-full aspect-[3/4] bg-muted rounded-md flex items-center justify-center">
            <Camera className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <p className="text-[10px] text-muted-foreground">{new Date(photo.photo_date).toLocaleDateString()}</p>
        {photo.weight_lbs && <Badge variant="outline" className="text-[9px]">{photo.weight_lbs} lbs</Badge>}
      </div>
    );
  };

  return (
    <div className={`grid ${cols} gap-2`}>
      {renderPhoto(week0, 'Week 0')}
      {week6 && renderPhoto(week6, 'Week 6')}
      {renderPhoto(week12, 'Current')}
    </div>
  );
}