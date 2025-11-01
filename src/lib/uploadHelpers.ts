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
