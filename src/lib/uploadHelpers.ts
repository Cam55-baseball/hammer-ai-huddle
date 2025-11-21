import { supabase } from "@/integrations/supabase/client";

export const uploadScoutLetter = async (
  file: File,
  userId: string
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/letter.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('scout-letters')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('scout-letters')
    .getPublicUrl(fileName);
  
  return publicUrl;
};

export const uploadScoutVideo = async (
  file: File,
  userId: string
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/submission.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('scout-videos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('scout-videos')
    .getPublicUrl(fileName);
  
  return publicUrl;
};

export const uploadCustomThumbnail = async (
  file: File,
  userId: string,
  videoId: string
): Promise<string> => {
  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPG, PNG, or WebP image.');
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 5MB.');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/thumbnails/${videoId}_custom.${fileExt}`;
  
  const { error } = await supabase.storage
    .from('videos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('videos')
    .getPublicUrl(fileName);
  
  return publicUrl;
};

/**
 * Upload optimized WebP thumbnail to Supabase storage
 */
export const uploadOptimizedThumbnail = async (
  webpBlob: Blob,
  userId: string,
  videoId: string,
  format: 'webp' | 'jpg' = 'webp'
): Promise<string> => {
  const fileName = `${videoId}-thumbnail.${format}`;
  const filePath = `${userId}/thumbnails/${fileName}`;
  
  const { error } = await supabase.storage
    .from('videos')
    .upload(filePath, webpBlob, {
      cacheControl: '31536000', // 1 year cache
      upsert: true,
      contentType: `image/${format}`
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('videos')
    .getPublicUrl(filePath);
  
  return publicUrl;
};

/**
 * Upload all thumbnail sizes (small, medium, large)
 */
export const uploadThumbnailSizes = async (
  sizes: { small: Blob; medium: Blob; large: Blob },
  userId: string,
  videoId: string
): Promise<{ small: string; medium: string; large: string }> => {
  const uploadSize = async (blob: Blob, size: string) => {
    const fileName = `${videoId}-${size}.webp`;
    const filePath = `${userId}/thumbnails/${fileName}`;
    
    const { error } = await supabase.storage
      .from('videos')
      .upload(filePath, blob, {
        cacheControl: '31536000',
        upsert: true,
        contentType: 'image/webp'
      });
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);
    
    return publicUrl;
  };
  
  const [small, medium, large] = await Promise.all([
    uploadSize(sizes.small, 'small'),
    uploadSize(sizes.medium, 'medium'),
    uploadSize(sizes.large, 'large')
  ]);
  
  return { small, medium, large };
};
