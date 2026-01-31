/**
 * Frame Extraction Utilities for Video Analysis
 * Extracts key frames from video files for AI analysis
 */

/**
 * Extracts key frames from a video file for analysis
 * @param videoFile - The video file to extract frames from
 * @param landingTime - Optional user-marked landing time (in seconds)
 * @returns Promise with array of base64 JPEG data URLs
 */
export const extractKeyFrames = async (
  videoFile: File,
  landingTime?: number | null
): Promise<string[]> => {
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
      reject(new Error('Frame extraction timed out after 30 seconds'));
    }, 30000);

    const cleanup = () => {
      clearTimeout(timeout);
      if (video.src) {
        URL.revokeObjectURL(video.src);
      }
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('error', onError);
    };

    const onLoadedMetadata = async () => {
      console.log('[FRAME EXTRACTION] Video metadata loaded:', {
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

      // Resize frames to max 512px dimension to reduce payload size
      // This matches RealTimePlayback implementation and keeps API calls efficient
      const maxDim = 512;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > height) {
        if (width > maxDim) {
          height = (height / width) * maxDim;
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = (width / height) * maxDim;
          height = maxDim;
        }
      }

      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      
      const duration = video.duration;
      const frames: string[] = [];
      
      let timestamps: number[];
      
      if (landingTime != null && landingTime > 0 && landingTime < duration) {
        // User marked landing - extract frames centered around that moment
        // -0.4s, -0.2s, -0.1s, landing, +0.1s, +0.2s, +0.3s
        const offsets = [-0.4, -0.2, -0.1, 0, 0.1, 0.2, 0.3];
        timestamps = offsets
          .map(offset => landingTime + offset)
          .filter(t => t >= 0 && t <= duration);
        console.log('[FRAME EXTRACTION] Using landing-centered timestamps:', timestamps);
      } else {
        // Auto-extraction: 7 frames across the motion (10%, 25%, 40%, 50%, 60%, 75%, 90%)
        // Focused on middle portion where landing typically occurs
        timestamps = [0.10, 0.25, 0.40, 0.50, 0.60, 0.75, 0.90]
          .map(pct => pct * duration);
        console.log('[FRAME EXTRACTION] Using auto-detected timestamps:', timestamps);
      }
      
      try {
        for (let i = 0; i < timestamps.length; i++) {
          const time = timestamps[i];
          video.currentTime = time;
          
          // Wait for seek to complete
          await new Promise<void>((res, rej) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              video.removeEventListener('error', onSeekError);
              res();
            };
            const onSeekError = () => {
              video.removeEventListener('seeked', onSeeked);
              video.removeEventListener('error', onSeekError);
              rej(new Error('Failed to seek to frame'));
            };
            video.addEventListener('seeked', onSeeked, { once: true });
            video.addEventListener('error', onSeekError, { once: true });
          });
          
          // Draw frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to JPEG data URL (80% quality for balance of size/clarity)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          if (dataUrl && dataUrl !== 'data:,' && dataUrl.length > 100) {
            frames.push(dataUrl);
            console.log(`[FRAME EXTRACTION] Frame ${i + 1}/${timestamps.length} captured at ${time.toFixed(2)}s`);
          } else {
            console.warn(`[FRAME EXTRACTION] Frame ${i + 1} capture failed at ${time.toFixed(2)}s`);
          }
        }
        
        cleanup();
        
        if (frames.length < 3) {
          reject(new Error(`Only captured ${frames.length} frames, need at least 3 for analysis`));
          return;
        }
        
        console.log(`[FRAME EXTRACTION] Successfully extracted ${frames.length} frames`);
        resolve(frames);
      } catch (extractError) {
        cleanup();
        reject(extractError);
      }
    };

    const onError = (e: Event) => {
      cleanup();
      console.error('[FRAME EXTRACTION] Video element error:', e);
      reject(new Error(`Video failed to load: ${video.error?.message || 'Unknown error'}`));
    };

    // Attach event listeners
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('error', onError);

    // Set video properties
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    // Load video
    try {
      video.src = URL.createObjectURL(videoFile);
      console.log('[FRAME EXTRACTION] Video loading started for:', videoFile.name);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
};

/**
 * Calculates the landing frame index based on user-marked landing time
 * When landing is marked, frames are extracted centered around landing.
 * The landing frame is always at index 3 (center of 7 frames).
 * @param landingTime - The user-marked landing time in seconds
 * @returns The index of the landing frame (3), or null if no landing was marked
 */
export const calculateLandingFrameIndex = (
  landingTime: number | null
): number | null => {
  if (landingTime == null || landingTime <= 0) return null;
  
  // For landing-centered extraction, the landing frame is at index 3 (center of 7 frames)
  // The offsets are: [-0.4, -0.2, -0.1, 0 (landing), 0.1, 0.2, 0.3]
  return 3;
};
