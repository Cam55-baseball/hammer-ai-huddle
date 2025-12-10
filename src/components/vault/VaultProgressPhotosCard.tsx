import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, ChevronDown, Calendar, Upload, ImageIcon, Ruler, Scale, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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
}

const LOCK_PERIOD_WEEKS = 6;

export function VaultProgressPhotosCard({ photos, onSave }: VaultProgressPhotosCardProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [arm, setArm] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [leg, setLeg] = useState('');
  const [notes, setNotes] = useState('');

  // Check if entry is locked
  const latestPhoto = photos[0];
  const isLocked = latestPhoto?.next_entry_date && new Date(latestPhoto.next_entry_date) > new Date();
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
    
    if (result.success) {
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
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}