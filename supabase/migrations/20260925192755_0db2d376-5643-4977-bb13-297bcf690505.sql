-- Video metadata tables were readable by anyone (including signed-out) or by
-- every signed-in user. Restrict to the video owner and owner/admin tooling.
drop policy if exists "Metrics readable by all" on public.video_performance_metrics;
create policy "Video owner or staff read metrics"
on public.video_performance_metrics for select to authenticated
using (
  has_role(auth.uid(), 'owner'::app_role)
  or has_role(auth.uid(), 'admin'::app_role)
  or exists (select 1 from public.library_videos lv where lv.id = video_performance_metrics.video_id and lv.owner_id = auth.uid())
);

drop policy if exists "Assignments readable by all" on public.video_tag_assignments;
create policy "Video owner or staff read assignments"
on public.video_tag_assignments for select to authenticated
using (
  has_role(auth.uid(), 'owner'::app_role)
  or has_role(auth.uid(), 'admin'::app_role)
  or exists (select 1 from public.library_videos lv where lv.id = video_tag_assignments.video_id and lv.owner_id = auth.uid())
);

drop policy if exists "Anyone can read video versions" on public.video_versions;
create policy "Video owner or staff read versions"
on public.video_versions for select to authenticated
using (
  has_role(auth.uid(), 'owner'::app_role)
  or has_role(auth.uid(), 'admin'::app_role)
  or exists (select 1 from public.library_videos lv where lv.id = video_versions.video_id and lv.owner_id = auth.uid())
);