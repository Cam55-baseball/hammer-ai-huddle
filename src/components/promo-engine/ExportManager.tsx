import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Play, Download, Clock, AlertTriangle, Film, Loader2 } from 'lucide-react';
import {
  usePromoProjects,
  useRenderQueue,
  useQueueRender,
  useDeleteProject,
  FORMAT_CONFIGS,
  getDurationForVariant,
  type PromoProject,
} from '@/hooks/usePromoEngine';
import { usePromoScenes } from '@/hooks/usePromoEngine';

const STATUS_BADGES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
  draft: { variant: 'secondary', label: 'Draft' },
  rendering: { variant: 'default', label: 'Rendering' },
  complete: { variant: 'outline', label: 'Complete' },
  failed: { variant: 'destructive', label: 'Failed' },
};

export const ExportManager = () => {
  const { data: projects = [], isLoading } = usePromoProjects();
  const { data: scenes = [] } = usePromoScenes();
  const { data: renderJobs = [] } = useRenderQueue();
  const queueRender = useQueueRender();
  const deleteProject = useDeleteProject();

  const hasOutdatedScenes = (project: PromoProject) => {
    const seq = project.scene_sequence || [];
    return seq.some((item: any) => {
      const scene = scenes.find(s => s.id === item.scene_id);
      return scene?.status === 'outdated';
    });
  };

  const getProjectDuration = (project: PromoProject) => {
    const seq = project.scene_sequence || [];
    return seq.reduce((sum: number, item: any) => sum + getDurationForVariant(item.duration_variant), 0);
  };

  const getLatestJob = (projectId: string) => {
    return renderJobs.find(j => j.project_id === projectId);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Render Queue Summary */}
      {renderJobs.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Render Queue</h3>
          <div className="space-y-2">
            {renderJobs.slice(0, 5).map(job => (
              <div key={job.id} className="flex items-center justify-between text-sm bg-muted/50 rounded-md p-2">
                <div className="flex items-center gap-2">
                  {job.status === 'processing' ? (
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  ) : (
                    <Film className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-mono text-xs">{job.format}</span>
                </div>
                <div className="flex items-center gap-2">
                  {job.error_message && (
                    <span className="text-xs text-destructive truncate max-w-[200px]" title={job.error_message}>
                      {job.error_message}
                    </span>
                  )}
                  <Badge variant={
                    job.status === 'complete' ? 'outline' :
                    job.status === 'failed' ? 'destructive' :
                    job.status === 'processing' ? 'default' : 'secondary'
                  } className="text-xs">
                    {job.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Projects */}
      <div className="space-y-4">
        {projects.map(project => {
          const outdated = hasOutdatedScenes(project);
          const formatConfig = FORMAT_CONFIGS[project.format];
          const statusConfig = STATUS_BADGES[project.status] || STATUS_BADGES.draft;
          const latestJob = getLatestJob(project.id);
          const seq = (project.scene_sequence || []) as any[];
          const isRendering = project.status === 'rendering' || latestJob?.status === 'processing';

          return (
            <Card key={project.id} className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{project.title}</h3>
                    {outdated && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle className="h-3 w-3" /> Outdated Scenes
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="capitalize">{project.target_audience}</span>
                    <span>•</span>
                    <span className="capitalize">{project.video_goal.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>{formatConfig?.label || project.format}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{getProjectDuration(project)}s</span>
                  </div>
                </div>
                <Badge variant={statusConfig.variant} className="text-xs">{statusConfig.label}</Badge>
              </div>

              {/* Failed job error */}
              {latestJob?.status === 'failed' && latestJob.error_message && (
                <div className="text-xs text-destructive bg-destructive/10 rounded-md p-2.5">
                  <strong>Error:</strong> {latestJob.error_message}
                </div>
              )}

              {/* Video preview */}
              {project.output_url && (
                <div className="rounded-lg overflow-hidden border bg-black">
                  <video
                    src={project.output_url}
                    controls
                    className="w-full max-h-[400px]"
                    preload="metadata"
                  />
                </div>
              )}

              {/* Scene sequence mini-preview */}
              <div className="flex gap-1 overflow-x-auto pb-1">
                {seq.map((item: any, i: number) => (
                  <Badge key={i} variant="outline" className="text-[10px] shrink-0">
                    {item.title} ({item.duration_variant})
                  </Badge>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => queueRender.mutate({ projectId: project.id, format: project.format })}
                  disabled={queueRender.isPending || isRendering}
                >
                  {isRendering ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Rendering...</>
                  ) : (
                    <><Play className="h-3.5 w-3.5" /> Queue Render</>
                  )}
                </Button>

                {project.output_url && (
                  <Button variant="outline" size="sm" className="gap-1.5" asChild>
                    <a href={project.output_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  </Button>
                )}

                <div className="flex-1" />

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => deleteProject.mutate(project.id)}
                  disabled={deleteProject.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </Card>
          );
        })}

        {projects.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Film className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No projects yet</p>
            <p className="text-sm mt-1">Use the Story Builder to create your first video project</p>
          </div>
        )}
      </div>
    </div>
  );
};
