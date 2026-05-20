import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const PLAN_COLORS = { starter: '#3b82f6', premium: '#a855f7', elite: '#f59e0b' };
const PLAN_LABELS = { starter: 'Starter', premium: 'Creator Pro', elite: 'Studio Elite' };

export default function RevenueBreakdown({ revenueByPlan }) {
  const data = Object.entries(revenueByPlan || {})
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: PLAN_LABELS[key] || key, value: +value.toFixed(2), color: PLAN_COLORS[key] || '#6b7280' }));

  if (data.length === 0) {
    return <p className="text-xs text-muted-foreground py-6 text-center">No paid subscribers yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, value }) => `${name} $${value}`} labelLine={false}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} fillOpacity={0.85} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '11px',
            color: 'hsl(var(--foreground))',
          }}
          formatter={v => [`$${v}`, 'MRR']}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}