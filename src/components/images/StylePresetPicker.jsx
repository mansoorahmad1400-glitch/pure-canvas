const PRESETS = [
  { key: 'cinematic_realistic', label: 'Cinematic',     emoji: '🎬' },
  { key: 'pixar_style',         label: 'Pixar',          emoji: '✨' },
  { key: 'anime',               label: 'Anime',          emoji: '⛩️' },
  { key: 'hyper_realistic',     label: 'Hyper Real',     emoji: '📷' },
  { key: 'fantasy',             label: 'Fantasy',        emoji: '🧙' },
  { key: 'dark_thriller',       label: 'Dark Thriller',  emoji: '🌑' },
  { key: 'pakistani_drama',     label: 'Pakistani Drama',emoji: '🎭' },
  { key: 'disney_inspired',     label: 'Disney',         emoji: '🏰' },
  { key: 'neon_cyberpunk',      label: 'Cyberpunk',      emoji: '🌆' },
  { key: 'historical_epic',     label: 'Historical',     emoji: '⚔️' },
];

export { PRESETS };

/**
 * @param {object} props
 * @param {string} props.value - current style key (may be 'script_style')
 * @param {function} props.onChange
 * @param {boolean} props.disabled
 * @param {string|null} props.scriptStyleLabel - human-readable label shown when script_style is active
 */
export default function StylePresetPicker({ value, onChange, disabled, scriptStyleLabel }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Style Preset</p>

      {/* Script Style — always first */}
      <div className="mb-2">
        <button
          onClick={() => onChange('script_style')}
          disabled={disabled}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
            value === 'script_style'
              ? 'bg-primary/15 border-primary/40 text-primary'
              : 'bg-background/50 border-border/30 text-muted-foreground hover:border-border/60 hover:text-foreground'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <span>🎭</span>
          <span className="flex-1 text-left">Use Script Style</span>
          {value === 'script_style' && scriptStyleLabel && (
            <span className="text-[10px] opacity-70 font-normal truncate max-w-[130px]">
              Using: {scriptStyleLabel}
            </span>
          )}
          {value !== 'script_style' && (
            <span className="text-[10px] opacity-50 font-normal">default</span>
          )}
        </button>
      </div>

      {/* Divider */}
      <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest mb-1.5">— or choose manually —</p>

      {/* Manual overrides */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            disabled={disabled}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              value === p.key
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-background/50 border-border/30 text-muted-foreground hover:border-border/60 hover:text-foreground'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span>{p.emoji}</span> {p.label}
          </button>
        ))}
      </div>

      {/* Override label */}
      {value !== 'script_style' && (
        <p className="mt-1.5 text-[10px] text-amber-400/70 flex items-center gap-1">
          ⚠️ Manual override: {PRESETS.find(p => p.key === value)?.label || value}
        </p>
      )}
    </div>
  );
}