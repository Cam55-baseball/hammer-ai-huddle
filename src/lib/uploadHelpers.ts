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
