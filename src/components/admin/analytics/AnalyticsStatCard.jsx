export default function AnalyticsStatCard({ label, value, sub, icon: Icon, color = 'text-foreground', highlight }) {
  return (
    <div className={`p-4 rounded-xl border border-border/40 bg-card/50 ${highlight ? 'border-primary/30 bg-primary/5' : ''}`}>
      <div className="flex items-center gap-2 mb-1.5">
        {Icon && <Icon className={`w-3.5 h-3.5 ${color}`} />}
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-2xl font-bold font-playfair ${color}`}>{value ?? '—'}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}