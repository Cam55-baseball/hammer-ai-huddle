import { useState } from "react";
import { Upload, Link, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useVideoLibraryAdmin } from "@/hooks/useVideoLibraryAdmin";
import { StructuredTagEditor, emptyStructuredTagState, type StructuredTagState } from "./StructuredTagEditor";
import type { LibraryTag } from "@/hooks/useVideoLibrary";
import { VideoClassificationFields } from './VideoClassificationFields';
import { categoryToSkillDomain, isValidVideoClassification, type VideoCategory, type VideoSport } from '@/lib/videoCategoricalTaxonomy';

interface VideoUploadFormProps {
  tags: LibraryTag[];
  onSuccess: () => void;
}

export function VideoUploadForm({ tags: _tags, onSuccess }: VideoUploadFormProps) {
  const { uploadVideo, uploading } = useVideoLibraryAdmin();
  const [mode, setMode] = useState<'upload' | 'link'>('link');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [sport, setSport] = useState<VideoSport | ''>('');
  const [category, setCategory] = useState<VideoCategory | ''>('');
  const [subSkill, setSubSkill] = useState('');
  const [structured, setStructured] = useState<StructuredTagState>(emptyStructuredTagState);

  const detectVideoType = (url: string): 'youtube' | 'vimeo' | 'external' => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    return 'external';
  };

  const handleSubmit = async () => {
    if (!title.trim() || !isValidVideoClassification(sport, category, subSkill)) return;
    if (!structured.videoFormat || structured.skillDomains.length === 0 || !structured.aiDescription.trim()) {
      return;
    }

    const videoType = mode === 'upload' ? 'upload' : detectVideoType(externalUrl);

    const result = await uploadVideo({
      title: title.trim(),
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      tags: [subSkill],
      sport: [sport],
      category: category || undefined,
      videoFile: videoFile || undefined,
      externalUrl: mode === 'link' ? externalUrl : undefined,
      videoType,
      videoFormat: structured.videoFormat,
      skillDomains: structured.skillDomains,
      aiDescription: structured.aiDescription,
      tagAssignments: structured.tagAssignments,
      formulaPhases: structured.formulaLinkage.phases,
      formulaNotes: structured.formulaLinkage.notes.trim() || undefined,
    });

    if (result) {
      setTitle(''); setDescription(''); setNotes(''); setExternalUrl('');
      setVideoFile(null); setSport(''); setCategory(''); setSubSkill('');
      setStructured(emptyStructuredTagState);
      onSuccess();
    }
  };

  return (
    <Card className="p-6 space-y-5">
      <h3 className="font-semibold text-lg">Add New Video</h3>

      <div className="flex gap-2">
        <Button variant={mode === 'link' ? 'default' : 'outline'} size="sm" onClick={() => setMode('link')}>
          <Link className="h-3.5 w-3.5 mr-1" /> External Link
        </Button>
        <Button variant={mode === 'upload' ? 'default' : 'outline'} size="sm" onClick={() => setMode('upload')}>
          <Upload className="h-3.5 w-3.5 mr-1" /> Upload File
        </Button>
      </div>

      {mode === 'link' ? (
        <div className="space-y-2">
          <Label>Video URL</Label>
          <Input
            placeholder="https://youtube.com/watch?v=... or any video URL"
            value={externalUrl}
            onChange={e => setExternalUrl(e.target.value)}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Video File (max 500MB)</Label>
          <Input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            onChange={e => setVideoFile(e.target.files?.[0] || null)}
          />
          {videoFile && <p className="text-xs text-muted-foreground">{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)}MB)</p>}
        </div>
      )}

      <div className="space-y-2">
        <Label>Title *</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Fixing Roll Overs in Your Swing" />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Short teaching explanation..." rows={3} />
      </div>

      <div className="space-y-2">
        <Label>Teaching Notes</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional coaching notes (translated for international users)..." rows={3} />
      </div>

      <VideoClassificationFields
        sport={sport}
        category={category}
        subSkill={subSkill}
        onChange={(next) => {
          setSport(next.sport);
          setCategory(next.category);
          setSubSkill(next.subSkill);
          if (next.category) {
            const domain = categoryToSkillDomain(next.category);
            if (domain) setStructured((current) => ({ ...current, skillDomains: [domain as any], tagAssignments: {} }));
          }
        }}
      />

      <StructuredTagEditor value={structured} onChange={setStructured} sports={sport ? [sport] : []} />

      <Button
        onClick={handleSubmit}
        disabled={uploading || !title.trim() || !isValidVideoClassification(sport, category, subSkill) || !structured.videoFormat || structured.skillDomains.length === 0 || !structured.aiDescription.trim()}
        className="w-full"
      >
        {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : 'Add Video'}
      </Button>
    </Card>
  );
}
