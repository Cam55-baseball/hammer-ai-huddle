import { encode } from "blurhash";

/**
 * Convert a canvas to WebP blob
 */
export const canvasToWebP = async (
  canvas: HTMLCanvasElement,
  quality: number = 0.85
): Promise<Blob | null> => {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      'image/webp',
      quality
    );
  });
};

/**
 * Generate multiple sizes of a thumbnail
 */
export const generateThumbnailSizes = async (
  originalBlob: Blob
): Promise<{ small: Blob; medium: Blob; large: Blob }> => {
  const img = await createImageBitmap(originalBlob);
  
  const sizes = {
    small: { width: 150, height: 85 },
    medium: { width: 400, height: 225 },
    large: { width: 800, height: 450 }
  };

  const createCanvas = (width: number, height: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, width, height);
    }
    return canvas;
  };

  const [smallBlob, mediumBlob, largeBlob] = await Promise.all([
    canvasToWebP(createCanvas(sizes.small.width, sizes.small.height)),
    canvasToWebP(createCanvas(sizes.medium.width, sizes.medium.height)),
    canvasToWebP(createCanvas(sizes.large.width, sizes.large.height))
  ]);

  return {
    small: smallBlob!,
    medium: mediumBlob!,
    large: largeBlob!
  };
};

/**
 * Generate Blurhash string from image
 */
export const generateBlurhash = async (imageBlob: Blob): Promise<string> => {
  const img = await createImageBitmap(imageBlob);
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) throw new Error('Canvas context not supported');
  
  // Use small size for blurhash generation (faster)
  canvas.width = 32;
  canvas.height = 32;
  
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  
  return encode(imageData.data, imageData.width, imageData.height, 4, 3);
};

/**
 * Convert video frame to optimized WebP thumbnail with multiple sizes
 */
export const processVideoThumbnail = async (
  videoFile: File,
  timeInSeconds: number = 0.1
): Promise<{
  originalBlob: Blob;
  webpBlob: Blob;
  sizes: { small: Blob; medium: Blob; large: Blob };
  blurhash: string;
}> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas 2D context not supported'));
      return;
    }

    const cleanup = () => {
      if (video.src) URL.revokeObjectURL(video.src);
    };

    video.addEventListener('loadedmetadata', async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.currentTime = Math.min(timeInSeconds, video.duration * 0.1);
    });

    video.addEventListener('seeked', async () => {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Generate original JPEG
        const originalBlob = await new Promise<Blob>((res, rej) => {
          canvas.toBlob(
            (blob) => blob ? res(blob) : rej(new Error('Failed to create blob')),
            'image/jpeg',
            0.85
          );
        });

        // Convert to WebP
        const webpBlob = await canvasToWebP(canvas, 0.85);
        if (!webpBlob) throw new Error('Failed to create WebP blob');

        // Generate multiple sizes
        const sizes = await generateThumbnailSizes(webpBlob);

        // Generate blurhash
        const blurhash = await generateBlurhash(sizes.small);

        cleanup();
        resolve({ originalBlob, webpBlob, sizes, blurhash });
      } catch (error) {
        cleanup();
        reject(error);
      }
    });

    video.addEventListener('error', () => {
      cleanup();
      reject(new Error('Video failed to load'));
    });

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(videoFile);
  });
};
