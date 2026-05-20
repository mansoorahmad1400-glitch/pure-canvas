import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  MapPin, Lock, Unlock, Sparkles, ChevronDown, ChevronUp,
  Upload, Trash2, RefreshCw, Globe, ImageIcon, Check
} from 'lucide-react';

const TYPE_COLORS = {
  interior: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  exterior: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  city: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  nature: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  fantasy: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
  vehicle: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  other: 'bg-muted/40 text-muted-foreground border-border',
};

function ConsistencyBar({ score }) {
  const pct = Math.max(0, Math.min(100, score || 0));
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-muted-foreground/40';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground w-7 text-right">{pct}%</span>
    </div>
  );
}

export default function LocationCard({ location, access, onUpdated, onDeleted }) {
  const [expanded, setExpanded] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState(location.description || '');
  const [generatingDNA, setGeneratingDNA] = useState(false);
  const [generatingRef, setGeneratingRef] = useState(false);
  const [locking, setLocking] = useState(false);
  const [uploading, setUploading] = useState(false);

  const dna = location.dna || {};
  const lockBadge = location.lock_type === 'image'
    ? { label: 'Env Locked', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
    : location.lock_type === 'text'
    ? { label: 'Text Locked', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' }
    : { label: 'Unlocked', cls: 'bg-muted/40 text-muted-foreground border-border' };

  const handleGenerateDNA = async () => {
    setGeneratingDNA(true);
    try {
      const res = await base44.functions.invoke('worldMemory', {
        action: 'generate_dna',
        project_id: location.project_id,
        location_id: location.id,
        canonical_name: location.canonical_name,
        description: location.description,
      });
      toast.success('Location DNA generated!');
      onUpdated({ ...location, dna: res.data.dna, consistency_score: res.data.consistency_score });
    } catch (e) { toast.error(e?.response?.data?.error || 'Failed to generate DNA'); }
    setGeneratingDNA(false);
  };

  const handleSaveDesc = async () => {
    try {
      await base44.functions.invoke('worldMemory', {
        action: 'update_location',
        project_id: location.project_id,
        location_id: location.id,
        updates: { description: desc },
      });
      toast.success('Description saved');
      onUpdated({ ...location, description: desc });
      setEditingDesc(false);
    } catch (e) { toast.error('Failed to save'); }
  };

  const handleLock = async () => {
    if (!access.canLock) { toast.error('Lock requires a paid plan'); return; }
    setLocking(true);
    try {
      if (location.lock_type !== 'none') {
        await base44.functions.invoke('worldMemory', { action: 'unlock', project_id: location.project_id, location_id: location.id });
        toast.success('Location unlocked');
        onUpdated({ ...location, lock_type: 'none' });
      } else {
        const res = await base44.functions.invoke('worldMemory', { action: 'text_lock', project_id: location.project_id, location_id: location.id });
        toast.success('Environment locked for consistency!');
        onUpdated({ ...location, lock_type: 'text', consistency_score: res.data.consistency_score });
      }
    } catch (e) { toast.error(e?.response?.data?.error || 'Failed'); }
    setLocking(false);
  };

  const handleGenerateRef = async () => {
    setGeneratingRef(true);
    try {
      const res = await base44.functions.invoke('worldMemory', {
        action: 'generate_reference',
        project_id: location.project_id,
        location_id: location.id,
      });
      if (res.data?.success) {
        toast.success('Location reference generated!');
        onUpdated({ ...location, reference_image_url: res.data.image_url, lock_type: location.lock_type === 'none' ? 'text' : location.lock_type, consistency_score: res.data.consistency_score });
      }
    } catch (e) {
      const d = e?.response?.data;
      if (d?.provider_not_configured) toast.error('Image provider not configured yet');
      else toast.error(d?.error || 'Generation failed');
    }
    setGeneratingRef(false);
  };

  const handleApproveRef = async () => {
    try {
      const res = await base44.functions.invoke('worldMemory', {
        action: 'approve_reference',
        project_id: location.project_id,
        location_id: location.id,
      });
      toast.success('Location reference approved & locked!');
      onUpdated({ ...location, lock_type: 'image', consistency_score: res.data.consistency_score });
    } catch (e) { toast.error('Approve failed'); }
  };

  const handleUploadRef = async () => {
    if (!access.canUploadReference) { toast.error('Reference upload requires Creator Pro'); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const res = await base44.functions.invoke('worldMemory', {
          action: 'upload_reference',
          project_id: location.project_id,
          location_id: location.id,
          image_url: file_url,
        });
        toast.success('Environment reference uploaded!');
        onUpdated({ ...location, reference_image_url: file_url, lock_type: 'image', consistency_score: res.data.consistency_score });
      } catch (e) { toast.error('Upload failed'); }
      setUploading(false);
    };
    input.click();
  };

  const handleDelete = async () => {
    try {
      await base44.functions.invoke('worldMemory', { action: 'delete_location', project_id: location.project_id, location_id: location.id });
      onDeleted(location.id);
    } catch (e) { toast.error('Failed to delete'); }
  };

  const dnaFields = [
    { key: 'architectural_style', label: 'Architecture' },
    { key: 'color_palette', label: 'Color Palette' },
    { key: 'lighting_profile', label: 'Lighting' },
    { key: 'atmosphere', label: 'Atmosphere' },
    { key: 'time_of_day', label: 'Time of Day' },
    { key: 'weather', label: 'Weather' },
    { key: 'camera_style', label: 'Camera Style' },
    { key: 'color_grading', label: 'Color Grading' },
    { key: 'emotional_tone', label: 'Emotional Tone' },
  ];

  return (
    <div className={`rounded-xl border bg-card/60 transition-all ${location.lock_type !== 'none' ? 'border-blue-500/30' : 'border-border/40'}`}>
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center shrink-0">
          <MapPin className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm text-foreground">{location.canonical_name}</span>
            <Badge className={`text-[10px] px-1.5 py-0 border ${TYPE_COLORS[location.location_type] || TYPE_COLORS.other}`}>
              {location.location_type}
            </Badge>
            <Badge className={`text-[10px] px-1.5 py-0 border ${lockBadge.cls}`}>
              {lockBadge.label}
            </Badge>
          </div>

          {location.scenes?.length > 0 && (
            <p className="text-[11px] text-muted-foreground mb-1.5">
              Scenes: {location.scenes.slice(0,8).join(', ')}{location.scenes.length > 8 ? '…' : ''}
            </p>
          )}

          <ConsistencyBar score={location.consistency_score} />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(v => !v)}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
          {/* Description */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Description</p>
            {editingDesc ? (
              <div className="space-y-2">
                <Textarea value={desc} onChange={e => setDesc(e.target.value)} className="text-xs min-h-[70px] bg-secondary/30" />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={handleSaveDesc}>Save</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingDesc(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors leading-relaxed"
                onClick={() => setEditingDesc(true)}>
                {location.description || <span className="italic text-muted-foreground/50">Click to add description</span>}
              </p>
            )}
          </div>

          {/* DNA fields */}
          {dna.consistency_prompt && (
            <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/30">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Consistency Prompt</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{dna.consistency_prompt}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {dnaFields.filter(f => dna[f.key]).map(f => (
              <div key={f.key} className="p-2 rounded-lg bg-secondary/20">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">{f.label}</p>
                <p className="text-[11px] text-foreground/80">{dna[f.key]}</p>
              </div>
            ))}
          </div>

          {/* Reference image */}
          {location.reference_image_url ? (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Environment Reference</p>
              <div className="relative">
                <img src={location.reference_image_url} alt="reference" className="rounded-lg w-full max-h-36 object-cover border border-border/30" />
                {location.lock_type === 'image' && (
                  <div className="absolute top-2 right-2 bg-emerald-500/90 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Check className="w-2.5 h-2.5 text-white" />
                    <span className="text-[9px] text-white font-semibold">Approved</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/30 bg-secondary/10 h-16 flex items-center justify-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground/30" />
              <span className="text-xs text-muted-foreground/40">No reference image yet</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs gap-1 border-border/50"
              onClick={handleGenerateDNA}
              disabled={generatingDNA}
            >
              {generatingDNA ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {generatingDNA ? 'Generating…' : 'Auto DNA'}
            </Button>

            {/* Generate location reference image — free */}
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs gap-1 border-sky-500/30 text-sky-400 hover:bg-sky-500/10"
              onClick={handleGenerateRef}
              disabled={generatingRef}
            >
              {generatingRef ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
              {generatingRef ? 'Generating…' : location.reference_image_url ? 'Regen Ref' : 'Gen Reference'}
            </Button>

            {/* Approve & lock reference */}
            {location.reference_image_url && location.lock_type !== 'image' && (
              <Button
                size="sm" variant="outline"
                className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                onClick={handleApproveRef}
              >
                <Check className="w-3 h-3" /> Approve &amp; Lock
              </Button>
            )}

            {access.canLock && location.lock_type !== 'none' && (
              <Button
                size="sm" variant="outline"
                className="h-7 text-xs gap-1 border-border/50 text-muted-foreground"
                onClick={handleLock}
                disabled={locking}
              >
                {locking ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />}
                Unlock
              </Button>
            )}

            {access.canUploadReference && (
              <Button
                size="sm" variant="outline"
                className="h-7 text-xs gap-1 border-border/50"
                onClick={handleUploadRef}
                disabled={uploading}
              >
                {uploading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {uploading ? 'Uploading…' : 'Upload'}
              </Button>
            )}

            <Button
              size="sm" variant="ghost"
              className="h-7 text-xs gap-1 text-destructive hover:text-destructive ml-auto"
              onClick={handleDelete}
            >
              <Trash2 className="w-3 h-3" /> Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}