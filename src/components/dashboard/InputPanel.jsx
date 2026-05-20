import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import MobileSelect from '@/components/ui/MobileSelect';
import { Button } from '@/components/ui/button';
import { Sparkles, Wand2, Gem, Crown, Lock, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const PROJECT_TYPES = [
  { value: 'auto', label: '🔄 Auto-select' },
  { value: 'rhyme', label: '🎵 Rhyme / Kids Song' },
  { value: 'story', label: '📖 Story / Emotional' },
  { value: 'fantasy', label: '🧙 Fantasy / Magical' },
  { value: 'adventure', label: '⚔️ Adventure / Action' },
  { value: 'documentary', label: '🎬 Cultural / Documentary' },
  { value: 'mystery', label: '🔍 Mystery / Suspense' },
  { value: 'fairy_tale', label: '✨ Fairy Tale' },
  { value: 'mythology', label: '🏛️ Mythology' },
  { value: 'educational', label: '📚 Educational' },
];

const VISUAL_TOOLS = [
  { value: 'auto', label: '🔄 Auto-select' },
  { value: 'grok', label: '🤖 Grok' },
  { value: 'meta', label: '📱 Meta' },
  { value: 'midjourney', label: 'Midjourney' },
  { value: 'dalle', label: 'DALL-E 3' },
  { value: 'runway', label: 'Runway ML' },
  { value: 'kling', label: 'Kling AI' },
  { value: 'pika', label: 'Pika Labs' },
  { value: 'sora', label: 'Sora' },
  { value: 'stable_diffusion', label: 'Stable Diffusion' },
];

const SOUND_TOOLS = [
  { value: 'auto', label: '🔄 Auto-select' },
  { value: 'suno', label: 'Suno AI' },
  { value: 'elevenlabs', label: 'ElevenLabs' },
  { value: 'elevenlabs_suno', label: 'ElevenLabs + Suno AI' },
  { value: 'udio', label: 'Udio' },
  { value: 'mubert', label: 'Mubert' },
];

const AUDIENCES = [
  { value: 'auto', label: '🔄 Auto-select' },
  { value: 'kids', label: 'Kids (3–8)' },
  { value: 'family', label: 'Family' },
  { value: 'teens', label: 'Teens' },
  { value: 'adults', label: 'Adults' },
  { value: 'universal', label: 'Universal' },
];

const ALL_DURATIONS = [
  { value: 'auto', label: '🔄 Auto-select' },
  { value: '60', label: '1 min (Short)' },
  { value: '180', label: '3 min' },
  { value: '300', label: '5 min' },
  { value: '600', label: '10 min' },
  { value: '900', label: '15 min' },
  { value: '1800', label: '30 min' },
];

// Free: auto only, Pro: auto + 1–5 min, Elite: all
function getDurations(isPremium, isElite, isAdmin) {
  if (isElite || isAdmin) return ALL_DURATIONS;
  if (isPremium) return ALL_DURATIONS.filter(d => ['auto','60','180','300'].includes(d.value));
  return ALL_DURATIONS.filter(d => d.value === 'auto');
}

function getGenerationModes(isStarter, isPremium, isElite, isAdmin) {
  const max = isAdmin || isElite ? 18 : isPremium ? 15 : isStarter ? 12 : 8;
  const quick    = Math.round(max * 0.65);
  const stdLow   = Math.round(max * 0.55);
  const stdHigh  = Math.round(max * 0.80);
  const detLow   = Math.round(max * 0.75);
  return [
    { value: 'quick',    label: '⚡ Quick',    desc: `4–${quick} scenes` },
    { value: 'standard', label: '🎥 Standard', desc: `${stdLow}–${stdHigh} scenes` },
    { value: 'detailed', label: '🎞 Detailed', desc: `${detLow}–${max} scenes` },
  ];
}

const LANGUAGE_OPTIONS = [
  'English', 'Roman Urdu', 'Hindi', 'Arabic', 'Spanish', 'French', 'Turkish', 'Malay', 'Bengali',
];

function autoSelectForType(projectType) {
  const map = {
    rhyme:       { sound_tool: 'suno',            visual_tool: 'grok', audience: 'kids', duration: '180' },
    story:       { sound_tool: 'elevenlabs_suno', visual_tool: 'grok', audience: 'family', duration: '300' },
    fairy_tale:  { sound_tool: 'elevenlabs_suno', visual_tool: 'grok', audience: 'family', duration: '300' },
    fantasy:     { sound_tool: 'elevenlabs_suno', visual_tool: 'grok', audience: 'universal', duration: '300' },
    adventure:   { sound_tool: 'elevenlabs_suno', visual_tool: 'grok', audience: 'teens', duration: '300' },
    documentary: { sound_tool: 'elevenlabs',      visual_tool: 'meta', audience: 'adults', duration: '600' },
    mystery:     { sound_tool: 'elevenlabs_suno', visual_tool: 'grok', audience: 'adults', duration: '300' },
    mythology:   { sound_tool: 'elevenlabs_suno', visual_tool: 'grok', audience: 'universal', duration: '300' },
    educational: { sound_tool: 'elevenlabs',      visual_tool: 'meta', audience: 'family', duration: '300' },
  };
  return map[projectType] || {};
}

const FIELD_STYLES = 'bg-background/60 border-border/40 focus:border-primary/50 transition-colors h-10 text-sm';
const LABEL_STYLES = 'text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block';

const Field = memo(({ label, children }) => (
  <div>
    <label className={LABEL_STYLES}>{label}</label>
    {children}
  </div>
));
Field.displayName = 'Field';

const LANG_LIMIT = { free: 2, starter: 3 };

const InputPanel = memo(function InputPanel({ form, onChange, onGenerate, isGenerating, canGenerate, isStarter, isPremium, isElite, isAdmin, gems, isLowGems, maxScenes, gemCost }) {
  const DURATIONS = getDurations(isPremium, isElite, isAdmin);
  const GENERATION_MODES = getGenerationModes(isStarter, isPremium, isElite, isAdmin);
  const navigate = useNavigate();

  const langLimit = isAdmin || isPremium || isElite ? Infinity : isStarter ? LANG_LIMIT.starter : LANG_LIMIT.free;

  const handleTypeChange = (val) => {
    const auto = autoSelectForType(val);
    onChange({
      ...form,
      project_type: val,
      duration: form.duration === 'auto' || !form.duration ? auto.duration || 'auto' : form.duration,
      sound_tool: form.sound_tool === 'auto' || !form.sound_tool ? auto.sound_tool || 'auto' : form.sound_tool,
      visual_tool: form.visual_tool === 'auto' || !form.visual_tool ? auto.visual_tool || 'auto' : form.visual_tool,
      audience: form.audience === 'auto' || !form.audience ? auto.audience || 'auto' : form.audience,
    });
  };

  const toggleLanguage = (lang) => {
    const langs = form.languages || [];
    if (langs.includes(lang)) {
      onChange({ ...form, languages: langs.filter(l => l !== lang) });
      return;
    }
    if (langs.length >= langLimit) {
      navigate('/upgrade');
      return;
    }
    onChange({ ...form, languages: [...langs, lang] });
  };

  const handleInputChange = (field, value) => {
    onChange({ ...form, [field]: value });
  };

  return (
    <div className="flex flex-col">
      {/* Panel header */}
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-border/40">
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
          <Wand2 className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">Project Setup</h2>
          <p className="text-xs text-muted-foreground">Configure your creative vision</p>
        </div>
      </div>

      <div className="space-y-4 flex-1">

        {/* Project Idea */}
        <Field label="Project Idea / Thought">
          <Input
            placeholder="e.g. A brave young girl discovers a magical lantern that grants one wish..."
            value={form.project_name || ''}
            onChange={e => handleInputChange('project_name', e.target.value)}
            className={FIELD_STYLES}
            autoComplete="off"
            type="text"
          />
        </Field>

        {/* Duration */}
        <Field label="Total Video Duration">
          <div className="relative">
            <MobileSelect
              value={form.duration}
              onValueChange={v => onChange({ ...form, duration: v })}
              placeholder="Select duration..."
              options={DURATIONS}
              className={FIELD_STYLES}
            />
            {!isPremium && !isElite && !isAdmin && (
              <button
                onClick={() => navigate('/upgrade')}
                className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-amber-400 font-semibold hover:text-amber-300 transition-colors"
                title="Upgrade to unlock more durations"
              >
                <Lock className="w-3 h-3" /> Unlock
              </button>
            )}
          </div>
          {isPremium && !isElite && !isAdmin && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Pro: up to 5 min ·{' '}
              <button onClick={() => navigate('/upgrade')} className="text-amber-400 hover:underline">
                Elite unlocks all durations
              </button>
            </p>
          )}
        </Field>

        {/* Generation Mode — always visible */}
        <div>
          <label className={LABEL_STYLES}>
            Generation Mode
            {form.duration && form.duration !== 'auto' && (
              <span className="ml-1 text-orange-400 normal-case font-normal">(overridden by duration)</span>
            )}
          </label>
          <div className="flex gap-2">
            {GENERATION_MODES.map(m => {
              const selected = (form.generation_mode || 'quick') === m.value;
              const isOverridden = form.duration && form.duration !== 'auto';
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => !isOverridden && handleInputChange('generation_mode', m.value)}
                  className={[
                    'flex-1 flex flex-col items-center py-2 px-1 rounded-lg border text-xs font-medium transition-all',
                    isOverridden
                      ? 'opacity-40 cursor-not-allowed bg-background/20 border-border/20 text-muted-foreground'
                      : selected
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-background/40 border-border/40 text-muted-foreground hover:border-border'
                  ].join(' ')}
                >
                  <span>{m.label}</span>
                  <span className="text-[10px] opacity-70 mt-0.5">{m.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Project Type */}
        <Field label="Project Type">
          <MobileSelect
            value={form.project_type}
            onValueChange={handleTypeChange}
            placeholder="Select type..."
            options={PROJECT_TYPES}
            className={FIELD_STYLES}
          />
        </Field>

        {/* Sound + Visual tools */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sound Tool">
            <MobileSelect
              value={form.sound_tool}
              onValueChange={v => onChange({ ...form, sound_tool: v })}
              placeholder="Auto..."
              options={SOUND_TOOLS}
              className={FIELD_STYLES}
            />
          </Field>
          <Field label="Visual Tool">
            <MobileSelect
              value={form.visual_tool}
              onValueChange={v => onChange({ ...form, visual_tool: v })}
              placeholder="Auto..."
              options={VISUAL_TOOLS}
              className={FIELD_STYLES}
            />
          </Field>
        </div>

        {/* Audience */}
        <Field label="Target Audience">
          <MobileSelect
            value={form.audience}
            onValueChange={v => onChange({ ...form, audience: v })}
            placeholder="Select audience..."
            options={AUDIENCES}
            className={FIELD_STYLES}
          />
        </Field>

        {/* Scene limit info */}
        {maxScenes && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary/40 border border-border/30 rounded-lg px-3 py-1.5">
            <Info className="w-3 h-3 shrink-0 text-primary/60" />
            <span>Your plan supports up to <span className="font-semibold text-foreground">{maxScenes} scenes</span> per blueprint.</span>
          </div>
        )}

        {/* Languages */}
        <Field label="Languages (Auto: English + secondary)">
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGE_OPTIONS.map(lang => {
              const selected = (form.languages || []).includes(lang);
              const selectedCount = (form.languages || []).length;
              const locked = !selected && selectedCount >= langLimit;
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                    selected
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : locked
                      ? 'bg-background/20 border-border/20 text-muted-foreground/40 cursor-pointer'
                      : 'bg-background/40 border-border/40 text-muted-foreground hover:border-border'
                  }`}
                  title={locked ? `Upgrade to select more languages` : undefined}
                >
                  {locked && <Lock className="w-2.5 h-2.5 inline mr-1 opacity-60" />}
                  {lang}
                </button>
              );
            })}
          </div>
          {langLimit < Infinity && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {isStarter
                ? <>Starter: up to 3 languages · <button onClick={() => navigate('/upgrade')} className="text-primary hover:underline">Upgrade for unlimited</button></>
                : <>Free: up to 2 languages · <button onClick={() => navigate('/upgrade')} className="text-primary hover:underline">Upgrade for more</button></>
              }
            </p>
          )}
        </Field>

        {/* Topic */}
        <Field label="Topic / Story Concept">
          <Textarea
            placeholder="e.g. A brave young girl discovers a magical lantern that grants one wish..."
            value={form.topic || ''}
            onChange={e => handleInputChange('topic', e.target.value)}
            className="bg-background/60 border-border/40 focus:border-primary/50 transition-colors text-sm resize-none min-h-[80px]"
            autoComplete="off"
          />
        </Field>

        {/* Moral */}
        <Field label="Moral / Message">
          <Input
            placeholder="e.g. Kindness is the greatest strength..."
            value={form.moral || ''}
            onChange={e => handleInputChange('moral', e.target.value)}
            className={FIELD_STYLES}
            autoComplete="off"
            type="text"
          />
        </Field>

        {/* Story Goal */}
        <Field label="Story Goal">
          <Input
            placeholder="e.g. Inspire children to be brave and honest..."
            value={form.story_goal || ''}
            onChange={e => handleInputChange('story_goal', e.target.value)}
            className={FIELD_STYLES}
            autoComplete="off"
            type="text"
          />
        </Field>
      </div>

      {/* Generate Button */}
      <div className="mt-5 pt-4 border-t border-border/40 space-y-2">
        {!canGenerate ? (
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-red-400">
              <Lock className="w-4 h-4" />
              <span>Free limit reached</span>
            </div>
            <p className="text-xs text-muted-foreground px-2">
              Upgrade to Creator Pro or Studio Elite to continue creating.
            </p>
            <Link to="/upgrade" className="block">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11">
                <Crown className="w-4 h-4 mr-2" /> Upgrade Plan
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {isAdmin && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="w-3 h-3 text-primary" />
                <span>Admin — Unlimited</span>
              </div>
            )}
            {isElite && !isAdmin && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400">
                <Crown className="w-3 h-3" />
                <span>Studio Elite · <span className="font-semibold">{gems}/1200</span> gems this month</span>
              </div>
            )}
            {isPremium && !isElite && !isAdmin && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-primary">
                <Crown className="w-3 h-3" />
                <span>Creator Pro · <span className="font-semibold">{gems}/500</span> gems this month</span>
              </div>
            )}
            {!isPremium && !isElite && !isAdmin && (
              <div className={`flex items-center justify-center gap-1.5 text-xs ${isLowGems ? 'text-orange-400' : 'text-muted-foreground'}`}>
                <Gem className={`w-3 h-3 ${isLowGems ? 'text-orange-400' : 'text-primary'}`} />
                <span>
                  Uses <span className="text-foreground font-semibold">1 gem</span> ·{' '}
                  {isLowGems
                    ? <span className="text-orange-400 font-semibold">{gems}/2 gems left</span>
                    : <span>{gems}/2 remaining</span>
                  }
                </span>
              </div>
            )}
            <Button
              onClick={onGenerate}
              disabled={isGenerating || !form.project_name}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-xl"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Generating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate Blueprint
                  {!isAdmin && gemCost != null && (
                    <span className="ml-1 text-primary-foreground/70 font-normal text-xs">— {gemCost} 💎</span>
                  )}
                </span>
              )}
            </Button>
            {!isAdmin && maxScenes && (
              <p className="text-center text-[10px] text-muted-foreground">
                Scene limit: <span className="font-semibold text-foreground">{maxScenes} scenes</span> on {isElite ? 'Studio Elite' : isPremium ? 'Creator Pro' : isStarter ? 'Starter' : 'Free'} Plan
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
});

InputPanel.displayName = 'InputPanel';
export default InputPanel;