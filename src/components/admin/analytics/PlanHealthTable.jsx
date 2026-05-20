import { TrendingUp, TrendingDown } from 'lucide-react';

const PLAN_COLORS = {
  free:    'text-muted-foreground',
  starter: 'text-blue-400',
  premium: 'text-purple-400',
  elite:   'text-amber-400',
  admin:   'text-primary',
};

const PLAN_LABELS = {
  free:    'Free',
  starter: 'Starter',
  premium: 'Creator Pro',
  elite:   'Studio Elite',
  admin:   'Admin',
};

export default function PlanHealthTable({ plans }) {
  if (!plans || plans.length === 0) return <p className="text-xs text-muted-foreground py-4 text-center">No plan data yet.</p>;

  return (
    <div className="rounded-xl border border-border/40 overflow-hidden">
      <div className="grid grid-cols-[1fr_60px_80px_80px_80px_80px] gap-2 px-4 py-2 bg-secondary/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
        <span>Plan</span>
        <span className="text-right">Users</span>
        <span className="text-right">Avg Gems/mo</span>
        <span className="text-right">Avg Cost</span>
        <span className="text-right">Avg Revenue</span>
        <span className="text-right">Status</span>
      </div>
      {plans.map((p, i) => (
        <div
          key={p.plan}
          className={`grid grid-cols-[1fr_60px_80px_80px_80px_80px] gap-2 px-4 py-2.5 items-center text-xs ${i % 2 === 0 ? 'bg-card/20' : 'bg-card/5'}`}
        >
          <span className={`font-semibold ${PLAN_COLORS[p.plan] || 'text-foreground'}`}>{PLAN_LABELS[p.plan] || p.plan}</span>
          <span className="text-right text-muted-foreground">{p.users}</span>
          <span className="text-right font-mono">{p.avgGemsUsed} 💎</span>
          <span className="text-right font-mono text-rose-400">${p.avgCostPerUser}</span>
          <span className="text-right font-mono text-green-400">${p.avgRevPerUser}</span>
          <div className="flex justify-end">
            {p.plan === 'free' || p.plan === 'admin' ? (
              <span className="text-[10px] text-muted-foreground">—</span>
            ) : p.profitable ? (
              <span className="flex items-center gap-0.5 text-[10px] text-green-400 font-medium">
                <TrendingUp className="w-3 h-3" /> OK
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-[10px] text-red-400 font-medium">
                <TrendingDown className="w-3 h-3" /> Risk
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}