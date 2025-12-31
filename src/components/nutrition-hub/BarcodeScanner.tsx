import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScanBarcode, Camera, CameraOff, Loader2, X, Keyboard, RotateCcw, Plus, Circle } from 'lucide-react';
import { useBarcodeSearch } from '@/hooks/useBarcodeSearch';
import { FoodSearchResult } from '@/hooks/useFoodSearch';
import { cn } from '@/lib/utils';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFoodFound: (food: FoodSearchResult) => void;
  onCreateCustom?: (barcode: string) => void;
}

type ScannerState = 'idle' | 'preview' | 'capturing' | 'analyzing' | 'found' | 'not_found' | 'no_barcode' | 'error';

export function BarcodeScanner({
  open,
  onOpenChange,
  onFoodFound,
  onCreateCustom,
}: BarcodeScannerProps) {
  const { t } = useTranslation();
  const { searchByBarcode, loading, error, lastScannedBarcode } = useBarcodeSearch();
  
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [foundFood, setFoundFood] = useState<FoodSearchResult | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera preview when dialog opens
  useEffect(() => {
    if (open && !manualMode) {
      const timeoutId = setTimeout(() => {
        startCameraPreview();
      }, 150);
      return () => {
        clearTimeout(timeoutId);
        stopCamera();
      };
    }

    return () => {
      stopCamera();
    };
  }, [open, manualMode]);

  const startCameraPreview = async () => {
    setScannerState('idle');
    setCameraError(null);
    setCapturedImage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScannerState('preview');
      }
    } catch (err) {
      console.error('Failed to start camera:', err);
      setCameraError(
        err instanceof Error 
          ? err.message 
          : 'Camera access denied. Please grant camera permissions.'
      );
      setScannerState('error');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setScannerState('capturing');
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    
    // Save captured image for display
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(imageDataUrl);
    
    // Convert to blob for analysis
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setScannerState('error');
        setCameraError('Failed to capture image');
        return;
      }
      
      const file = new File([blob], 'barcode.jpg', { type: 'image/jpeg' });
      await analyzeImage(file);
    }, 'image/jpeg', 0.95);
  }, []);

  const analyzeImage = async (imageFile: File) => {
    setScannerState('analyzing');
    
    try {
      const html5QrCode = new Html5Qrcode('temp-scanner-container', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
        useBarCodeDetectorIfSupported: true,
      });
      
      const decodedText = await html5QrCode.scanFile(imageFile, false);
      
      // Barcode found - lookup product
      await lookupProduct(decodedText);
      
      html5QrCode.clear();
    } catch (err) {
      // No barcode detected in image
      console.log('No barcode detected:', err);
      setScannerState('no_barcode');
    }
  };

  const lookupProduct = async (barcode: string) => {
    try {
      const food = await searchByBarcode(barcode);
      
      if (food) {
        setFoundFood(food);
        setScannerState('found');
      } else {
        setScannerState('not_found');
      }
    } catch (error) {
      console.error('Error looking up product:', error);
      setScannerState('error');
      setCameraError('Failed to look up product. Please try again.');
    }
  };

  const handleManualSearch = async () => {
    if (!manualBarcode.trim()) return;
    
    setScannerState('analyzing');
    const food = await searchByBarcode(manualBarcode.trim());
    
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
      handleClose();
    }
  };

  const handleCreateCustom = () => {
    if (lastScannedBarcode && onCreateCustom) {
      onCreateCustom(lastScannedBarcode);
    }
    handleClose();
  };

  const handleRetake = () => {
    setFoundFood(null);
    setCapturedImage(null);
    setManualBarcode('');
    setScannerState('idle');
    if (!manualMode) {
      startCameraPreview();
    }
  };

  const handleClose = () => {
    stopCamera();
    setFoundFood(null);
    setCapturedImage(null);
    setManualBarcode('');
    setManualMode(false);
    setScannerState('idle');
    setCameraError(null);
    onOpenChange(false);
  };

  const toggleManualMode = () => {
    if (!manualMode) {
      stopCamera();
    }
    setManualMode(!manualMode);
    setCapturedImage(null);
    setScannerState('idle');
  };

  const showCaptureUI = scannerState === 'preview' || scannerState === 'idle';
  const showCapturedImage = scannerState === 'capturing' || scannerState === 'analyzing' || scannerState === 'no_barcode';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            {t('nutrition.scanBarcode', 'Scan Barcode')}
          </DialogTitle>
        </DialogHeader>

        {/* Hidden temp container for html5-qrcode scanFile */}
        <div id="temp-scanner-container" className="hidden" />
        
        {/* Hidden canvas for capturing frames */}
        <canvas ref={canvasRef} className="hidden" />

        <div className="space-y-4">
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

          {/* Camera Preview View */}
          {!manualMode && scannerState !== 'found' && scannerState !== 'not_found' && (
            <div className="relative">
              {/* Live video preview */}
              {showCaptureUI && (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full aspect-[4/3] bg-muted rounded-lg object-cover"
                  />
                  
                  {/* Overlay with targeting guide */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-sm text-white font-medium mb-3 bg-black/50 px-3 py-1 rounded-full">
                      {t('nutrition.barcode.positionBarcode', 'Position barcode in frame')}
                    </p>
                    <div className="w-[80%] max-w-72 h-28 border-2 border-white/80 rounded-lg relative">
                      <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-3 border-l-3 border-primary rounded-tl" />
                      <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-3 border-r-3 border-primary rounded-tr" />
                      <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-3 border-l-3 border-primary rounded-bl" />
                      <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-3 border-r-3 border-primary rounded-br" />
                    </div>
                  </div>
                  
                  {/* Capture Button */}
                  {scannerState === 'preview' && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                      <Button
                        onClick={captureFrame}
                        size="lg"
                        className="rounded-full h-16 w-16 p-0 shadow-lg"
                      >
                        <Circle className="h-8 w-8 fill-current" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Captured image display */}
              {showCapturedImage && capturedImage && (
                <div className="relative">
                  <img 
                    src={capturedImage} 
                    alt="Captured barcode" 
                    className="w-full aspect-[4/3] bg-muted rounded-lg object-cover"
                  />
                  
                  {/* Analyzing overlay */}
                  {scannerState === 'analyzing' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                      <div className="text-center">
                        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                        <p className="text-sm font-medium mt-2">
                          {t('nutrition.barcode.analyzingImage', 'Analyzing barcode...')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* No barcode detected */}
                  {scannerState === 'no_barcode' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                      <div className="text-center p-4">
                        <X className="h-10 w-10 mx-auto text-muted-foreground" />
                        <p className="font-medium mt-2">
                          {t('nutrition.barcode.noBarcodeDetected', 'No barcode detected')}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('nutrition.barcode.tryAgainTip', 'Make sure the barcode is clear and well-lit')}
                        </p>
                        <div className="flex gap-2 mt-4 justify-center">
                          <Button variant="outline" size="sm" onClick={handleRetake}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            {t('nutrition.barcode.retake', 'Retake')}
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

              {/* Camera starting state */}
              {scannerState === 'idle' && !manualMode && (
                <div className="w-full aspect-[4/3] bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">
                      {t('nutrition.barcode.startingCamera', 'Starting camera...')}
                    </p>
                  </div>
                </div>
              )}

              {/* Camera error */}
              {scannerState === 'error' && cameraError && (
                <div className="w-full aspect-[4/3] bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center p-4">
                    <CameraOff className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-destructive mt-2">{cameraError}</p>
                    <div className="flex gap-2 mt-4 justify-center">
                      <Button variant="outline" size="sm" onClick={startCameraPreview}>
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
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder={t('nutrition.barcode.enterBarcode', 'Enter barcode (e.g., 0123456789012)')}
                  className="text-center text-lg tracking-widest"
                  autoFocus
                />
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
                <Button variant="outline" onClick={handleRetake} className="flex-1">
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
                <Button variant="outline" onClick={handleRetake} className="flex-1">
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
