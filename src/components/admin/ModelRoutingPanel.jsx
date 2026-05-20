import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Save, RefreshCw, CheckCircle2, Cpu, Zap, Shield,
  RotateCcw, AlertTriangle, ChevronRight, Sparkles
} from 'lucide-react';

// ─── Static provider/model data (mirrors modelRouter function) ────────────────

const PROVIDERS = {
  openai:       { label: 'OpenAI',             enabled: true,  actions: ['text', 'image'] },
  gemini:       { label: 'Gemini (Google)',    enabled: false, actions: ['text'] },
  anthropic:    { label: 'Anthropic/Claude',   enabled: false, actions: ['text'] },
  grok:         { label: 'Grok / xAI',         enabled: false, actions: ['text'], capabilities: { text: 'available', image: 'unavailable', video: 'unavailable', note: 'Current API key does not have video/image generation access' } },
  openrouter:   { label: 'OpenRouter',         enabled: false, actions: ['text'] },
  dalle:        { label: 'DALL·E (OpenAI)',    enabled: true,  actions: ['image'] },
  replicate_flux: { label: 'Replicate Flux',   enabled: true,  actions: ['image'] },
  replicate_sdxl: { label: 'Replicate SDXL',   enabled: false, actions: ['image'] },
  flux:         { label: 'Flux (Direct)',      enabled: false, actions: ['image'] },
  midjourney:   { label: 'Midjourney',         enabled: false, actions: ['image'] },
  sdxl:         { label: 'SDXL (Direct)',      enabled: false, actions: ['image'] },
  ideogram:     { label: 'Ideogram',           enabled: false, actions: ['image'] },
  leonardo:     { label: 'Leonardo AI',        enabled: false, actions: ['image'] },
  recraft:      { label: 'Recraft',            enabled: false, actions: ['image'] },
  grok_image:   { label: 'Grok Image',         enabled: false, actions: ['image'], capabilities: { image: 'waiting_api_access' } },
  elevenlabs:   { label: 'ElevenLabs',       enabled: false, actions: ['audio_voice'] },
  openai_tts:   { label: 'OpenAI TTS',       enabled: true,  actions: ['audio_voice'] },
  google_tts:   { label: 'Google TTS',       enabled: false, actions: ['audio_voice'] },
  playht:       { label: 'PlayHT',           enabled: false, actions: ['audio_voice'] },
  suno:         { label: 'Suno',             enabled: false, actions: ['audio_music'] },
  udio:         { label: 'Udio',             enabled: false, actions: ['audio_music'] },
  stable_audio: { label: 'Stable Audio',     enabled: false, actions: ['audio_sfx'] },
  runway:              { label: 'Runway',              enabled: false, actions: ['video'] },
  pika:                { label: 'Pika',                enabled: false, actions: ['video'] },
  kling:               { label: 'Kling',               enabled: false, actions: ['video'] },
  sora:                { label: 'Sora (OpenAI)',       enabled: false, actions: ['video'] },
  luma:                { label: 'Luma Dream Machine',  enabled: false, actions: ['video'] },
  grok_video:          { label: 'Grok Video',          enabled: false, actions: ['video'], capabilities: { video: 'available' } },
  grok_imagine_video:  { label: 'Grok Imagine Video',  enabled: false, actions: ['video'], capabilities: { video: 'waiting_api_access', note: 'Requires xAI Imagine API upgrade for video generation' } },
  ffmpeg:              { label: 'FFmpeg Pipeline',     enabled: false, actions: ['export_render'] },
  runway_exp:          { label: 'Runway Export',       enabled: false, actions: ['export_render'] },
  kling_exp:           { label: 'Kling Export',        enabled: false, actions: ['export_render'] },
  luma_exp:            { label: 'Luma Export',         enabled: false, actions: ['export_render'] },
  sora_exp:            { label: 'Sora Export',         enabled: false, actions: ['export_render'] },
};

const MODELS_BY_PROVIDER = {
  openai:     ['gpt-4o-mini', 'gpt-4o', 'o1-mini', 'o3-mini'],
  gemini:     ['gemini-flash', 'gemini-pro', 'gemini-ultra'],
  anthropic:  ['claude-haiku', 'claude-sonnet', 'claude-opus'],
  grok:       ['grok-2', 'grok-3'],
  openrouter: ['openrouter-default'],
  runway:     ['runway-gen3'],
  pika:       ['pika-2'],
  kling:      ['kling-v1'],
  sora:       ['sora-1'],
  elevenlabs: ['eleven-v2'],
  suno:       ['suno-v3'],
};

const MODEL_LABELS = {
  'gpt-4o-mini': 'GPT-4o Mini',
  'gpt-4o': 'GPT-4o',
  'o1-mini': 'o1 Mini',
  'o3-mini': 'o3 Mini',
  'gemini-flash': 'Gemini Flash',
  'gemini-pro': 'Gemini Pro',
  'gemini-ultra': 'Gemini Ultra',
  'claude-haiku': 'Claude Haiku',
  'claude-sonnet': 'Claude Sonnet',
  'claude-opus': 'Claude Opus',
  'grok-2': 'Grok 2',
  'grok-3': 'Grok 3',
  'openrouter-default': 'OpenRouter (Auto)',
  'runway-gen3': 'Runway Gen-3',
  'pika-2': 'Pika 2',
  'kling-v1': 'Kling v1',
  'sora-1': 'Sora 1',
  'eleven-v2': 'ElevenLabs v2',
  'suno-v3': 'Suno v3',
};

const QUALITY_LABELS = ['Standard AI', 'Enhanced AI', 'Premium AI', 'Cinematic AI', 'Premium Trial', 'Admin Override'];

const TEXT_PROVIDERS = Object.entries(PROVIDERS)
  .filter(([, v]) => v.actions.includes('text'))
  .map(([k]) => k);

const IMAGE_PROVIDERS = Object.entries(PROVIDERS)
  .filter(([, v]) => v.actions.includes('image'))
  .map(([k]) => k);

const DEFAULT_ROUTING = {
  plan_models: {
    free_first:  { provider: 'openai', model: 'gpt-4o',      quality_label: 'Premium Trial' },
    free_second: { provider: 'openai', model: 'gpt-4o-mini', quality_label: 'Standard AI'   },
    starter:     { provider: 'openai', model: 'gpt-4o-mini', quality_label: 'Standard AI'   },
    premium:     { provider: 'openai', model: 'gpt-4o',      quality_label: 'Enhanced AI'   },
    elite:       { provider: 'openai', model: 'gpt-4o',      quality_label: 'Premium AI'    },
    admin:       { provider: 'openai', model: 'gpt-4o',      quality_label: 'Admin Override' },
  },
  fallback:           { provider: 'openai', model: 'gpt-4o-mini', quality_label: 'Standard AI' },
  cost_threshold_usd: 0.05,
  admin_cost_override: true,
};

const PLAN_ROUTING_KEYS = [
  { key: 'free_first',  label: 'Free — 1st Generation', desc: 'First ever blueprint (premium trial)', color: 'text-amber-400', special: true },
  { key: 'free_second', label: 'Free — 2nd Generation', desc: 'Second and onward (budget model)',     color: 'text-muted-foreground', special: true },
  { key: 'starter',     label: 'Starter',               desc: '$9.99/mo plan',                       color: 'text-blue-400' },
  { key: 'premium',     label: 'Creator Pro',            desc: '$19.99/mo plan',                      color: 'text-purple-400' },
  { key: 'elite',       label: 'Studio Elite',           desc: '$39.99/mo plan',                      color: 'text-amber-400' },
  { key: 'admin',       label: 'Admin',                  desc: 'Admin accounts',                      color: 'text-primary' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function RouteRow({ label, desc, color, routeConfig, onChange, isSpecial }) {
  const provider = routeConfig?.provider || 'openai';
  const model = routeConfig?.model || 'gpt-4o-mini';
  const quality = routeConfig?.quality_label || 'Standard AI';

  const models = MODELS_BY_PROVIDER[provider] || [];

  return (
    <div className={`p-3 rounded-xl border ${isSpecial ? 'border-amber-500/20 bg-amber-500/5' : 'border-border/40 bg-card/30'} space-y-2`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-xs font-bold ${color}`}>{label}</p>
          <p className="text-[10px] text-muted-foreground">{desc}</p>
        </div>
        {isSpecial && <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">Special Rule</Badge>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Provider</label>
          <select
            value={provider}
            onChange={e => onChange({ ...routeConfig, provider: e.target.value, model: MODELS_BY_PROVIDER[e.target.value]?.[0] || '' })}
            className="w-full h-8 text-xs bg-background border border-border/40 rounded-md px-2 text-foreground focus:outline-none focus:border-primary/50"
          >
            {(routeConfig?.actions?.includes('image') ? IMAGE_PROVIDERS : TEXT_PROVIDERS).map(p => (
              <option key={p} value={p} disabled={!PROVIDERS[p]?.enabled && p !== 'openai' && p !== 'replicate_flux'}>
                {PROVIDERS[p]?.label}{!PROVIDERS[p]?.enabled ? ' (soon)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Model</label>
          <select
            value={model}
            onChange={e => onChange({ ...routeConfig, model: e.target.value })}
            className="w-full h-8 text-xs bg-background border border-border/40 rounded-md px-2 text-foreground focus:outline-none focus:border-primary/50"
          >
            {models.map(m => <option key={m} value={m}>{MODEL_LABELS[m] || m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">User Label</label>
          <select
            value={quality}
            onChange={e => onChange({ ...routeConfig, quality_label: e.target.value })}
            className="w-full h-8 text-xs bg-background border border-border/40 rounded-md px-2 text-foreground focus:outline-none focus:border-primary/50"
          >
            {QUALITY_LABELS.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

function ProviderGrid({ serverProviders, providerTests }) {
  // serverProviders may include live enabled state from the backend
  const merged = { ...PROVIDERS };
  if (serverProviders) {
    Object.keys(serverProviders).forEach(k => {
      if (merged[k]) merged[k] = { ...merged[k], ...serverProviders[k] };
    });
  }

  const byAction = {
    text:  Object.entries(merged).filter(([, v]) => v.actions.includes('text')),
    image:       Object.entries(merged).filter(([, v]) => v.actions.includes('image')),
    audio_voice: Object.entries(merged).filter(([, v]) => v.actions.includes('audio_voice')),
    audio_music: Object.entries(merged).filter(([, v]) => v.actions.includes('audio_music')),
    audio_sfx:     Object.entries(merged).filter(([, v]) => v.actions.includes('audio_sfx')),
    video:         Object.entries(merged).filter(([, v]) => v.actions.includes('video')),
    export_render: Object.entries(merged).filter(([, v]) => v.actions.includes('export_render')),
  };

  return (
    <div className="space-y-4">
      {[
        { key: 'text',        label: 'Text / Blueprint Generation' },
        { key: 'image',       label: 'Image Generation' },
        { key: 'audio_voice', label: 'Voice / Narration (TTS)' },
        { key: 'audio_music', label: 'Music Generation' },
        { key: 'audio_sfx',   label: 'Sound Effects' },
        { key: 'video',         label: 'Video Generation (Future)' },
        { key: 'export_render', label: 'Export Render Providers (Future)' },
      ].map(({ key, label }) => (
        <div key={key}>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {byAction[key].map(([id, p]) => (
              <div key={id} className={`p-2.5 rounded-xl border text-xs ${p.enabled ? 'border-green-500/25 bg-green-500/5' : 'border-border/30 bg-card/20'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`w-2 h-2 rounded-full ${
                    p.enabled ? 'bg-green-400' : 
                    p.capabilities?.video === 'waiting_api_access' ? 'bg-amber-400' : 
                    providerTests?.[id]?.connected === false ? 'bg-red-400' : 'bg-muted-foreground/40'
                  }`} />
                  <span className="font-semibold text-foreground">{p.label}</span>
                </div>
                <div className="space-y-1">
                  <Badge className={`text-[9px] border ${
                    p.enabled ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                    p.capabilities?.video === 'waiting_api_access' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                    providerTests?.[id]?.connected === false ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-secondary text-muted-foreground border-border/30'
                  }`}>
                    {p.enabled ? 'Active' : 
                     p.capabilities?.video === 'waiting_api_access' ? 'Waiting API Access' : 
                     providerTests?.[id]?.connected === false ? 'Not Connected' : 'Coming Soon'}
                  </Badge>
                  {p.capabilities?.note && (
                    <p className="text-[9px] text-muted-foreground leading-tight">{p.capabilities.note}</p>
                  )}
                  {providerTests?.[id]?.reason && !p.enabled && (
                    <p className="text-[9px] text-muted-foreground leading-tight">{providerTests[id].reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ModelRoutingPanel() {
  const [routing, setRouting] = useState(null);
  const [serverProviders, setServerProviders] = useState(null);
  const [providerTests, setProviderTests] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [activeTab, setActiveTab] = useState('routing');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [routerRes, videoRes] = await Promise.all([
        base44.functions.invoke('modelRouter', { action: 'get_config' }),
        base44.functions.invoke('videoPipeline', { action: 'get_status' }),
      ]);
      setRouting({ ...DEFAULT_ROUTING, ...routerRes.data?.routing });
      setServerProviders(routerRes.data?.providers || null);
      setProviderTests(videoRes.data?.provider_tests || null);
    } catch (e) {
      toast.error('Failed to load routing config');
      setRouting({ ...DEFAULT_ROUTING });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('modelRouter', { action: 'save_config', model_routing: routing });
      setSavedAt(new Date());
      toast.success('Model routing config saved');
    } catch (e) {
      toast.error('Failed to save');
    }
    setSaving(false);
  };

  const setPlanRoute = (key, val) => {
    setRouting(r => ({ ...r, plan_models: { ...r.plan_models, [key]: val } }));
  };

  const setFallback = (val) => {
    setRouting(r => ({ ...r, fallback: val }));
  };

  const TABS = [
    { key: 'routing',   label: 'Plan Routing',     icon: Zap },
    { key: 'providers', label: 'Provider Status',   icon: Cpu },
    { key: 'protection',label: 'Cost Protection',   icon: Shield },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold font-playfair text-foreground">AI Model Routing</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Control which AI model is used per plan, action type, and quality tier</p>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved {savedAt.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => { setRouting({ ...DEFAULT_ROUTING }); toast.success('Reset to defaults'); }} className="gap-1.5 h-8 text-xs">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </Button>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5 h-8 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 h-8 text-xs bg-primary hover:bg-primary/90">
            {saving
              ? <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              : <Save className="w-3.5 h-3.5" />}
            Save
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              activeTab === tab.key
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'bg-card/40 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Plan Routing ── */}
      {activeTab === 'routing' && routing && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs text-blue-400/90 flex items-start gap-2">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong>User-Facing Quality Labels:</strong> Standard AI · Enhanced AI · Premium AI · Cinematic AI.
              Technical model names are never shown to users — only these labels appear.
            </div>
          </div>

          <div className="space-y-2">
            {PLAN_ROUTING_KEYS.map(({ key, label, desc, color, special }) => (
              <RouteRow
                key={key}
                label={label}
                desc={desc}
                color={color}
                routeConfig={routing.plan_models?.[key] || {}}
                onChange={val => setPlanRoute(key, val)}
                isSpecial={!!special}
              />
            ))}
          </div>

          {/* Fallback */}
          <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <p className="text-xs font-bold text-red-400">Fallback Model</p>
              <p className="text-[10px] text-muted-foreground">Used when primary model fails or cost protection triggers</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Provider</label>
                <select
                  value={routing.fallback?.provider || 'openai'}
                  onChange={e => setFallback({ ...routing.fallback, provider: e.target.value, model: MODELS_BY_PROVIDER[e.target.value]?.[0] || '' })}
                  className="w-full h-8 text-xs bg-background border border-border/40 rounded-md px-2 text-foreground focus:outline-none"
                >
                  {TEXT_PROVIDERS.map(p => (
                    <option key={p} value={p}>{PROVIDERS[p]?.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Model</label>
                <select
                  value={routing.fallback?.model || 'gpt-4o-mini'}
                  onChange={e => setFallback({ ...routing.fallback, model: e.target.value })}
                  className="w-full h-8 text-xs bg-background border border-border/40 rounded-md px-2 text-foreground focus:outline-none"
                >
                  {(MODELS_BY_PROVIDER[routing.fallback?.provider || 'openai'] || []).map(m => (
                    <option key={m} value={m}>{MODEL_LABELS[m] || m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Label</label>
                <select
                  value={routing.fallback?.quality_label || 'Standard AI'}
                  onChange={e => setFallback({ ...routing.fallback, quality_label: e.target.value })}
                  className="w-full h-8 text-xs bg-background border border-border/40 rounded-md px-2 text-foreground focus:outline-none"
                >
                  {QUALITY_LABELS.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Providers ── */}
      {activeTab === 'providers' && (
        <div className="p-5 rounded-xl border border-border/40 bg-card/30 space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400/80">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div className="space-y-1">
              <div><strong>Active Providers:</strong> OpenAI (TTS + GPT-4o), Replicate (Flux Images + SVD Video)</div>
              <div><strong>Video:</strong> Replicate SVD is active. Grok Video: Waiting API access (requires xAI Imagine upgrade). Fallback: Runway, Kling, Pika, Luma.</div>
              <div><strong>Audio:</strong> OpenAI TTS is active for narration. Music (Suno/Udio) and SFX (Stable Audio) require API keys.</div>
              <div className="pt-1 border-t border-amber-500/20 mt-1"><strong>Note:</strong> Grok video may require separate xAI Imagine API access. Enable only after successful video test. Unsafe/spicy modes permanently disabled.</div>
            </div>
          </div>
          <ProviderGrid serverProviders={serverProviders} providerTests={providerTests} />
        </div>
      )}

      {/* ── TAB: Cost Protection ── */}
      {activeTab === 'protection' && routing && (
        <div className="p-5 rounded-xl border border-border/40 bg-card/30 space-y-5">
          <div>
            <p className="text-sm font-bold text-foreground mb-1">Cost Protection Threshold</p>
            <p className="text-xs text-muted-foreground mb-3">If a model's estimated cost-per-call exceeds this amount, the system automatically routes to the fallback model instead.</p>
            <div className="flex items-center gap-3">
              <div className="relative w-40">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={0}
                  step={0.001}
                  value={routing.cost_threshold_usd ?? 0.05}
                  onChange={e => setRouting(r => ({ ...r, cost_threshold_usd: Number(e.target.value) }))}
                  className="h-8 pl-6 text-sm bg-background/60 border-border/40"
                />
              </div>
              <p className="text-xs text-muted-foreground">per call (USD)</p>
            </div>
          </div>

          <div className="pt-2 border-t border-border/30">
            <p className="text-sm font-bold text-foreground mb-1">Admin Override</p>
            <p className="text-xs text-muted-foreground mb-3">Allow admin accounts to bypass cost protection and use the configured model regardless of cost.</p>
            <button
              type="button"
              onClick={() => setRouting(r => ({ ...r, admin_cost_override: !r.admin_cost_override }))}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                routing.admin_cost_override
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-background/40 border-border/30 text-muted-foreground hover:border-border/60'
              }`}
            >
              <div className={`w-9 h-5 rounded-full transition-colors relative ${routing.admin_cost_override ? 'bg-primary' : 'bg-border/60'}`}>
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${routing.admin_cost_override ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              {routing.admin_cost_override ? 'Admin bypass enabled' : 'Admin bypass disabled'}
            </button>
          </div>

          <div className="pt-2 border-t border-border/30">
            <p className="text-xs font-bold text-foreground mb-2">Model Cost Reference</p>
            <div className="space-y-1">
              {[
                { model: 'GPT-4o Mini',       cost: '$0.002', safe: true },
                { model: 'GPT-4o',            cost: '$0.010', safe: true },
                { model: 'o1 Mini',           cost: '$0.015', safe: false },
                { model: 'o3 Mini',           cost: '$0.040', safe: false },
                { model: 'Gemini Flash',       cost: '$0.001', safe: true },
                { model: 'Claude Haiku',       cost: '$0.002', safe: true },
                { model: 'Claude Sonnet',      cost: '$0.012', safe: false },
              ].map(({ model, cost, safe }) => (
                <div key={model} className="flex items-center justify-between text-xs py-1 border-b border-border/20">
                  <span className="text-foreground/80">{model}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-foreground">{cost}</span>
                    <Badge className={`text-[9px] border ${safe ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                      {safe ? 'Under threshold' : 'May trigger fallback'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}