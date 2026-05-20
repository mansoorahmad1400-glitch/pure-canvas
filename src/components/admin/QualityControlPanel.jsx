import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, Plus, X, Save, RefreshCw, ToggleLeft, ToggleRight, Info } from 'lucide-react';

const SECTION_LABELS = {
  A_story: 'A. Story / Concept',
  B_visual: 'B. Visual Prompts',
  C_sound: 'C. Sound / Music',
  D_youtube: 'D. YouTube Package',
  E_thumbnail: 'E. Thumbnail',
};

const DEFAULT_CONFIG = {
  strict_mode: true,
  max_retries: 2,
  batch_size: 6,
  forbidden_phrases: [
    'continue', 'remaining scenes', 'same as above', 'etc.', 'etc',
    'similar structure', 'repeat for', 'and so on', 'placeholder',
    '...', '[same]', '[repeat]', '[continue]',
  ],
  required_sections: ['master_prompt', 'visual_prompt', 'sound_prompt', 'narration_guide', 'youtube_package'],
  required_scene_fields: [
    'Environment', 'Characters', 'Action', 'Camera Angle', 'Camera Movement',
    'Lighting', 'Mood', 'Scene Motion', 'Visual Style', 'Transition',
  ],
  required_yt_fields: [
    'title_primary', 'title_secondary', 'description_primary',
    'description_secondary', 'tags', 'thumbnail_hook_primary', 'thumbnail_hook_secondary',
  ],
};

function Toggle({ value, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
        value
          ? 'bg-primary/15 border-primary/30 text-primary'
          : 'bg-card/40 border-border/30 text-muted-foreground'
      }`}
    >
      {value ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
      {label}: <span className="font-bold">{value ? 'ON' : 'OFF'}</span>
    </button>
  );
}

function TagList({ items, onChange, placeholder }) {
  const [input, setInput] = useState('');

  const add = () => {
    const val = input.trim();
    if (val && !items.includes(val)) {
      onChange([...items, val]);
    }
    setInput('');
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2 min-h-[2rem]">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-xs font-medium text-foreground border border-border/50">
            {item}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive ml-1">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={placeholder}
          className="h-8 text-xs"
        />
        <Button variant="outline" size="sm" onClick={add} className="h-8 px-3">
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export default function QualityControlPanel() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('blueprintValidator', { action: 'get_config' });
      if (res.data?.config) {
        setConfig({ ...DEFAULT_CONFIG, ...res.data.config });
      }
    } catch (e) {
      toast.error('Failed to load config');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('blueprintValidator', { action: 'save_config', config });
      toast.success('Quality Control config saved');
    } catch (e) {
      toast.error('Failed to save config');
    }
    setSaving(false);
  };

  const set = (key, val) => setConfig(c => ({ ...c, [key]: val }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading config...
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground">Quality Control</h2>
            <p className="text-xs text-muted-foreground">Configure validation, retries, batching and output rules</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadConfig} className="gap-2 h-8">
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2 h-8">
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Global Toggles */}
      <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-4">
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">Global Settings</h3>
        <div className="flex flex-wrap gap-3">
          <Toggle value={config.strict_mode} onChange={v => set('strict_mode', v)} label="Strict Mode" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Max Retries per Section</label>
            <Input
              type="number"
              min={1} max={5}
              value={config.max_retries}
              onChange={e => set('max_retries', parseInt(e.target.value) || 2)}
              className="h-8 text-sm w-28"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Batch Size (scenes)</label>
            <Input
              type="number"
              min={2} max={10}
              value={config.batch_size}
              onChange={e => set('batch_size', parseInt(e.target.value) || 6)}
              className="h-8 text-sm w-28"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground flex items-start gap-1.5 mt-1">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Strict mode enables forbidden phrase checking. Batch size controls how many scenes are sent per generation call for large scene counts.
        </p>
      </div>

      {/* Required Sections */}
      <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-3">
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">Required Sections (A–E)</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(SECTION_LABELS).map(([key, label]) => (
            <Badge key={key} className="bg-primary/10 text-primary border-primary/30 text-xs font-medium">
              {label}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">These 5 sections are always required and cannot be disabled.</p>
      </div>

      {/* Forbidden Phrases */}
      <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-3">
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">Forbidden Phrases</h3>
        <p className="text-xs text-muted-foreground">Outputs containing these phrases fail validation and trigger a retry.</p>
        <TagList
          items={config.forbidden_phrases}
          onChange={v => set('forbidden_phrases', v)}
          placeholder="Add forbidden phrase..."
        />
      </div>

      {/* Required Scene Fields */}
      <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-3">
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">Required Fields per Scene (Section B)</h3>
        <p className="text-xs text-muted-foreground">Each visual scene must contain these field labels to pass validation.</p>
        <TagList
          items={config.required_scene_fields}
          onChange={v => set('required_scene_fields', v)}
          placeholder="Add required field..."
        />
      </div>

      {/* Required YT Fields */}
      <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-3">
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">Required YouTube Package Fields (Section D)</h3>
        <TagList
          items={config.required_yt_fields}
          onChange={v => set('required_yt_fields', v)}
          placeholder="Add required YT field..."
        />
      </div>

      {/* Save button bottom */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Quality Control Config
        </Button>
      </div>

    </div>
  );
}