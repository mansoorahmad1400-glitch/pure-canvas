import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';

const PRESETS = [
  { label: 'Today',        days: 0 },
  { label: 'Last 7 days',  days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'This Month',   days: -1 }, // special
];

export default function DateRangeFilter({ dateFrom, dateTo, onDateFrom, onDateTo, activePreset, onPreset }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
      {PRESETS.map(p => (
        <button
          key={p.label}
          onClick={() => onPreset(p)}
          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
            activePreset === p.label
              ? 'bg-primary/15 border-primary/30 text-primary'
              : 'bg-card/40 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60'
          }`}
        >
          {p.label}
        </button>
      ))}
      <div className="flex items-center gap-1.5 ml-2">
        <Input
          type="date"
          value={dateFrom}
          onChange={e => onDateFrom(e.target.value)}
          className="h-7 text-xs w-34 border-border/40"
        />
        <span className="text-xs text-muted-foreground">→</span>
        <Input
          type="date"
          value={dateTo}
          onChange={e => onDateTo(e.target.value)}
          className="h-7 text-xs w-34 border-border/40"
        />
      </div>
    </div>
  );
}