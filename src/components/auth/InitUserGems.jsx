import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// Gem init rules:
// Free:    2 lifetime gems, never refilled.
// Starter: 200 gems/month, resets monthly.
// Premium: 500 gems/month, resets monthly.
// Elite:   1100 gems/month, resets monthly.
// Admin:   unlimited (9999).

const GEM_LIMITS = {
  starter: 200,
  premium: 500,
  elite:   1100,
  admin:   9999,
  free:    2,
};

export default function InitUserGems() {
  const { user, refetch } = useCurrentUser();

  useEffect(() => {
    if (!user) return;

    const role = user.role || 'free';
    const isAdmin = role === 'admin';
    const isPaid = ['starter', 'premium', 'elite'].includes(role);
    const limit = GEM_LIMITS[role] ?? 2;

    const updates = {};

    // Assign default role if missing
    if (!user.role) {
      updates.role = 'free';
    }

    const neverInitialized = user.gems_balance === undefined || user.gems_balance === null;

    if (neverInitialized) {
      updates.gems_balance = limit;
      updates.gems_limit_monthly = limit;
      updates.gems_used_this_month = 0;
      if (isPaid) {
        const next = new Date();
        next.setMonth(next.getMonth() + 1);
        updates.gems_reset_date = next.toISOString();
      }
    }

    // Role changed to a paid plan — re-init gems if limit doesn't match
    if (!neverInitialized && isPaid && user.gems_limit_monthly !== limit) {
      updates.gems_balance = limit;
      updates.gems_limit_monthly = limit;
      updates.gems_used_this_month = 0;
      const next = new Date();
      next.setMonth(next.getMonth() + 1);
      updates.gems_reset_date = next.toISOString();
    }

    // Monthly reset for paid plans
    if (isPaid && user.gems_reset_date && new Date() > new Date(user.gems_reset_date)) {
      updates.gems_balance = limit;
      updates.gems_used_this_month = 0;
      const next = new Date();
      next.setMonth(next.getMonth() + 1);
      updates.gems_reset_date = next.toISOString();
    }

    if (Object.keys(updates).length > 0) {
      base44.auth.updateMe(updates).then(refetch);
    }
  }, [user?.id, user?.role, user?.gems_reset_date]);

  return null;
}