import { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Users, Gem, DollarSign, Cpu, TrendingUp, Activity,
  RefreshCw, Download, Shield, BarChart3, Zap,
} from 'lucide-react';

import AnalyticsStatCard   from './analytics/AnalyticsStatCard';
import AlertsBanner        from './analytics/AlertsBanner';
import DateRangeFilter     from './analytics/DateRangeFilter';
import ApiCostAssumptions  from './analytics/ApiCostAssumptions';
import PlanHealthTable     from './analytics/PlanHealthTable';
import ActionBreakdownTable from './analytics/ActionBreakdownTable';
import GemSpendChart       from './analytics/GemSpendChart';
import RevenueBreakdown    from './analytics/RevenueBreakdown';

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV(data) {
  if (!data) return;
  const rows = [
    ['Section', 'Metric', 'Value'],
    ['Users', 'Total', data.user_overview.total],
    ['Users', 'Free', data.user_overview.free],
    ['Users', 'Starter', data.user_overview.starter],
    ['Users', 'Creator Pro', data.user_overview.premium],
    ['Users', 'Studio Elite', data.user_overview.elite],
    ['Users', 'Active Today', data.user_overview.active_today],
    ['Users', 'Active This Month', data.user_overview.active_this_month],
    ['Gems', 'Total Issued', data.gem_economy.total_issued],
    ['Gems', 'Total Spent', data.gem_economy.total_spent],
    ['Gems', 'Total Refunded', data.gem_economy.total_refunded],
    ['Gems', 'Total Remaining', data.gem_economy.total_remaining],
    ['Revenue', 'MRR', data.revenue.mrr],
    ['Revenue', 'Paid Subscribers', data.revenue.paid_subscribers],
    ['Revenue', 'Conversion Rate %', data.revenue.conversion_rate],
    ['Profit', 'Gross Revenue', data.profit_signals.gross_revenue],
    ['Profit', 'API Spend', data.profit_signals.api_spend],
    ['Profit', 'Infra Cost', data.profit_signals.infra_cost],
    ['Profit', 'Net Profit', data.profit_signals.net_profit],
    ['Profit', 'Margin %', data.profit_signals.margin_pct],
    ...(data.action_breakdown || []).map(a => ['Actions', a.key, `count=${a.count} gems=${a.gems} margin=${a.margin}%`]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `analytics_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {Icon && <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0"><Icon className="w-3.5 h-3.5 text-primary" /></div>}
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [activePreset, setActivePreset] = useState('');
  const [apiCosts, setApiCosts] = useState(null); // local overrides for display

  const load = useCallback(async (from, to) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('adminAnalytics', {
        date_from: from || dateFrom || undefined,
        date_to:   to   || dateTo   || undefined,
      });
      setData(res.data);
      if (!apiCosts && res.data?.api_cost?.defaults) {
        setApiCosts(res.data.api_cost.defaults);
      }
    } catch (e) {
      toast.error('Failed to load analytics');
    }
    setLoading(false);
  }, [dateFrom, dateTo, apiCosts]);

  // Load on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const handlePreset = (preset) => {
    setActivePreset(preset.label);
    const now = new Date();
    let from, to;
    to = now.toISOString().split('T')[0];

    if (preset.days === 0) {
      from = to;
    } else if (preset.days === -1) {
      // This month
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    } else {
      const d = new Date(now);
      d.setDate(d.getDate() - preset.days);
      from = d.toISOString().split('T')[0];
    }

    setDateFrom(from);
    setDateTo(to);
    load(from, to);
  };

  // Recompute estimated profit with local cost overrides
  const computedProfit = data && apiCosts ? (() => {
    const counts = data.gem_economy.action_type_counts || {};
    const spend =
      (counts.text   || 0) * (apiCosts.text_per_call   || 0) +
      (counts.image  || 0) * (apiCosts.image_per_call  || 0) +
      (counts.video  || 0) * (apiCosts.video_per_call  || 0) +
      (counts.audio  || 0) * (apiCosts.audio_per_call  || 0) +
      (counts.export || 0) * (apiCosts.export_per_call || 0);
    const profit = data.profit_signals.gross_revenue - spend - data.profit_signals.infra_cost;
    const margin = data.profit_signals.gross_revenue > 0
      ? ((profit / data.profit_signals.gross_revenue) * 100).toFixed(1)
      : 0;
    return { spend: +spend.toFixed(2), profit: +profit.toFixed(2), margin };
  })() : null;

  const ps = computedProfit || data?.profit_signals || {};

  if (!data && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Load analytics data</p>
        <Button size="sm" onClick={() => load()} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Load Analytics
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between flex-wrap">
        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFrom={setDateFrom}
          onDateTo={setDateTo}
          activePreset={activePreset}
          onPreset={handlePreset}
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading} className="h-8 gap-1.5 text-xs">
            {loading
              ? <span className="w-3.5 h-3.5 border-2 border-border/50 border-t-primary rounded-full animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV(data)} disabled={!data} className="h-8 gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {data && <>

        {/* ── Alerts ──────────────────────────────────────────────────────── */}
        <Section title="Alerts" icon={Shield}>
          <AlertsBanner alerts={data.alerts} />
        </Section>

        {/* ── User Overview ───────────────────────────────────────────────── */}
        <Section title="User Overview" icon={Users}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AnalyticsStatCard label="Total Users"       value={data.user_overview.total}           icon={Users}    color="text-foreground" />
            <AnalyticsStatCard label="Free"              value={data.user_overview.free}            icon={Users}    color="text-muted-foreground" />
            <AnalyticsStatCard label="Starter"           value={data.user_overview.starter}         icon={Users}    color="text-blue-400" />
            <AnalyticsStatCard label="Creator Pro"       value={data.user_overview.premium}         icon={Users}    color="text-purple-400" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <AnalyticsStatCard label="Studio Elite"      value={data.user_overview.elite}           icon={Users}    color="text-amber-400" />
            <AnalyticsStatCard label="Active Today"      value={data.user_overview.active_today}    icon={Activity} color="text-green-400" />
            <AnalyticsStatCard label="Active This Month" value={data.user_overview.active_this_month} icon={Activity} color="text-primary" />
          </div>
        </Section>

        {/* ── Gem Economy ─────────────────────────────────────────────────── */}
        <Section title="Gem Economy" icon={Gem}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AnalyticsStatCard label="Total Issued"    value={`${data.gem_economy.total_issued}💎`}    color="text-foreground" />
            <AnalyticsStatCard label="Total Spent"     value={`${data.gem_economy.total_spent}💎`}     color="text-rose-400" />
            <AnalyticsStatCard label="Total Refunded"  value={`${data.gem_economy.total_refunded}💎`}  color="text-amber-400" />
            <AnalyticsStatCard label="Total Remaining" value={`${data.gem_economy.total_remaining}💎`} color="text-green-400" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="p-4 rounded-xl border border-border/40 bg-card/30">
              <GemSpendChart data={data.gem_economy.most_used_actions} valueKey="count" title="Most Used Actions (by count)" />
            </div>
            <div className="p-4 rounded-xl border border-border/40 bg-card/30">
              <GemSpendChart data={data.gem_economy.highest_cost_actions} valueKey="gems" title="Highest Cost Actions (by gems)" />
            </div>
          </div>
        </Section>

        {/* ── Revenue ─────────────────────────────────────────────────────── */}
        <Section title="Revenue Overview" icon={DollarSign}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <AnalyticsStatCard label="Est. MRR"           value={`$${data.revenue.mrr}`}              color="text-green-400" highlight />
            <AnalyticsStatCard label="Paid Subscribers"   value={data.revenue.paid_subscribers}       color="text-primary" />
            <AnalyticsStatCard label="Conversion Rate"    value={`${data.revenue.conversion_rate}%`}  color="text-amber-400" sub="of non-admin users" />
            <AnalyticsStatCard label="Cancelled"          value={data.revenue.cancelled_count}        color="text-muted-foreground" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
            <div className="p-4 rounded-xl border border-border/40 bg-card/30 sm:col-span-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Revenue by Plan</p>
              <RevenueBreakdown revenueByPlan={data.revenue.revenue_by_plan} />
            </div>
            <div className="p-4 rounded-xl border border-border/40 bg-card/30 sm:col-span-2 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Plan Breakdown</p>
              {Object.entries(data.revenue.revenue_by_plan || {}).map(([plan, rev]) => {
                const labels = { starter: 'Starter', premium: 'Creator Pro', elite: 'Studio Elite' };
                const colors = { starter: 'bg-blue-500', premium: 'bg-purple-500', elite: 'bg-amber-500' };
                const max = Math.max(...Object.values(data.revenue.revenue_by_plan || {}), 1);
                return (
                  <div key={plan}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground">{labels[plan] || plan}</span>
                      <span className="font-semibold text-foreground">${rev.toFixed(2)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors[plan] || 'bg-primary'}`}
                        style={{ width: `${(rev / max) * 100}%`, opacity: 0.8 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        {/* ── API Cost Estimator ───────────────────────────────────────────── */}
        <Section title="API Cost Estimator" icon={Cpu}>
          {apiCosts && (
            <ApiCostAssumptions costs={apiCosts} onCostsChange={c => { setApiCosts(c); }} />
          )}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-2">
            {Object.entries(data.gem_economy.action_type_counts || {}).map(([cat, count]) => {
              const costKey = `${cat}_per_call`;
              const unitCost = apiCosts?.[costKey] || 0;
              const total = +(count * unitCost).toFixed(3);
              const CAT_ICONS = { text: '📝', image: '🖼️', video: '🎬', audio: '🎵', export: '📤' };
              return (
                <div key={cat} className="p-3 rounded-xl border border-border/40 bg-card/40 text-center">
                  <p className="text-lg mb-0.5">{CAT_ICONS[cat] || '⚡'}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{cat}</p>
                  <p className="text-lg font-bold text-foreground mt-1">{count}</p>
                  <p className="text-[10px] text-muted-foreground">calls</p>
                  <p className="text-xs font-semibold text-rose-400 mt-1">${total}</p>
                  <p className="text-[10px] text-muted-foreground">est. cost</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── Profit Signals ───────────────────────────────────────────────── */}
        <Section title="Profit Signals" icon={TrendingUp}>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <AnalyticsStatCard
              label="Gross Revenue"
              value={`$${ps.gross_revenue ?? data.profit_signals.gross_revenue}`}
              color="text-green-400"
              icon={DollarSign}
            />
            <AnalyticsStatCard
              label="API Spend"
              value={`$${ps.spend ?? ps.api_spend ?? data.profit_signals.api_spend}`}
              color="text-rose-400"
              icon={Cpu}
            />
            <AnalyticsStatCard
              label="Infra Cost"
              value={`$${data.profit_signals.infra_cost}`}
              color="text-amber-400"
              icon={Zap}
            />
            <AnalyticsStatCard
              label="Net Profit / Loss"
              value={`$${ps.profit ?? data.profit_signals.net_profit}`}
              color={(ps.profit ?? data.profit_signals.net_profit) >= 0 ? 'text-green-400' : 'text-red-400'}
              icon={TrendingUp}
              highlight
            />
            <AnalyticsStatCard
              label="Margin"
              value={`${ps.margin ?? data.profit_signals.margin_pct}%`}
              color={(ps.margin ?? data.profit_signals.margin_pct) >= 40 ? 'text-green-400' : (ps.margin ?? data.profit_signals.margin_pct) >= 10 ? 'text-amber-400' : 'text-red-400'}
              sub="estimated"
            />
          </div>
          <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-400/80 mt-1">
            ⚠ These are estimated values based on API cost assumptions above. Adjust the cost assumptions to see updated profit projections in real time.
          </div>
        </Section>

        {/* ── Plan Health ─────────────────────────────────────────────────── */}
        <Section title="Plan Health" icon={Shield}>
          <PlanHealthTable plans={data.plan_health} />
        </Section>

        {/* ── Action Breakdown ─────────────────────────────────────────────── */}
        <Section title="Action Cost Breakdown (Revenue vs API Cost)" icon={BarChart3}>
          <ActionBreakdownTable actions={data.action_breakdown} />
          <p className="text-[10px] text-muted-foreground text-right">
            Gem value assumed: ${data.gem_value_usd} / gem · Revenue and margin are estimates
          </p>
        </Section>

      </>}
    </div>
  );
}