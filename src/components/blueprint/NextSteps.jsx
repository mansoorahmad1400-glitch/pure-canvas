import { ImageIcon, Video, Mic, Package, Sparkles } from 'lucide-react';

const STUDIO_TABS = [
  {
    icon: ImageIcon,
    label: 'Images',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    dot: 'bg-purple-400',
  },
  {
    icon: Video,
    label: 'Video',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    dot: 'bg-blue-400',
  },
  {
    icon: Mic,
    label: 'Audio',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
  },
  {
    icon: Package,
    label: 'Export',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    dot: 'bg-green-400',
  },
];

export default function NextSteps() {
  return (
    <div className="mt-10 pt-8 border-t border-border/40">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-playfair text-lg font-bold text-foreground">AI Creation Studio</h3>
          <p className="text-xs text-muted-foreground">Native generation pipelines — fully self-contained</p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STUDIO_TABS.map(({ icon: Icon, label, color, bg, border, dot }) => (
          <div
            key={label}
            className={`rounded-2xl border ${border} ${bg} p-5 flex flex-col items-center gap-3 text-center`}
          >
            <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className={`text-sm font-bold ${color}`}>{label}</p>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />
              <p className="text-[10px] text-muted-foreground leading-tight">Native generation system initializing</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}