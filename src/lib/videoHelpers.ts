import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a thumbnail image from a video file with enhanced error handling
 * @param videoFile - The video file to generate thumbnail from
 * @param timeInSeconds - Time position to capture (default: 0.1 to avoid black frames)
 * @returns Promise with blob of the thumbnail image
 */
export const generateVideoThumbnail = async (
  videoFile: File,
  timeInSeconds: number = 0.1
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas 2D context not supported'));
      return;
    }

    // Timeout to prevent hanging
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Thumbnail generation timed out after 10 seconds'));
    }, 10000);

    const cleanup = () => {
      clearTimeout(timeout);
      if (video.src) {
        URL.revokeObjectURL(video.src);
      }
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };

    const onLoadedMetadata = () => {
      console.log('Video metadata loaded:', {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      });

      // Verify video has valid dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        cleanup();
        reject(new Error('Video has invalid dimensions'));
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Seek to a safe time (0.1 seconds or 10% into video)
      const seekTime = Math.min(timeInSeconds, video.duration * 0.1);
      console.log('Seeking to time:', seekTime);
      video.currentTime = seekTime;
    };

    const onSeeked = () => {
      console.log('Video seeked successfully, capturing frame...');
      
      try {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (blob) {
              console.log('Thumbnail blob created:', blob.size, 'bytes');
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/jpeg',
          0.85
        );
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    const onError = (e: Event) => {
      cleanup();
      console.error('Video element error:', e);
      reject(new Error(`Video failed to load: ${video.error?.message || 'Unknown error'}`));
    };

    // Attach event listeners
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);

    // Set video properties
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous'; // Handle CORS if needed
    
    // Load video
    try {
      video.src = URL.createObjectURL(videoFile);
      console.log('Video loading started for:', videoFile.name);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
};

/**
 * Uploads a thumbnail to Supabase storage
 * @param thumbnailBlob - The thumbnail image blob
 * @param userId - User ID for file path organization
 * @param videoFileName - Original video file name for reference
 * @returns Promise with public URL of uploaded thumbnail
 */
export const uploadVideoThumbnail = async (
  thumbnailBlob: Blob,
  userId: string,
  videoFileName: string
): Promise<string> => {
  // Create thumbnail file name based on video file name
  const thumbnailFileName = `${userId}/thumbnails/${Date.now()}_thumb.jpg`;
  
  // Upload to videos bucket (we can use the same bucket)
  const { error: uploadError } = await supabase.storage
    .from('videos')
    .upload(thumbnailFileName, thumbnailBlob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false
    });
  
  if (uploadError) throw uploadError;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('videos')
    .getPublicUrl(thumbnailFileName);
  
  return publicUrl;
};
