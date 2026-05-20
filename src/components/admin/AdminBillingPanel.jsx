import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RefreshCw, Crown, AlertTriangle, Clock, CheckCircle2, Users, UserCheck } from 'lucide-react';

const PLAN_LABELS = { starter: 'Starter', premium: 'Creator Pro', elite: 'Studio Elite', free: 'Free' };
const ROLE_COLORS = {
  starter: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  premium: 'bg-primary/15 text-primary border-primary/30',
  elite:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

const PLANS = ['free', 'starter', 'premium', 'elite'];

export default function AdminBillingPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantPlan, setGrantPlan] = useState('starter');
  const [granting, setGranting] = useState(false);
  const [tab, setTab] = useState('subscribers');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('manageSubscription', { action: 'admin_list' });
      setData(res.data);
    } catch (e) {
      toast.error('Failed to load billing data');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleGrant = async () => {
    if (!grantEmail) { toast.error('Enter a user email'); return; }
    setGranting(true);
    try {
      const res = await base44.functions.invoke('manageSubscription', {
        action: 'admin_grant_plan',
        target_email: grantEmail,
        plan: grantPlan,
      });
      if (res.data?.success) {
        toast.success(`Granted ${PLAN_LABELS[grantPlan]} to ${grantEmail}`);
        setGrantEmail('');
        load();
      } else {
        toast.error(res.data?.error || 'Grant failed');
      }
    } catch (e) {
      toast.error(e.message || 'Grant failed');
    }
    setGranting(false);
  };

  const TABS = [
    { key: 'subscribers', label: 'Active Subscribers', icon: UserCheck },
    { key: 'issues',      label: 'Payment Issues',     icon: AlertTriangle },
    { key: 'cancelling',  label: 'Cancelling',         icon: Clock },
    { key: 'grant',       label: 'Grant Plan',         icon: Crown },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users',    value: data?.total_users ?? '—',          icon: Users,         color: 'text-foreground' },
          { label: 'Subscribers',    value: data?.subscribers?.length ?? '—',  icon: UserCheck,     color: 'text-green-400' },
          { label: 'Payment Issues', value: data?.failed?.length ?? '—',       icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Cancelling',     value: data?.cancelling?.length ?? '—',   icon: Clock,         color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl border border-border/40 bg-card/40">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{s.label}</p>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              tab === t.key
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'bg-card/40 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60'
            }`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-7 gap-1.5 text-xs ml-auto">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* ── Subscribers table ────────────────────────────────────────────── */}
      {!loading && tab === 'subscribers' && (
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="grid grid-cols-[1fr_90px_80px_100px_100px] gap-2 px-4 py-2 bg-secondary/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            <span>User</span><span>Plan</span><span>Gems</span><span>Status</span><span>Renews</span>
          </div>
          {(data?.subscribers || []).length === 0
            ? <p className="text-center text-muted-foreground text-sm py-10">No paid subscribers.</p>
            : (data?.subscribers || []).map((u, i) => (
              <div key={u.id} className={`grid grid-cols-[1fr_90px_80px_100px_100px] gap-2 px-4 py-2.5 items-center text-xs ${i % 2 === 0 ? 'bg-card/20' : 'bg-card/5'}`}>
                <div>
                  <p className="font-medium truncate">{u.full_name || u.email}</p>
                  <p className="text-muted-foreground text-[10px] truncate">{u.email}</p>
                </div>
                <div>
                  <Badge className={`text-[10px] border ${ROLE_COLORS[u.role] || 'bg-secondary text-muted-foreground border-border/50'}`}>
                    {PLAN_LABELS[u.subscription_plan || u.role] || u.role}
                  </Badge>
                </div>
                <div className="font-mono text-foreground">{u.gems_balance ?? '—'}💎</div>
                <div>
                  <span className={`text-[10px] font-medium ${u.subscription_status === 'active' ? 'text-green-400' : u.subscription_status === 'cancelling' ? 'text-amber-400' : 'text-muted-foreground'}`}>
                    {u.subscription_status || '—'}
                  </span>
                </div>
                <div className="text-muted-foreground text-[10px]">
                  {u.subscription_reset_date ? new Date(u.subscription_reset_date).toLocaleDateString() : '—'}
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* ── Payment Issues ───────────────────────────────────────────────── */}
      {!loading && tab === 'issues' && (
        <div className="rounded-xl border border-red-500/20 overflow-hidden">
          <div className="px-4 py-2 bg-red-500/8 text-[10px] font-semibold text-red-400 uppercase tracking-wider">
            Users with Payment Issues
          </div>
          {(data?.failed || []).length === 0
            ? <p className="text-center text-muted-foreground text-sm py-10">No payment issues. 🎉</p>
            : (data?.failed || []).map((u, i) => (
              <div key={u.id} className={`flex items-center gap-3 px-4 py-3 text-xs border-t border-border/30 ${i % 2 === 0 ? 'bg-card/20' : 'bg-card/5'}`}>
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{u.email}</p>
                  <p className="text-muted-foreground text-[10px]">Issue since: {u.billing_issue_since ? new Date(u.billing_issue_since).toLocaleDateString() : '—'}</p>
                </div>
                <Badge className={`text-[10px] border ${ROLE_COLORS[u.role] || 'bg-secondary text-muted-foreground border-border/50'}`}>
                  {PLAN_LABELS[u.subscription_plan || u.role] || u.role}
                </Badge>
              </div>
            ))
          }
        </div>
      )}

      {/* ── Cancelling ──────────────────────────────────────────────────── */}
      {!loading && tab === 'cancelling' && (
        <div className="rounded-xl border border-amber-500/20 overflow-hidden">
          <div className="px-4 py-2 bg-amber-500/8 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
            Subscriptions Scheduled to Cancel
          </div>
          {(data?.cancelling || []).length === 0
            ? <p className="text-center text-muted-foreground text-sm py-10">No pending cancellations.</p>
            : (data?.cancelling || []).map((u, i) => (
              <div key={u.id} className={`flex items-center gap-3 px-4 py-3 text-xs border-t border-border/30 ${i % 2 === 0 ? 'bg-card/20' : 'bg-card/5'}`}>
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{u.email}</p>
                  <p className="text-muted-foreground text-[10px]">Cancels: {u.subscription_cancel_at ? new Date(u.subscription_cancel_at).toLocaleDateString() : '—'}</p>
                </div>
                <Badge className={`text-[10px] border ${ROLE_COLORS[u.role] || 'bg-secondary text-muted-foreground border-border/50'}`}>
                  {PLAN_LABELS[u.subscription_plan || u.role] || u.role}
                </Badge>
              </div>
            ))
          }
        </div>
      )}

      {/* ── Grant Plan ───────────────────────────────────────────────────── */}
      {tab === 'grant' && (
        <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Manually Grant Plan</p>
          </div>
          <p className="text-xs text-muted-foreground">Override a user's subscription plan and reset their gem balance without Stripe payment.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">User Email</label>
              <Input value={grantEmail} onChange={e => setGrantEmail(e.target.value)} placeholder="user@example.com" className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Plan</label>
              <select
                value={grantPlan}
                onChange={e => setGrantPlan(e.target.value)}
                className="w-full h-8 text-xs bg-background border border-border/40 rounded-md px-2 text-foreground focus:outline-none"
              >
                {PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleGrant} disabled={granting || !grantEmail} className="h-8 text-xs gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {granting ? 'Granting...' : 'Grant Plan'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}