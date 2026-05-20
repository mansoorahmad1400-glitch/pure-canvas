import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Save, RefreshCw, DollarSign, Gem, Cpu, Layers, SlidersHorizontal, CheckCircle2, Zap } from 'lucide-react';
import ActionPricingTab, { DEFAULT_ACTION_COSTS } from '@/components/admin/ActionPricingTab';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function NumField({ label, value, onChange, prefix, suffix, step = 1 }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className={`h-8 text-sm bg-background/60 border-border/40 focus:border-primary/50 ${prefix ? 'pl-5' : ''} ${suffix ? 'pr-7' : ''}`}
        />
        {suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between w-full px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
        checked
          ? 'bg-primary/10 border-primary/30 text-primary'
          : 'bg-background/40 border-border/30 text-muted-foreground hover:border-border/60'
      }`}
    >
      <span>{label}</span>
      <div className={`w-8 h-4 rounded-full transition-colors relative ${checked ? 'bg-primary' : 'bg-border/60'}`}>
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

// ─── Default config ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  plans: {
    free:    { monthly_price: 0,     yearly_price: 0,      max_scenes: 8,  monthly_gems: 2,    generation_access: true,  export_access: false, ai_model: 'gpt-4o-mini' },
    starter: { monthly_price: 9.99,  yearly_price: 99.99,  max_scenes: 12, monthly_gems: 200,  generation_access: true,  export_access: true,  ai_model: 'gpt-4o-mini' },
    premium: { monthly_price: 19.99, yearly_price: 199.99, max_scenes: 15, monthly_gems: 500,  generation_access: true,  export_access: true,  ai_model: 'gpt-4o-mini' },
    elite:   { monthly_price: 39.99, yearly_price: 399.99, max_scenes: 18, monthly_gems: 1200, generation_access: true,  export_access: true,  ai_model: 'gpt-4o' },
  },
  gem_economy: {
    cost_per_generation: 1,
    cost_per_export: 1,
    bonus_gems_new_user: 0,
    referral_reward: 5,
    free_daily_gems: 0,
  },
  model_costs: {
    openai:  { text: 1, image: 2, video: 5, upscale: 1, sound: 2 },
    gemini:  { text: 1, image: 2, video: 5, upscale: 1, sound: 2 },
    grok:    { text: 1, image: 2, video: 5, upscale: 1, sound: 2 },
    future:  { text: 1, image: 2, video: 5, upscale: 1, sound: 2 },
  },
  feature_access: {
    free:    { image_gen: false, video_gen: false, exports: false, cinematic_mode: false, ultra_prompts: false, long_form: false, thumbnail_gen: false, youtube_package: true  },
    starter: { image_gen: false, video_gen: false, exports: true,  cinematic_mode: false, ultra_prompts: false, long_form: false, thumbnail_gen: true,  youtube_package: true  },
    premium: { image_gen: true,  video_gen: false, exports: true,  cinematic_mode: true,  ultra_prompts: false, long_form: false, thumbnail_gen: true,  youtube_package: true  },
    elite:   { image_gen: true,  video_gen: true,  exports: true,  cinematic_mode: true,  ultra_prompts: true,  long_form: true,  thumbnail_gen: true,  youtube_package: true  },
  },
};

const PLAN_META = [
  { key: 'free',    label: 'Free',        color: 'text-muted-foreground', bg: 'bg-secondary/60' },
  { key: 'starter', label: 'Starter',     color: 'text-blue-400',         bg: 'bg-blue-500/10' },
  { key: 'premium', label: 'Creator Pro', color: 'text-purple-400',       bg: 'bg-purple-500/10' },
  { key: 'elite',   label: 'Studio Elite',color: 'text-amber-400',        bg: 'bg-amber-500/10' },
];

const FEATURES = [
  { key: 'image_gen',      label: 'Image Generation' },
  { key: 'video_gen',      label: 'Video Generation' },
  { key: 'exports',        label: 'Exports' },
  { key: 'cinematic_mode', label: 'Cinematic Mode' },
  { key: 'ultra_prompts',  label: 'Ultra Prompts' },
  { key: 'long_form',      label: 'Long-Form Generation' },
  { key: 'thumbnail_gen',  label: 'Thumbnail Generation' },
  { key: 'youtube_package',label: 'YouTube Package' },
];

const MODELS = ['openai', 'gemini', 'grok', 'future'];
const GEN_TYPES = ['text', 'image', 'video', 'upscale', 'sound'];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EconomyManager() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [activeTab, setActiveTab] = useState('plans');

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('economyConfig', {});
      const data = res.data?.config || {};
      setConfig({
        plans: { ...DEFAULT_CONFIG.plans, ...data.plans },
        gem_economy: { ...DEFAULT_CONFIG.gem_economy, ...data.gem_economy },
        model_costs: { ...DEFAULT_CONFIG.model_costs, ...data.model_costs },
        feature_access: { ...DEFAULT_CONFIG.feature_access, ...data.feature_access },
        action_costs: { ...DEFAULT_ACTION_COSTS, ...data.action_costs },
      });
    } catch (e) {
      toast.error('Failed to load economy config');
      setConfig({ ...DEFAULT_CONFIG, action_costs: { ...DEFAULT_ACTION_COSTS } });
    }
    setLoading(false);
  };

  useEffect(() => { loadConfig(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.functions.invoke('economyConfig', { action: 'save', ...config });
      setSavedAt(new Date());
      toast.success('Economy config saved successfully');
    } catch (e) {
      toast.error('Failed to save config');
    }
    setSaving(false);
  };

  const setPlanField = (planKey, field, value) => {
    setConfig(c => ({ ...c, plans: { ...c.plans, [planKey]: { ...c.plans[planKey], [field]: value } } }));
  };
  const setGemField = (field, value) => {
    setConfig(c => ({ ...c, gem_economy: { ...c.gem_economy, [field]: value } }));
  };
  const setModelField = (model, type, value) => {
    setConfig(c => ({ ...c, model_costs: { ...c.model_costs, [model]: { ...c.model_costs[model], [type]: value } } }));
  };
  const setFeature = (planKey, feature, value) => {
    setConfig(c => ({ ...c, feature_access: { ...c.feature_access, [planKey]: { ...c.feature_access[planKey], [feature]: value } } }));
  };

  const setActionCosts = (updater) => {
    setConfig(c => ({ ...c, action_costs: typeof updater === 'function' ? updater(c.action_costs) : updater }));
  };

  const TABS = [
    { key: 'plans',    label: 'Plan Management',    icon: DollarSign },
    { key: 'gems',     label: 'Gem Economy',        icon: Gem },
    { key: 'models',   label: 'AI Model Costs',     icon: Cpu },
    { key: 'features', label: 'Feature Access',     icon: Layers },
    { key: 'scenes',   label: 'Scene Limits',       icon: SlidersHorizontal },
    { key: 'actions',  label: 'Action Pricing',     icon: Zap },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold font-playfair text-foreground">Economy Manager</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Control pricing, scene limits, gem economy, and feature access</p>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved {savedAt.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={loadConfig} className="gap-1.5 h-8 text-xs">
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 h-8 text-xs bg-primary hover:bg-primary/90">
            {saving
              ? <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              : <Save className="w-3.5 h-3.5" />}
            Save Changes
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

      {/* ── TAB: Plan Management ── */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {PLAN_META.map(({ key, label, color, bg }) => {
            const plan = config.plans[key] || {};
            return (
              <div key={key} className={`p-4 rounded-xl border border-border/40 ${bg} space-y-3`}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={`${color} border-0 bg-transparent text-xs font-bold px-0`}>{label}</Badge>
                </div>
                <NumField label="Monthly Price" value={plan.monthly_price ?? 0} onChange={v => setPlanField(key, 'monthly_price', v)} prefix="$" step={0.01} />
                <NumField label="Yearly Price"  value={plan.yearly_price  ?? 0} onChange={v => setPlanField(key, 'yearly_price',  v)} prefix="$" step={0.01} />
                <NumField label="Monthly Gems"  value={plan.monthly_gems  ?? 0} onChange={v => setPlanField(key, 'monthly_gems',  v)} suffix="💎" />
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">AI Model</label>
                  <select
                    value={plan.ai_model || 'gpt-4o-mini'}
                    onChange={e => setPlanField(key, 'ai_model', e.target.value)}
                    className="w-full h-8 text-xs bg-background/60 border border-border/40 rounded-md px-2 text-foreground focus:outline-none focus:border-primary/50"
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gemini-pro">Gemini Pro</option>
                    <option value="grok">Grok</option>
                  </select>
                </div>
                <div className="space-y-1.5 pt-1">
                  <Toggle label="Generation Access" checked={!!plan.generation_access} onChange={v => setPlanField(key, 'generation_access', v)} />
                  <Toggle label="Export Access"     checked={!!plan.export_access}     onChange={v => setPlanField(key, 'export_access', v)} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: Gem Economy ── */}
      {activeTab === 'gems' && (
        <div className="p-5 rounded-xl border border-border/40 bg-card/30">
          <SectionHeader icon={Gem} title="Gem Economy Settings" subtitle="Control gem costs and reward triggers" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <NumField label="Cost per Generation" value={config.gem_economy.cost_per_generation}  onChange={v => setGemField('cost_per_generation', v)}  suffix="💎" />
            <NumField label="Cost per Export"      value={config.gem_economy.cost_per_export}      onChange={v => setGemField('cost_per_export', v)}       suffix="💎" />
            <NumField label="Bonus Gems (New User)" value={config.gem_economy.bonus_gems_new_user}  onChange={v => setGemField('bonus_gems_new_user', v)} suffix="💎" />
            <NumField label="Referral Reward"       value={config.gem_economy.referral_reward}       onChange={v => setGemField('referral_reward', v)}      suffix="💎" />
            <NumField label="Free Daily Gems"        value={config.gem_economy.free_daily_gems}       onChange={v => setGemField('free_daily_gems', v)}     suffix="💎" />
          </div>
        </div>
      )}

      {/* ── TAB: AI Model Costs ── */}
      {activeTab === 'models' && (
        <div className="p-5 rounded-xl border border-border/40 bg-card/30">
          <SectionHeader icon={Cpu} title="AI Model Cost Control" subtitle="Gem cost per operation per model" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left py-2 pr-4 text-muted-foreground font-semibold uppercase tracking-wider">Model</th>
                  {GEN_TYPES.map(t => (
                    <th key={t} className="text-center py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider capitalize">{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODELS.map(model => (
                  <tr key={model} className="border-b border-border/20 hover:bg-card/40">
                    <td className="py-2.5 pr-4 font-semibold capitalize text-foreground">{model === 'future' ? 'Future Models' : model}</td>
                    {GEN_TYPES.map(type => (
                      <td key={type} className="py-2.5 px-2 text-center">
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          value={config.model_costs[model]?.[type] ?? 1}
                          onChange={e => setModelField(model, type, Number(e.target.value))}
                          className="h-7 w-16 text-xs text-center bg-background/60 border-border/40 mx-auto"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Feature Access ── */}
      {activeTab === 'features' && (
        <div className="p-5 rounded-xl border border-border/40 bg-card/30">
          <SectionHeader icon={Layers} title="Feature Access Control" subtitle="Enable or disable features per subscription tier" />
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left py-2 pr-6 text-muted-foreground font-semibold uppercase tracking-wider">Feature</th>
                  {PLAN_META.map(p => (
                    <th key={p.key} className={`text-center py-2 px-3 font-semibold uppercase tracking-wider ${p.color}`}>{p.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map(({ key, label }) => (
                  <tr key={key} className="border-b border-border/20 hover:bg-card/40">
                    <td className="py-2.5 pr-6 text-foreground/80 font-medium">{label}</td>
                    {PLAN_META.map(p => {
                      const checked = !!config.feature_access[p.key]?.[key];
                      return (
                        <td key={p.key} className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => setFeature(p.key, key, !checked)}
                            className={`w-8 h-4 rounded-full transition-colors relative mx-auto block ${checked ? 'bg-primary' : 'bg-border/60'}`}
                          >
                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: Scene Limits ── */}
      {activeTab === 'scenes' && (
        <div className="p-5 rounded-xl border border-border/40 bg-card/30">
          <SectionHeader icon={SlidersHorizontal} title="Scene Limit Control" subtitle="Maximum scenes per blueprint per subscription tier" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {PLAN_META.map(({ key, label, color, bg }) => {
              const val = config.plans[key]?.max_scenes ?? 8;
              return (
                <div key={key} className={`p-4 rounded-xl border border-border/40 ${bg} text-center`}>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${color}`}>{label}</p>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={val}
                    onChange={e => setPlanField(key, 'max_scenes', Number(e.target.value))}
                    className="h-12 text-2xl font-bold text-center bg-background/60 border-border/40 focus:border-primary/50"
                  />
                  <p className="text-[10px] text-muted-foreground mt-2">max scenes</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400/80">
            ⚠ Scene limits here are stored in the Economy Config database. The Blueprint Engine currently reads hardcoded values — connect them to this config for full dynamic control.
          </div>
          </div>
          )}

          {/* ── TAB: Action Pricing ── */}
          {activeTab === 'actions' && config.action_costs && (
          <ActionPricingTab
          costs={config.action_costs}
          setCosts={setActionCosts}
          />
          )}
          </div>
          );
}