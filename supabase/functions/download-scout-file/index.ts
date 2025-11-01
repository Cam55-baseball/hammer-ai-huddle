import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[DOWNLOAD-SCOUT-FILE] Function started');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[DOWNLOAD-SCOUT-FILE] No authorization header');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[DOWNLOAD-SCOUT-FILE] Authentication failed:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[DOWNLOAD-SCOUT-FILE] User authenticated:', user.id);

    // Check if user is owner
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .maybeSingle();

    const isOwner = !roleError && roleData !== null;
    console.log('[DOWNLOAD-SCOUT-FILE] Is owner:', isOwner);

    // Parse request body
    const { bucket, path } = await req.json();
    console.log('[DOWNLOAD-SCOUT-FILE] Request params:', { bucket, path });

    // Validate bucket name
    const validBuckets = ['scout-letters', 'scout-videos'];
    if (!validBuckets.includes(bucket)) {
      console.error('[DOWNLOAD-SCOUT-FILE] Invalid bucket:', bucket);
      return new Response(JSON.stringify({ error: 'Invalid bucket' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate path format (should be user_id/filename)
    if (!path || typeof path !== 'string' || path.includes('..')) {
      console.error('[DOWNLOAD-SCOUT-FILE] Invalid path:', path);
      return new Response(JSON.stringify({ error: 'Invalid path' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only owners can access files
    if (!isOwner) {
      console.error('[DOWNLOAD-SCOUT-FILE] User is not owner');
      return new Response(JSON.stringify({ error: 'Forbidden - Owner access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create admin client for storage access
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Download file from storage
    console.log('[DOWNLOAD-SCOUT-FILE] Downloading file from storage');
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(bucket)
      .download(path);

    if (downloadError || !fileData) {
      console.error('[DOWNLOAD-SCOUT-FILE] Download failed:', downloadError);
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[DOWNLOAD-SCOUT-FILE] File downloaded successfully');

    // Determine content type based on file extension
    const fileName = path.split('/').pop() || 'file';
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    
    let contentType = 'application/octet-stream';
    if (fileExt === 'pdf') contentType = 'application/pdf';
    else if (fileExt === 'mp4') contentType = 'video/mp4';
    else if (fileExt === 'mov') contentType = 'video/quicktime';
    else if (fileExt === 'avi') contentType = 'video/x-msvideo';
    else if (fileExt === 'webm') contentType = 'video/webm';
    else if (['jpg', 'jpeg'].includes(fileExt)) contentType = 'image/jpeg';
    else if (fileExt === 'png') contentType = 'image/png';
    else if (fileExt === 'gif') contentType = 'image/gif';

    // Return file with proper headers
    return new Response(fileData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });

  } catch (error) {
    console.error('[DOWNLOAD-SCOUT-FILE] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
