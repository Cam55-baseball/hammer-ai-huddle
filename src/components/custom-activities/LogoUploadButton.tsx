import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadCustomLogo } from '@/lib/uploadHelpers';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface LogoUploadButtonProps {
  currentUrl?: string;
  onUpload: (url: string) => void;
  onRemove: () => void;
  className?: string;
}

export function LogoUploadButton({ currentUrl, onUpload, onRemove, className }: LogoUploadButtonProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!user) {
      toast.error(t('common.error'));
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadCustomLogo(file, user.id, 'activity');
      onUpload(url);
      toast.success(t('customActivity.cardCustomization.logoUploaded', 'Logo uploaded!'));
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : t('common.error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  if (currentUrl) {
    return (
      <div className={cn("relative group", className)}>
        <div className="w-20 h-20 rounded-lg border overflow-hidden bg-muted">
          <img 
            src={currentUrl} 
            alt="Custom logo" 
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
        </div>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleInputChange}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={isUploading}
        className={cn(
          "w-full p-4 rounded-lg border-2 border-dashed transition-colors flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-foreground cursor-pointer",
          isDragging && "border-primary bg-primary/5",
          isUploading && "opacity-50 cursor-not-allowed"
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>{t('customActivity.cardCustomization.uploadingLogo', 'Uploading...')}</span>
          </>
        ) : (
          <>
            <Image className="h-6 w-6" />
            <span>{t('customActivity.cardCustomization.dragDropLogo', 'Drag & drop or click to upload')}</span>
            <span className="text-xs text-muted-foreground">
              {t('customActivity.cardCustomization.logoFormats', 'JPG, PNG, WebP, or SVG (max 2MB)')}
            </span>
          </>
        )}
      </button>
    </div>
  );
}
