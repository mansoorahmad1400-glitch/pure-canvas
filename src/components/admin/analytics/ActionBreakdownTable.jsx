import { Badge } from '@/components/ui/badge';

const CAT_COLORS = {
  text:   'bg-blue-500/10 text-blue-400',
  image:  'bg-purple-500/10 text-purple-400',
  video:  'bg-amber-500/10 text-amber-400',
  audio:  'bg-green-500/10 text-green-400',
  export: 'bg-rose-500/10 text-rose-400',
  system: 'bg-muted text-muted-foreground',
  admin:  'bg-primary/10 text-primary',
};

export default function ActionBreakdownTable({ actions }) {
  if (!actions || actions.length === 0) {
    return <p className="text-xs text-muted-foreground py-4 text-center">No action data in selected range.</p>;
  }

  return (
    <div className="rounded-xl border border-border/40 overflow-hidden">
      <div className="grid grid-cols-[1fr_70px_60px_70px_70px_70px] gap-2 px-4 py-2 bg-secondary/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        <span>Action</span>
        <span>Category</span>
        <span className="text-right">Count</span>
        <span className="text-right">Gems</span>
        <span className="text-right">Rev Est.</span>
        <span className="text-right">Margin</span>
      </div>
      {actions.slice(0, 20).map((a, i) => (
        <div
          key={a.key}
          className={`grid grid-cols-[1fr_70px_60px_70px_70px_70px] gap-2 px-4 py-2.5 items-center text-xs ${i % 2 === 0 ? 'bg-card/20' : 'bg-card/5'}`}
        >
          <span className="font-medium text-foreground truncate">{a.key}</span>
          <div>
            <Badge className={`text-[10px] border-0 ${CAT_COLORS[a.category] || 'text-muted-foreground'}`}>
              {a.category || '—'}
            </Badge>
          </div>
          <span className="text-right font-mono text-muted-foreground">{a.count}</span>
          <span className="text-right font-mono text-rose-400">{a.gems}💎</span>
          <span className="text-right font-mono text-green-400">${a.revenue_value}</span>
          <span className={`text-right font-mono font-semibold ${a.margin >= 50 ? 'text-green-400' : a.margin >= 20 ? 'text-amber-400' : 'text-red-400'}`}>
            {a.margin}%
          </span>
        </div>
      ))}
    </div>
  );
}