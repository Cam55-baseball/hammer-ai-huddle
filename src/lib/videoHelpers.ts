import { supabase } from "@/integrations/supabase/client";

/**
 * Generates a thumbnail image from a video file
 * @param videoFile - The video file to generate thumbnail from
 * @param timeInSeconds - Time position to capture (default: 0 for first frame)
 * @returns Promise with blob of the thumbnail image
 */
export const generateVideoThumbnail = async (
  videoFile: File,
  timeInSeconds: number = 0
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // Create video element
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    // Create canvas for capturing frame
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }
    
    // Handle video loaded
    video.addEventListener('loadedmetadata', () => {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Seek to specified time
      video.currentTime = timeInSeconds;
    });
    
    // Handle seeking complete
    video.addEventListener('seeked', () => {
      try {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Clean up
              URL.revokeObjectURL(video.src);
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail blob'));
            }
          },
          'image/jpeg',
          0.85 // Quality (0.85 = 85%)
        );
      } catch (error) {
        reject(error);
      }
    });
    
    // Handle errors
    video.addEventListener('error', () => {
      reject(new Error('Failed to load video'));
    });
    
    // Load video file
    video.src = URL.createObjectURL(videoFile);
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
