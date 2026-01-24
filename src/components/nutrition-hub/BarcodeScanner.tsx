import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScanBarcode, Camera, CameraOff, Loader2, X, Keyboard, RotateCcw, Plus, Flashlight, Clock } from 'lucide-react';
import { useBarcodeSearch, validateBarcode } from '@/hooks/useBarcodeSearch';
import { useRecentFoods } from '@/hooks/useRecentFoods';
import { FoodSearchResult } from '@/hooks/useFoodSearch';
import { cn } from '@/lib/utils';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFoodFound: (food: FoodSearchResult) => void;
  onCreateCustom?: (barcode: string) => void;
}

type ScannerState = 'idle' | 'starting' | 'scanning' | 'processing' | 'found' | 'not_found' | 'error';

export function BarcodeScanner({
  open,
  onOpenChange,
  onFoodFound,
  onCreateCustom,
}: BarcodeScannerProps) {
  const { t } = useTranslation();
  const { searchByBarcode, loading, error, lastScannedBarcode } = useBarcodeSearch();
  const { recentlyScanned, refresh: refreshRecentFoods } = useRecentFoods();
  
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [foundFood, setFoundFood] = useState<FoodSearchResult | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  // Initialize scanner when dialog opens
  useEffect(() => {
    if (open && !manualMode) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [open, manualMode]);

  const startScanner = async () => {
    if (!containerRef.current) return;
    
    setScannerState('starting');
    setCameraError(null);
    setTorchEnabled(false);
    setTorchSupported(false);

    try {
      const html5Qrcode = new Html5Qrcode('barcode-scanner-container', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
        ],
        verbose: false,
      });
      
      scannerRef.current = html5Qrcode;

      // Mobile-optimized camera configuration
      await html5Qrcode.start(
        { facingMode: { exact: 'environment' } },
        {
          fps: 15,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.5,
          videoConstraints: {
            facingMode: { exact: 'environment' },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
          } as MediaTrackConstraints,
        },
        onScanSuccess,
        () => {} // Ignore scan failures
      );

      // Check if torch is supported
      try {
        const videoElement = document.querySelector('#barcode-scanner-container video') as HTMLVideoElement;
        if (videoElement?.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          const track = stream.getVideoTracks()[0];
          trackRef.current = track;
          
          const capabilities = track.getCapabilities?.() as any;
          if (capabilities?.torch) {
            setTorchSupported(true);
          }
        }
      } catch {
        // Torch not supported
      }

      setScannerState('scanning');
    } catch (err) {
      console.error('Failed to start scanner:', err);
      
      // Try fallback without exact facingMode
      try {
        const html5Qrcode = new Html5Qrcode('barcode-scanner-container', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
          verbose: false,
        });
        
        scannerRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 280, height: 180 },
            aspectRatio: 1.5,
          },
          onScanSuccess,
          () => {}
        );
        
        setScannerState('scanning');
      } catch (fallbackErr) {
        setCameraError(
          fallbackErr instanceof Error 
            ? fallbackErr.message 
            : 'Camera access denied. Please grant camera permissions.'
        );
        setScannerState('error');
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        // Ignore stop errors
      }
      scannerRef.current = null;
    }
    trackRef.current = null;
    setTorchEnabled(false);
    setTorchSupported(false);
  };

  const toggleTorch = async () => {
    if (!trackRef.current) return;
    
    try {
      await trackRef.current.applyConstraints({
        advanced: [{ torch: !torchEnabled } as any]
      });
      setTorchEnabled(!torchEnabled);
    } catch (err) {
      console.error('Failed to toggle torch:', err);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    // Prevent multiple scans
    if (scannerState === 'processing') return;
    
    setScannerState('processing');
    
    // Haptic feedback on successful scan
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    
    try {
      await stopScanner();

      const food = await searchByBarcode(decodedText);
      
      if (food) {
        setFoundFood(food);
        setScannerState('found');
      } else {
        setScannerState('not_found');
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      setScannerState('error');
      setCameraError('Failed to process barcode. Please try again.');
    }
  };

  const handleManualSearch = async () => {
    const trimmedBarcode = manualBarcode.trim();
    if (!trimmedBarcode) return;
    
    // Validate barcode format
    const validation = validateBarcode(trimmedBarcode);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid barcode format');
      return;
    }
    
    setValidationError(null);
    setScannerState('processing');
    const food = await searchByBarcode(trimmedBarcode);
    
    if (food) {
      setFoundFood(food);
      setScannerState('found');
    } else {
      setScannerState('not_found');
    }
  };

  const handleAddFood = () => {
    if (foundFood) {
      onFoodFound(foundFood);
      refreshRecentFoods();
      handleClose();
    }
  };

  const handleQuickAdd = (food: FoodSearchResult) => {
    onFoodFound(food);
    refreshRecentFoods();
    handleClose();
  };

  const handleCreateCustom = () => {
    if (lastScannedBarcode && onCreateCustom) {
      onCreateCustom(lastScannedBarcode);
    }
    handleClose();
  };

  const handleScanAgain = () => {
    setFoundFood(null);
    setManualBarcode('');
    setValidationError(null);
    setScannerState('idle');
    if (!manualMode) {
      startScanner();
    }
  };

  const handleClose = () => {
    stopScanner();
    setFoundFood(null);
    setManualBarcode('');
    setManualMode(false);
    setScannerState('idle');
    setCameraError(null);
    setValidationError(null);
    onOpenChange(false);
  };

  const toggleManualMode = () => {
    if (!manualMode) {
      stopScanner();
    }
    setManualMode(!manualMode);
    setScannerState('idle');
    setValidationError(null);
  };

  const showRecentlyScanned = recentlyScanned.length > 0 && 
    (scannerState === 'idle' || scannerState === 'scanning') && 
    !manualMode;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            {t('nutrition.scanBarcode', 'Scan Barcode')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recently Scanned Section */}
          {showRecentlyScanned && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                {t('nutrition.barcode.recentlyScanned', 'Recently Scanned')}
              </div>
              <div className="space-y-1">
                {recentlyScanned.map(food => (
                  <Button 
                    key={food.id}
                    variant="ghost" 
                    className="w-full justify-start h-auto py-2 px-3"
                    onClick={() => handleQuickAdd(food)}
                  >
                    <div className="flex-1 text-left">
                      <span className="block text-sm font-medium truncate">{food.name}</span>
                      {food.brand && (
                        <span className="block text-xs text-muted-foreground truncate">{food.brand}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">
                      {food.caloriesPerServing || 0} cal
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Scanner / Manual Input Toggle */}
          <div className="flex gap-2">
            <Button
              variant={!manualMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => manualMode && toggleManualMode()}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              {t('nutrition.barcode.camera', 'Camera')}
            </Button>
            <Button
              variant={manualMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => !manualMode && toggleManualMode()}
              className="flex-1"
            >
              <Keyboard className="h-4 w-4 mr-2" />
              {t('nutrition.barcode.manual', 'Manual')}
            </Button>
          </div>

          {/* Camera Scanner View */}
          {!manualMode && scannerState !== 'found' && scannerState !== 'not_found' && (
            <div className="relative">
              <div
                id="barcode-scanner-container"
                ref={containerRef}
                className={cn(
                  "w-full aspect-[4/3] bg-muted rounded-lg overflow-hidden",
                  scannerState === 'starting' && "animate-pulse"
                )}
                style={{ touchAction: 'manipulation' }}
              />
              
              {/* Torch toggle button */}
              {torchSupported && scannerState === 'scanning' && (
                <Button
                  variant={torchEnabled ? 'default' : 'outline'}
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8 bg-background/80 backdrop-blur-sm"
                  onClick={toggleTorch}
                >
                  <Flashlight className={cn("h-4 w-4", torchEnabled && "text-yellow-400")} />
                </Button>
              )}
              
              {/* Scanner overlay */}
              {scannerState === 'scanning' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-64 h-24 border-2 border-primary rounded-lg relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary" />
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary/50 animate-pulse" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 bg-background/80 px-2 py-1 rounded">
                    {t('nutrition.barcode.holdSteady', 'Hold steady over barcode')}
                  </p>
                </div>
              )}

              {/* Starting state */}
              {scannerState === 'starting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">{t('nutrition.barcode.startingCamera', 'Starting camera...')}</p>
                  </div>
                </div>
              )}

              {/* Processing state */}
              {scannerState === 'processing' && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">{t('nutrition.barcode.lookingUpProduct', 'Looking up product...')}</p>
                  </div>
                </div>
              )}

              {/* Camera error */}
              {scannerState === 'error' && cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/90">
                  <div className="text-center p-4">
                    <CameraOff className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-destructive mt-2">{cameraError}</p>
                    <div className="flex gap-2 mt-4 justify-center">
                      <Button variant="outline" size="sm" onClick={startScanner}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {t('nutrition.barcode.retry', 'Retry')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={toggleManualMode}>
                        <Keyboard className="h-4 w-4 mr-2" />
                        {t('nutrition.barcode.enterManually', 'Enter Manually')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Input Mode */}
          {manualMode && scannerState !== 'found' && scannerState !== 'not_found' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>{t('nutrition.barcode.barcodeNumber', 'Barcode Number')}</Label>
                <Input
                  value={manualBarcode}
                  onChange={(e) => {
                    setManualBarcode(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder={t('nutrition.barcode.enterBarcode', 'Enter barcode (e.g., 0123456789012)')}
                  className={cn(
                    "text-center text-lg tracking-widest",
                    validationError && "border-destructive"
                  )}
                  autoFocus
                  inputMode="numeric"
                />
                {validationError && (
                  <p className="text-sm text-destructive">{validationError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('nutrition.barcode.formatHint', 'Supports UPC-A, UPC-E, EAN-8, EAN-13 (8-14 digits)')}
                </p>
              </div>
              <Button 
                onClick={handleManualSearch} 
                className="w-full"
                disabled={!manualBarcode.trim() || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('nutrition.barcode.searching', 'Searching...')}
                  </>
                ) : (
                  t('nutrition.barcode.search', 'Search')
                )}
              </Button>
              
              {/* Show recently scanned in manual mode too */}
              {recentlyScanned.length > 0 && (
                <div className="pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                    <Clock className="h-4 w-4" />
                    {t('nutrition.barcode.recentlyScanned', 'Recently Scanned')}
                  </div>
                  <div className="space-y-1">
                    {recentlyScanned.slice(0, 3).map(food => (
                      <Button 
                        key={food.id}
                        variant="ghost" 
                        className="w-full justify-start h-auto py-2 px-3"
                        onClick={() => handleQuickAdd(food)}
                      >
                        <div className="flex-1 text-left">
                          <span className="block text-sm font-medium truncate">{food.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-2">
                          {food.caloriesPerServing || 0} cal
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Found Food Result */}
          {scannerState === 'found' && foundFood && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{foundFood.name}</p>
                    {foundFood.brand && (
                      <p className="text-sm text-muted-foreground">{foundFood.brand}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {foundFood.servingSize || `1 ${t('nutrition.barcode.serving', 'serving')}`}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-center mt-3">
                  <div className="p-2 bg-background rounded">
                    <p className="font-semibold">{foundFood.caloriesPerServing || 0}</p>
                    <p className="text-xs text-muted-foreground">Cal</p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <p className="font-semibold text-blue-500">{foundFood.protein || 0}g</p>
                    <p className="text-xs text-muted-foreground">Protein</p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <p className="font-semibold text-amber-500">{foundFood.carbs || 0}g</p>
                    <p className="text-xs text-muted-foreground">Carbs</p>
                  </div>
                  <div className="p-2 bg-background rounded">
                    <p className="font-semibold text-rose-500">{foundFood.fats || 0}g</p>
                    <p className="text-xs text-muted-foreground">Fats</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleScanAgain} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t('nutrition.barcode.scanAgain', 'Scan Again')}
                </Button>
                <Button onClick={handleAddFood} className="flex-1">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('nutrition.barcode.addFood', 'Add Food')}
                </Button>
              </div>
            </div>
          )}

          {/* Not Found State */}
          {scannerState === 'not_found' && (
            <div className="space-y-4 text-center py-4">
              <div className="text-muted-foreground">
                <X className="h-12 w-12 mx-auto mb-2 text-destructive/50" />
                <p className="font-medium">{t('nutrition.barcode.productNotFound', 'Product Not Found')}</p>
                <p className="text-sm">
                  {t('nutrition.barcode.barcodeNumber', 'Barcode')}: {lastScannedBarcode}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleScanAgain} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t('nutrition.barcode.scanAgain', 'Scan Again')}
                </Button>
                {onCreateCustom && (
                  <Button onClick={handleCreateCustom} className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('nutrition.barcode.createCustom', 'Create Custom')}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* API Error */}
          {error && scannerState !== 'not_found' && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}