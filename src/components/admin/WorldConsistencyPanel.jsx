import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Globe, Save, RefreshCw, ToggleLeft, ToggleRight, Info } from 'lucide-react';

const DEFAULT_CONFIG = {
  world_memory_enabled: true,
  require_location_refs: false,
  warn_missing_refs: true,
  consistency_strength: 'medium',
  allow_scene_override: true,
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

const STRENGTHS = [
  { value: 'low', label: 'Low', desc: 'Loose hints only' },
  { value: 'medium', label: 'Medium', desc: 'Balanced injection' },
  { value: 'high', label: 'High', desc: 'Strict prompt injection' },
];

export default function WorldConsistencyPanel() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const records = await base44.entities.EconomyConfig.filter({ config_key: 'world_consistency' });
      if (records?.[0]?.feature_access) {
        setConfig({ ...DEFAULT_CONFIG, ...records[0].feature_access });
      }
    } catch { /* use defaults */ }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = await base44.entities.EconomyConfig.filter({ config_key: 'world_consistency' });
      if (records?.[0]) {
        await base44.entities.EconomyConfig.update(records[0].id, { feature_access: config });
      } else {
        await base44.entities.EconomyConfig.create({ config_key: 'world_consistency', feature_access: config });
      }
      toast.success('World Consistency settings saved');
    } catch {
      toast.error('Failed to save');
    }
    setSaving(false);
  };

  const set = (key, val) => setConfig(c => ({ ...c, [key]: val }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-sky-400" />
          <div>
            <h2 className="font-semibold text-foreground">World Consistency Engine</h2>
            <p className="text-xs text-muted-foreground">Control how world memory and location DNA influence scene image generation</p>
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

      {/* Core toggles */}
      <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-4">
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">Core Settings</h3>
        <div className="flex flex-wrap gap-3">
          <Toggle value={config.world_memory_enabled} onChange={v => set('world_memory_enabled', v)} label="World Memory" />
          <Toggle value={config.require_location_refs} onChange={v => set('require_location_refs', v)} label="Require Location Refs" />
          <Toggle value={config.warn_missing_refs} onChange={v => set('warn_missing_refs', v)} label="Warn Missing Refs" />
          <Toggle value={config.allow_scene_override} onChange={v => set('allow_scene_override', v)} label="Allow Scene Override" />
        </div>
        <p className="text-xs text-muted-foreground flex items-start gap-1.5 mt-1">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Require Location Refs blocks scene generation unless references are approved. Warn mode shows a notice instead.
        </p>
      </div>

      {/* Consistency strength */}
      <div className="p-4 rounded-xl border border-border/50 bg-card/40 space-y-3">
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">Default Consistency Strength</h3>
        <div className="flex gap-3 flex-wrap">
          {STRENGTHS.map(s => (
            <button
              key={s.value}
              onClick={() => set('consistency_strength', s.value)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                config.consistency_strength === s.value
                  ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                  : 'bg-card/40 border-border/30 text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="font-semibold">{s.label}</div>
              <div className="text-xs opacity-70">{s.desc}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Controls how much of the location DNA is injected into image generation prompts.</p>
      </div>

      {/* Summary */}
      <div className="rounded-xl bg-sky-500/5 border border-sky-500/10 p-4 space-y-1.5">
        <p className="text-xs font-semibold text-sky-300">Current Behavior</p>
        <ul className="text-xs text-sky-300/70 space-y-0.5 list-disc list-inside">
          <li>World memory is <strong>{config.world_memory_enabled ? 'enabled' : 'disabled'}</strong></li>
          <li>Location references are <strong>{config.require_location_refs ? 'required before generation' : 'optional (recommended)'}</strong></li>
          <li>Missing ref warning is <strong>{config.warn_missing_refs ? 'shown' : 'hidden'}</strong></li>
          <li>Consistency strength: <strong>{config.consistency_strength}</strong></li>
          <li>Scene-level override is <strong>{config.allow_scene_override ? 'allowed' : 'disabled'}</strong></li>
        </ul>
      </div>
    </div>
  );
}