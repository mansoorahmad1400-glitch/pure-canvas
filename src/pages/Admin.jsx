import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Crown, Gem, RefreshCw, RotateCcw, Users, Sparkles, Search, Map, BarChart3, BookOpen, CreditCard, Cpu, Shield, Globe } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import EconomyManager from '@/components/admin/EconomyManager';
import GemLedgerAdmin from '@/components/admin/GemLedgerAdmin';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import AdminBillingPanel from '@/components/admin/AdminBillingPanel';
import ModelRoutingPanel from '@/components/admin/ModelRoutingPanel';
import QualityControlPanel from '@/components/admin/QualityControlPanel';
import WorldConsistencyPanel from '@/components/admin/WorldConsistencyPanel';

function roleBadge(role) {
  if (role === 'admin') return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Admin</Badge>;
  if (role === 'elite') return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Studio Elite</Badge>;
  if (role === 'premium') return <Badge className="bg-primary/20 text-primary border-primary/30">Creator Pro</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Free</Badge>;
}

export default function Admin() {
  const { user, isAdmin } = useCurrentUser();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [resetting, setResetting] = useState(null);
  const [runningReset, setRunningReset] = useState(false);
  const [activeSection, setActiveSection] = useState('users');
  // eslint-disable-next-line no-unused-vars

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await base44.functions.invoke('adminListUsers', {});
      return res.data?.users || [];
    },
    enabled: !!isAdmin,
  });

  if (!isAdmin && user) return <Navigate to="/" replace />;
  if (!user) return null;

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleReset = async (email) => {
    setResetting(email);
    try {
      await base44.functions.invoke('adminResetUser', { email });
      toast.success(`Reset ${email} to Free Starter`);
      refetch();
    } catch (e) {
      toast.error(e.message || 'Reset failed');
    }
    setResetting(null);
  };

  const handleMonthlyReset = async () => {
    setRunningReset(true);
    try {
      const res = await base44.functions.invoke('monthlyGemReset', {});
      toast.success(`Monthly reset complete — ${res.data?.reset_count || 0} users updated`);
    } catch (e) {
      toast.error(e.message || 'Reset failed');
    }
    setRunningReset(false);
  };

  const stats = {
    total: users.length,
    free: users.filter(u => !u.role || u.role === 'user' || u.role === 'free').length,
    premium: users.filter(u => u.role === 'premium').length,
    elite: users.filter(u => u.role === 'elite').length,
    admin: users.filter(u => u.role === 'admin').length,
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-playfair mb-1">Admin Panel</h1>
          <p className="text-muted-foreground text-sm">Manage users, economy, and subscriptions</p>
        </div>
        <Link to="/roadmap">
          <Button variant="outline" size="sm" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
            <Map className="w-4 h-4" /> Product Roadmap
          </Button>
        </Link>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border/40 pb-4">
        <button
          onClick={() => setActiveSection('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
            activeSection === 'users'
              ? 'bg-primary/15 border-primary/30 text-primary'
              : 'bg-card/40 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60'
          }`}
        >
          <Users className="w-4 h-4" /> User Management
        </button>
        <button
          onClick={() => setActiveSection('economy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
            activeSection === 'economy'
              ? 'bg-primary/15 border-primary/30 text-primary'
              : 'bg-card/40 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Economy Manager
        </button>
        <button
          onClick={() => setActiveSection('ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
            activeSection === 'ledger'
              ? 'bg-primary/15 border-primary/30 text-primary'
              : 'bg-card/40 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Usage & Gem Ledger
        </button>
        <button
          onClick={() => setActiveSection('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
            activeSection === 'analytics'
              ? 'bg-primary/15 border-primary/30 text-primary'
              : 'bg-card/40 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Analytics & Profit
        </button>
        <button
          onClick={() => setActiveSection('billing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
            activeSection === 'billing'
              ? 'bg-primary/15 border-primary/30 text-primary'
              : 'bg-card/40 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Billing & Subscriptions
        </button>
        <button
          onClick={() => setActiveSection('model_routing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
            activeSection === 'model_routing'
              ? 'bg-primary/15 border-primary/30 text-primary'
              : 'bg-card/40 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60'
          }`}
        >
          <Cpu className="w-4 h-4" /> Model Routing
        </button>
        <button
          onClick={() => setActiveSection('quality_control')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
            activeSection === 'quality_control'
              ? 'bg-primary/15 border-primary/30 text-primary'
              : 'bg-card/40 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60'
          }`}
        >
          <Shield className="w-4 h-4" /> Quality Control
        </button>
        <button
          onClick={() => setActiveSection('world_consistency')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
            activeSection === 'world_consistency'
              ? 'bg-sky-500/15 border-sky-500/30 text-sky-400'
              : 'bg-card/40 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60'
          }`}
        >
          <Globe className="w-4 h-4" /> World Consistency
        </button>
      </div>

      {/* Economy Manager Section */}
      {activeSection === 'economy' && <EconomyManager />}

      {/* Gem Ledger Section */}
      {activeSection === 'ledger' && <GemLedgerAdmin />}

      {/* Analytics Section */}
      {activeSection === 'analytics' && <AnalyticsDashboard />}

      {/* Billing Section */}
      {activeSection === 'billing' && <AdminBillingPanel />}

      {/* Model Routing Section */}
      {activeSection === 'model_routing' && <ModelRoutingPanel />}

      {/* Quality Control Section */}
      {activeSection === 'quality_control' && <QualityControlPanel />}

      {/* World Consistency Section */}
      {activeSection === 'world_consistency' && <WorldConsistencyPanel />}

      {/* User Management Section */}
      {activeSection === 'users' && <>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, color: 'text-foreground' },
          { label: 'Free', value: stats.free, icon: Gem, color: 'text-muted-foreground' },
          { label: 'Creator Pro', value: stats.premium, icon: Crown, color: 'text-primary' },
          { label: 'Studio Elite', value: stats.elite, icon: Sparkles, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl border border-border/50 bg-card/50">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMonthlyReset}
          disabled={runningReset}
          className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
        >
          {runningReset
            ? <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            : <RotateCcw className="w-4 h-4" />}
          Run Monthly Gem Reset
        </Button>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-secondary/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>User</span>
          <span>Plan</span>
          <span>Gems</span>
          <span>Action</span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">No users found</div>
        ) : (
          filtered.map((u, i) => (
            <div
              key={u.id}
              className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 items-center text-sm ${i % 2 === 0 ? 'bg-card/30' : 'bg-card/10'}`}
            >
              <div>
                <p className="font-medium text-foreground">{u.full_name || '—'}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <div>{roleBadge(u.role)}</div>
              <div className="text-right">
                <p className="font-semibold">{u.gems_balance ?? '—'}</p>
                <p className="text-xs text-muted-foreground">/ {u.gems_limit_monthly ?? '—'}</p>
              </div>
              <div>
                {u.role !== 'admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={resetting === u.email}
                    onClick={() => handleReset(u.email)}
                    className="h-7 text-xs border-border/50 text-muted-foreground hover:text-destructive hover:border-destructive/50"
                  >
                    {resetting === u.email
                      ? <span className="w-3 h-3 border-2 border-muted/30 border-t-muted rounded-full animate-spin" />
                      : 'Reset'}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      </>}
    </div>
  );
}