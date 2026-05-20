import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#f59e0b', '#3b82f6', '#a855f7', '#22c55e', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6'];

export default function GemSpendChart({ data, valueKey = 'gems', labelKey = 'key', title }) {
  if (!data || data.length === 0) {
    return <p className="text-xs text-muted-foreground py-6 text-center">No data to display.</p>;
  }

  const chartData = data.slice(0, 8).map(d => ({
    name: d[labelKey]?.replace(/_/g, ' ') || '?',
    value: d[valueKey] || 0,
  }));

  return (
    <div>
      {title && <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{title}</p>}
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', angle: -30, textAnchor: 'end' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={28} />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '11px',
              color: 'hsl(var(--foreground))',
            }}
            cursor={{ fill: 'hsl(var(--secondary))' }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}