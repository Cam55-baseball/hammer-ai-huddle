import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { validAnalysisJobToken } from "../_shared/analysisCanaryAuth.ts";
import { dispatch } from "../_shared/notificationAdapters.ts";
import { hasReadableReport } from "../_shared/analysisReliability.ts";
import { hasActiveRole } from "../_shared/authGuards.ts";

Deno.serve(async req => {
  const json = (body: unknown, status=200) => new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return json({error:"POST required"},405);
  if(!await validAnalysisJobToken(req.headers.get("x-job-token")))return json({error:"Unauthorized"},401);
  const url=Deno.env.get("SUPABASE_URL");const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key)return json({error:"Canary configuration unavailable"},500);
  const sb=createClient(url,key,{auth:{persistSession:false}});
  const lease=crypto.randomUUID();
  const claimed=await sb.rpc("claim_analysis_canary",{p_lease:lease});
  if(claimed.error)return json({error:"Canary lease unavailable"},500);
  const config=claimed.data?.[0];
  if(!config)return json({status:"idle_or_paused"});
  try{
    if(!await hasActiveRole(sb as any,config.owner_id,"owner"))throw new Error("configured_owner_invalid");
    const stored=await sb.storage.from("videos").download(config.request_path);
    if(stored.error||!stored.data)throw new Error("fixture_unreadable");
    const body=JSON.parse(await stored.data.text());
    if(body.videoId!==config.video_id||body.userId!==config.owner_id)throw new Error("fixture_identity_mismatch");
    const response=await fetch(`${url}/functions/v1/analyze-video`,{method:"POST",headers:{"Content-Type":"application/json",apikey:key,"x-job-token":req.headers.get("x-job-token")??"","x-analysis-canary-lease":lease},body:JSON.stringify(body)});
    const result=await response.json();
    const report=result.ai_analysis??result;
    const readback=await sb.from("videos").select("status,ai_analysis").eq("id",config.video_id).eq("user_id",config.owner_id).maybeSingle();
    const ok=response.ok&&result.saved===true&&hasReadableReport(report)&&report.report_status!=="not_measured"&&readback.data?.status==="completed"&&hasReadableReport(readback.data.ai_analysis);
    const paused=[401,402,403,404,422].includes(response.status) ? `terminal_http_${response.status}` : null;
    const persisted=await sb.from("analysis_canary_config").update({last_status:ok?"passed":`failed_http_${response.status}`,paused_reason:paused,lease_until:null,lease_id:null,updated_at:new Date().toISOString()}).eq("id",1).eq("lease_id",lease);
    if(persisted.error)throw new Error("canary_status_save_failed");
    if(!ok)await dispatch({key:"analysis_canary_failed",severity:"critical",title:"Daily video analysis check failed",detail:{status:response.status,reason:paused??"report_not_saved_or_readable"}});
    return json({status:ok?"passed":"failed",paused:!!paused},ok?200:502);
  }catch{
    await sb.from("analysis_canary_config").update({last_status:"fixture_or_service_failure",lease_until:null,lease_id:null}).eq("id",1).eq("lease_id",lease);
    await dispatch({key:"analysis_canary_failed",severity:"critical",title:"Daily video analysis check failed",detail:{reason:"fixture_or_service_failure"}});
    return json({error:"Canary failed; owner alerted"},502);
  }
});