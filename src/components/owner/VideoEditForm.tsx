import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, X, FileVideo, Sparkles, Wand2 } from "lucide-react";
import { useVideoLibraryAdmin } from "@/hooks/useVideoLibraryAdmin";
import { useVideoTaxonomy, groupTaxonomyByLayer } from "@/hooks/useVideoTaxonomy";
import { supabase } from "@/integrations/supabase/client";
import type { LibraryVideo, LibraryTag } from "@/hooks/useVideoLibrary";
import type { SkillDomain, TagLayer } from "@/lib/videoRecommendationEngine";
import { toast } from "@/hooks/use-toast";

const VIDEO_FORMATS = ['drill', 'game_at_bat', 'practice_rep', 'breakdown', 'slow_motion', 'pov', 'comparison'];
const SKILL_DOMAINS: SkillDomain[] = ['hitting', 'fielding', 'throwing', 'base_running', 'pitching'];
const LAYER_LABELS: Record<TagLayer, string> = {
  movement_pattern: 'Movement',
  result: 'Result',
  context: 'Context',
  correction: 'Correction',
};

interface VideoEditFormProps {
  video: LibraryVideo;
  tags: LibraryTag[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function VideoEditForm({ video, tags, onSuccess, onCancel }: VideoEditFormProps) {
  const { updateVideo, replaceVideoFile, uploading } = useVideoLibraryAdmin();

  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(video.tags);
  const [selectedSports, setSelectedSports] = useState<string[]>(video.sport);
  const [category, setCategory] = useState(video.category || "");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const sportOptions = ["baseball", "softball"];

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    );
  };

  const toggleSport = (sport: string) => {
    setSelectedSports(prev =>
      prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    if (selectedSports.length === 0) {
      toast({ title: "Select at least one sport", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Step 1: Replace video file if a new one was selected
      if (newFile) {
        const result = await replaceVideoFile(video.id, newFile);
        if (!result) {
          setSaving(false);
          return; // Error already toasted inside the hook
        }
      }

      // Step 2: Update metadata
      const ok = await updateVideo(video.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        tags: selectedTags,
        sport: selectedSports,
        category: category.trim() || undefined,
      });

      if (ok) onSuccess();
    } finally {
      setSaving(false);
    }
  };

  const tagsByCategory = tags.reduce<Record<string, LibraryTag[]>>((acc, tag) => {
    const cat = tag.parent_category || tag.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tag);
    return acc;
  }, {});

  const isProcessing = saving || uploading;

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="edit-title">Title</Label>
        <Input
          id="edit-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          disabled={isProcessing}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="edit-desc">Description</Label>
        <Textarea
          id="edit-desc"
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
          disabled={isProcessing}
        />
      </div>

      {/* Sport */}
      <div className="space-y-1.5">
        <Label>Sport</Label>
        <div className="flex gap-2">
          {sportOptions.map(s => (
            <Badge
              key={s}
              variant={selectedSports.includes(s) ? "default" : "outline"}
              className="cursor-pointer capitalize"
              onClick={() => !isProcessing && toggleSport(s)}
            >
              {s}
            </Badge>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label htmlFor="edit-cat">Category</Label>
        <Input
          id="edit-cat"
          value={category}
          onChange={e => setCategory(e.target.value)}
          placeholder="Optional category"
          disabled={isProcessing}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="max-h-40 overflow-y-auto space-y-2 rounded border p-2">
          {Object.entries(tagsByCategory).map(([cat, catTags]) => (
            <div key={cat}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">{cat}</p>
              <div className="flex flex-wrap gap-1">
                {catTags.map(tag => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                    className="cursor-pointer text-[10px]"
                    onClick={() => !isProcessing && toggleTag(tag.name)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Video */}
      <Card className="p-3 space-y-2">
        <Label>Current Video</Label>
        <p className="text-xs text-muted-foreground truncate">
          {video.video_url || "No file — external link"}
        </p>
        <p className="text-[10px] text-muted-foreground">Type: {video.video_type}</p>
      </Card>

      {/* Replace Video File */}
      <div className="space-y-1.5">
        <Label>Replace Video File (optional)</Label>
        {newFile ? (
          <div className="flex items-center gap-2 text-sm">
            <FileVideo className="h-4 w-4 text-primary" />
            <span className="truncate flex-1">{newFile.name}</span>
            <span className="text-xs text-muted-foreground">
              {(newFile.size / (1024 * 1024)).toFixed(1)} MB
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setNewFile(null)}
              disabled={isProcessing}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
            <Upload className="h-4 w-4" />
            Choose new file
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) setNewFile(f);
                e.target.value = "";
              }}
              disabled={isProcessing}
            />
          </label>
        )}
        <p className="text-[10px] text-muted-foreground">
          Previous versions are preserved — replacing does not delete the old file.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isProcessing}>
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {uploading ? "Uploading…" : "Saving…"}
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}
