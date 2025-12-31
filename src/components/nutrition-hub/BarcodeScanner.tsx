import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScanBarcode, Camera, CameraOff, Loader2, X, Keyboard, RotateCcw, Plus, Circle, Lightbulb } from 'lucide-react';
import { useBarcodeSearch } from '@/hooks/useBarcodeSearch';
import { FoodSearchResult } from '@/hooks/useFoodSearch';
import { cn } from '@/lib/utils';

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFoodFound: (food: FoodSearchResult) => void;
  onCreateCustom?: (barcode: string) => void;
}

type ScannerState = 'idle' | 'starting' | 'preview' | 'capturing' | 'analyzing' | 'found' | 'not_found' | 'no_barcode' | 'error';

const SUPPORTED_FORMATS = [
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
];

// Native BarcodeDetector format mapping
const NATIVE_FORMATS = [
  'upc_a', 'upc_e', 'ean_8', 'ean_13', 
  'code_128', 'code_39', 'code_93', 'codabar', 'itf', 'qr_code'
];

export function BarcodeScanner({
  open,
  onOpenChange,
  onFoodFound,
  onCreateCustom,
}: BarcodeScannerProps) {
  const { t } = useTranslation();
  const { searchByBarcode, loading, lastScannedBarcode } = useBarcodeSearch();
  
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [foundFood, setFoundFood] = useState<FoodSearchResult | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      stopCamera();
      cleanupDecoder();
    };
  }, []);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      stopCamera();
      cleanupDecoder();
      resetState();
    }
  }, [open]);

  const resetState = () => {
    setFoundFood(null);
    setCapturedImage(null);
    setManualBarcode('');
    setManualMode(false);
    setScannerState('idle');
    setCameraError(null);
    setIsVideoReady(false);
    setTorchOn(false);
  };

  const cleanupDecoder = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.clear();
      } catch (e) {
        // Ignore cleanup errors
      }
      html5QrCodeRef.current = null;
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
    setIsVideoReady(false);
    setTorchSupported(false);
  };

  // Start camera - called directly from user gesture (button click)
  const startCamera = async () => {
    setScannerState('starting');
    setCameraError(null);
    setCapturedImage(null);
    setIsVideoReady(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 }
        }
      });
      
      streamRef.current = stream;
      
      // Check for torch support
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities?.() as any;
      if (capabilities?.torch) {
        setTorchSupported(true);
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play()
              .then(() => {
                // Additional check for video dimensions
                const checkReady = () => {
                  if (videoRef.current && 
                      videoRef.current.videoWidth > 0 && 
                      videoRef.current.videoHeight > 0 &&
                      videoRef.current.readyState >= 2) {
                    setIsVideoReady(true);
                    setScannerState('preview');
                  } else {
                    requestAnimationFrame(checkReady);
                  }
                };
                checkReady();
              })
              .catch(err => {
                console.error('Failed to play video:', err);
                setCameraError('Failed to start video playback');
                setScannerState('error');
              });
          }
        };
      }
    } catch (err) {
      console.error('Failed to start camera:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      if (errorMessage.includes('Permission') || errorMessage.includes('NotAllowed')) {
        setCameraError('Camera access denied. Please grant camera permissions in your browser settings.');
      } else if (errorMessage.includes('NotFound') || errorMessage.includes('DevicesNotFound')) {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError(`Camera error: ${errorMessage}`);
      }
      setScannerState('error');
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    
    const videoTrack = streamRef.current.getVideoTracks()[0];
    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: !torchOn } as any]
      });
      setTorchOn(!torchOn);
    } catch (e) {
      console.error('Failed to toggle torch:', e);
    }
  };

  // Capture frame using ImageCapture API (high quality) or canvas fallback
  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !isVideoReady) return;
    
    setScannerState('capturing');
    
    const video = videoRef.current;
    
    try {
      let imageBlob: Blob;
      
      // Try ImageCapture API first (higher quality)
      if ('ImageCapture' in window && streamRef.current) {
        try {
          const track = streamRef.current.getVideoTracks()[0];
          const imageCapture = new (window as any).ImageCapture(track);
          imageBlob = await imageCapture.takePhoto();
        } catch (e) {
          console.log('ImageCapture failed, falling back to canvas:', e);
          imageBlob = await captureViaCanvas(video);
        }
      } else {
        imageBlob = await captureViaCanvas(video);
      }
      
      // Save captured image for display
      const imageDataUrl = URL.createObjectURL(imageBlob);
      setCapturedImage(imageDataUrl);
      
      // Analyze the image
      const file = new File([imageBlob], 'barcode.jpg', { type: 'image/jpeg' });
      await analyzeWithBurstRetry(file, video);
      
    } catch (err) {
      console.error('Capture failed:', err);
      setScannerState('error');
      setCameraError('Failed to capture image. Please try again.');
    }
  }, [isVideoReady]);

  const captureViaCanvas = (video: HTMLVideoElement): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        reject(new Error('Canvas not available'));
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/jpeg', 0.95);
    });
  };

  // Burst retry - try multiple frames if first decode fails
  const analyzeWithBurstRetry = async (initialFile: File, video: HTMLVideoElement) => {
    setScannerState('analyzing');
    
    // Try initial capture first
    let result = await tryDecode(initialFile);
    if (result) {
      await lookupProduct(result);
      return;
    }
    
    // Burst retry: capture 2 more frames with delays
    for (let attempt = 0; attempt < 2; attempt++) {
      await new Promise(r => setTimeout(r, 150));
      
      if (!videoRef.current || !streamRef.current) break;
      
      try {
        const blob = await captureViaCanvas(video);
        const file = new File([blob], `barcode-${attempt}.jpg`, { type: 'image/jpeg' });
        result = await tryDecode(file);
        
        if (result) {
          await lookupProduct(result);
          return;
        }
      } catch (e) {
        console.log(`Burst attempt ${attempt + 1} failed:`, e);
      }
    }
    
    // All attempts failed
    setScannerState('no_barcode');
  };

  // Try decoding with native BarcodeDetector first, then html5-qrcode
  const tryDecode = async (imageFile: File): Promise<string | null> => {
    // Try native BarcodeDetector first (faster, more reliable on supported browsers)
    if ('BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: NATIVE_FORMATS });
        const imageBitmap = await createImageBitmap(imageFile);
        const barcodes = await detector.detect(imageBitmap);
        
        if (barcodes.length > 0) {
          console.log('Native BarcodeDetector found:', barcodes[0].rawValue);
          return barcodes[0].rawValue;
        }
      } catch (e) {
        console.log('Native BarcodeDetector failed:', e);
      }
    }
    
    // Fallback to html5-qrcode
    try {
      // Create a fresh instance for each scan
      const tempId = `scanner-${Date.now()}`;
      const tempDiv = document.createElement('div');
      tempDiv.id = tempId;
      tempDiv.style.display = 'none';
      document.body.appendChild(tempDiv);
      
      const html5QrCode = new Html5Qrcode(tempId, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
        useBarCodeDetectorIfSupported: true,
      });
      
      try {
        const decodedText = await html5QrCode.scanFile(imageFile, false);
        console.log('html5-qrcode found:', decodedText);
        await html5QrCode.clear();
        document.body.removeChild(tempDiv);
        return decodedText;
      } catch (e) {
        await html5QrCode.clear();
        document.body.removeChild(tempDiv);
        throw e;
      }
    } catch (e) {
      // No barcode found
      return null;
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
    setScannerState('preview');
    // Camera stream is still running, just reset state
  };

  const handleClose = () => {
    stopCamera();
    cleanupDecoder();
    resetState();
    onOpenChange(false);
  };

  const toggleManualMode = () => {
    if (!manualMode) {
      stopCamera();
    } else {
      // Switching back to camera - start it
      startCamera();
    }
    setManualMode(!manualMode);
    setCapturedImage(null);
    setScannerState('idle');
  };

  // Handle initial camera start when opening in camera mode
  const handleOpenCamera = () => {
    setManualMode(false);
    startCamera();
  };

  const showCaptureUI = (scannerState === 'preview' || scannerState === 'starting') && !manualMode;
  const showCapturedImage = (scannerState === 'capturing' || scannerState === 'analyzing' || scannerState === 'no_barcode') && !manualMode;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            {t('nutrition.scanBarcode', 'Scan Barcode')}
          </DialogTitle>
        </DialogHeader>

        {/* Hidden canvas for capturing frames */}
        <canvas ref={canvasRef} className="hidden" />

        <div className="space-y-4">
          {/* Scanner / Manual Input Toggle */}
          <div className="flex gap-2">
            <Button
              variant={!manualMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (manualMode) {
                  handleOpenCamera();
                }
              }}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              {t('nutrition.barcode.camera', 'Camera')}
            </Button>
            <Button
              variant={manualMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (!manualMode) {
                  toggleManualMode();
                }
              }}
              className="flex-1"
            >
              <Keyboard className="h-4 w-4 mr-2" />
              {t('nutrition.barcode.manual', 'Manual')}
            </Button>
          </div>

          {/* Initial state - prompt to start camera */}
          {!manualMode && scannerState === 'idle' && (
            <div className="w-full aspect-[4/3] bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center p-4">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  {t('nutrition.barcode.tapToStart', 'Tap to start the camera and scan a barcode')}
                </p>
                <Button onClick={startCamera} size="lg">
                  <Camera className="h-4 w-4 mr-2" />
                  {t('nutrition.barcode.startCamera', 'Start Camera')}
                </Button>
              </div>
            </div>
          )}

          {/* Camera Preview View */}
          {!manualMode && scannerState !== 'found' && scannerState !== 'not_found' && scannerState !== 'idle' && (
            <div className="relative">
              {/* Live video preview - always mounted when camera is active */}
              <div className={cn("relative", showCapturedImage && "hidden")}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-[4/3] bg-muted rounded-lg object-cover"
                />
                
                {/* Starting state overlay */}
                {scannerState === 'starting' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <p className="text-sm text-muted-foreground mt-2">
                        {t('nutrition.barcode.startingCamera', 'Starting camera...')}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Preview overlay with targeting guide */}
                {scannerState === 'preview' && (
                  <>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-sm text-white font-medium mb-3 bg-black/60 px-3 py-1.5 rounded-full shadow-lg">
                        {t('nutrition.barcode.positionBarcode', 'Position barcode in frame')}
                      </p>
                      <div className="w-[80%] max-w-72 h-28 border-2 border-white/80 rounded-lg relative">
                        <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-3 border-l-3 border-primary rounded-tl" />
                        <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-3 border-r-3 border-primary rounded-tr" />
                        <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-3 border-l-3 border-primary rounded-bl" />
                        <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-3 border-r-3 border-primary rounded-br" />
                      </div>
                      <p className="text-xs text-white/80 mt-2 bg-black/40 px-2 py-1 rounded">
                        {t('nutrition.barcode.holdSteady', 'Hold steady in good lighting')}
                      </p>
                    </div>
                    
                    {/* Torch toggle */}
                    {torchSupported && (
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                          "absolute top-3 right-3 bg-background/80 backdrop-blur-sm",
                          torchOn && "bg-yellow-500/20 border-yellow-500"
                        )}
                        onClick={toggleTorch}
                      >
                        <Lightbulb className={cn("h-4 w-4", torchOn && "text-yellow-500")} />
                      </Button>
                    )}
                    
                    {/* Capture Button */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                      <Button
                        onClick={captureFrame}
                        size="lg"
                        className="rounded-full h-16 w-16 p-0 shadow-lg"
                        disabled={!isVideoReady}
                      >
                        <Circle className="h-8 w-8 fill-current" />
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Captured image display */}
              {showCapturedImage && capturedImage && (
                <div className="relative">
                  <img 
                    src={capturedImage} 
                    alt="Captured barcode" 
                    className="w-full aspect-[4/3] bg-muted rounded-lg object-cover"
                  />
                  
                  {/* Analyzing overlay */}
                  {(scannerState === 'capturing' || scannerState === 'analyzing') && (
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

              {/* Camera error */}
              {scannerState === 'error' && cameraError && (
                <div className="w-full aspect-[4/3] bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center p-4">
                    <CameraOff className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-destructive mt-2">{cameraError}</p>
                    <div className="flex gap-2 mt-4 justify-center">
                      <Button variant="outline" size="sm" onClick={startCamera}>
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

          {/* Product Not Found */}
          {scannerState === 'not_found' && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <X className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="font-medium mt-2">
                  {t('nutrition.barcode.productNotFound', 'Product Not Found')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('nutrition.barcode.notInDatabase', "This product isn't in our database yet")}
                </p>
                {lastScannedBarcode && (
                  <p className="text-xs text-muted-foreground mt-2 font-mono">
                    {t('nutrition.barcode.scannedCode', 'Barcode')}: {lastScannedBarcode}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleRetake} className="flex-1">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {t('nutrition.barcode.tryAgain', 'Try Again')}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
