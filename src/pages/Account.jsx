import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useDarkMode } from '@/hooks/useDarkMode';
import BillingPanel from '@/components/account/BillingPanel';
import {
  User, Mail, Crown, Gem, ShieldCheck, LogOut,
  CheckCircle2, Settings, Trash2, AlertTriangle, Sun, Moon, History, CreditCard
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function Row({ icon: Icon, label, value, valueClass = '' }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Icon className="w-4 h-4 shrink-0" />
        <span>{label}</span>
      </div>
      <span className={`text-sm font-semibold text-right ${valueClass}`}>{value}</span>
    </div>
  );
}

function AccountInner() {
  const { user, isStarter, isPremium, isElite, isAdmin, gems, refetch } = useCurrentUser();
  const queryClient = useQueryClient();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('account');

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await base44.auth.updateMe({ deleted: true, email: `deleted_${Date.now()}_${user.email}` });
      queryClient.clear();
      base44.auth.logout();
    } catch {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      setRefreshing(true);
      Promise.resolve(refetch()).finally(() => setRefreshing(false));
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [refetch]);

  const roleLabel = isAdmin ? 'Admin' : isElite ? 'Studio Elite' : isPremium ? 'Creator Pro' : isStarter ? 'Starter' : 'Free';
  const roleColor = isAdmin
    ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
    : isElite
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : isPremium
    ? 'bg-primary/15 text-primary border-primary/30'
    : isStarter
    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    : 'bg-secondary text-muted-foreground border-border/50';

  const gemLimit = isElite ? 1100 : isPremium ? 500 : isStarter ? 200 : 2;
  const gemSuffix = isAdmin ? 'System access enabled' : `${gems}/${gemLimit} gems ${isStarter || isPremium || isElite ? 'this month' : 'remaining'}`;

  const statusLabel = isAdmin
    ? 'Active — Admin Access'
    : isElite
    ? `Active — Studio Elite (${gems}/1100 gems this month)`
    : isPremium
    ? `Active — Creator Pro (${gems}/500 gems this month)`
    : isStarter
    ? `Active — Starter (${gems}/200 gems this month)`
    : `Active — Free (${gems}/2 gems remaining)`;
  const statusColor = isAdmin ? 'text-purple-400' : isElite ? 'text-amber-400' : isPremium ? 'text-green-400' : isStarter ? 'text-blue-400' : 'text-muted-foreground';

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-playfair text-2xl font-bold">Account</h1>
              <p className="text-sm text-muted-foreground">Manage your StudioOne AI account</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border/40 pb-3">
            {[
              { key: 'account',  label: 'Account',              icon: User },
              { key: 'billing',  label: 'Billing & Subscription', icon: CreditCard },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  activeTab === t.key
                    ? 'bg-primary/15 border-primary/30 text-primary'
                    : 'bg-card/40 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>

          {/* ── Billing Tab ─────────────────────────────────────────────────── */}
          {activeTab === 'billing' && !isAdmin && <BillingPanel />}
          {activeTab === 'billing' && isAdmin && (
            <div className="p-5 rounded-2xl border border-purple-500/20 bg-purple-500/5 text-sm text-purple-400 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              Admin accounts have full system access — billing does not apply.
            </div>
          )}

          {/* ── Account Tab ─────────────────────────────────────────────────── */}
          {activeTab === 'account' && <>

          {/* Avatar + name */}
          <div className="flex items-center gap-4 p-5 rounded-2xl border border-border/50 bg-card/50 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary font-playfair shrink-0">
              {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{user?.full_name || 'User'}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              <Badge className={`mt-1.5 border text-xs ${roleColor}`}>
                <Crown className="w-3 h-3 mr-1" /> {roleLabel}
              </Badge>
            </div>
          </div>

          {/* Details card */}
          <div className="p-5 rounded-2xl border border-border/50 bg-card/50 mb-6">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Account Details</h2>
            <Row icon={User}       label="Full Name"      value={user?.full_name || '—'} />
            <Row icon={Mail}       label="Email"          value={user?.email || '—'} />
            <Row icon={Crown}      label="Role"           value={roleLabel} valueClass={isPremium || isAdmin ? 'text-primary' : ''} />
            <Row
             icon={Gem}
             label="Gems Balance"
             value={gemSuffix}
             valueClass={isAdmin ? 'text-purple-400' : isElite ? 'text-amber-400' : isPremium ? 'text-primary' : 'text-foreground'}
            />
            <Row
              icon={ShieldCheck}
              label="Account Status"
              value={statusLabel}
              valueClass={statusColor}
            />
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {!isStarter && !isPremium && !isElite && !isAdmin && (
              <Link to="/upgrade" className="block">
                <Button className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm rounded-xl">
                  <Crown className="w-4 h-4 mr-2" /> Upgrade Plan
                </Button>
              </Link>
            )}
            {(isStarter || isPremium) && !isElite && !isAdmin && (
              <Link to="/upgrade" className="block">
                <Button className="w-full h-11 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 font-semibold text-sm rounded-xl">
                  <Crown className="w-4 h-4 mr-2" /> Upgrade to Studio Elite — $39.99/mo
                </Button>
              </Link>
            )}
            {isElite && !isAdmin && (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm text-amber-400">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Studio Elite plan — {gems}/1100 gems available this month.</span>
              </div>
            )}
            {isPremium && !isElite && !isAdmin && (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 text-sm text-primary">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Creator Pro plan — {gems}/500 gems available this month.</span>
              </div>
            )}
            {isStarter && !isElite && !isAdmin && (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-sm text-blue-400">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Starter plan — {gems}/200 gems available this month.</span>
              </div>
            )}
            {isAdmin && (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 text-sm text-purple-400">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Admin account — system-level access enabled.</span>
              </div>
            )}
            {/* Gem History */}
            <Link to="/gem-history" className="block">
              <Button variant="outline" className="w-full h-11 border-border/50 text-muted-foreground hover:text-foreground text-sm rounded-xl">
                <History className="w-4 h-4 mr-2" /> Gem History
              </Button>
            </Link>

            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="w-full h-11 flex items-center justify-between px-4 rounded-xl border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </span>
              <div className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${isDark ? 'bg-primary' : 'bg-border'}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </button>

            <Button
              variant="outline"
              className="w-full h-11 border-border/50 text-muted-foreground hover:text-foreground text-sm rounded-xl select-none"
              onClick={() => { queryClient.clear(); base44.auth.logout(); }}
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-11 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-sm rounded-xl select-none"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border/50">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    Delete Account
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This will permanently delete your account and all associated data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-border/50">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    {deleting ? 'Deleting...' : 'Delete Account'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          </>}
          {/* end account tab */}

        </motion.div>
      </div>
    </div>
  );
}

export default function Account() {
  return <AccountInner />;
}