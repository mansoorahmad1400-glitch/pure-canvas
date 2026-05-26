import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the current authenticated user along with their User row
 * (gems, plan, role flags). Backed by Supabase.
 */
export function useCurrentUser() {
  const queryClient = useQueryClient();
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthUser(s?.user ?? null);
      setAuthReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      setAuthUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['current-user', authUser?.id],
    enabled: authReady && !!authUser,
    queryFn: async () => {
      if (!authUser) return null;

      const [{ data: row }, { data: roles }] = await Promise.all([
        supabase.from('User').select('*').eq('created_by_id', authUser.id).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', authUser.id),
      ]);

      const roleSet = new Set((roles ?? []).map((r) => r.role));
      return {
        id: authUser.id,
        email: authUser.email,
        full_name: row?.full_name ?? authUser.user_metadata?.full_name ?? authUser.email,
        gems_balance: row?.gems_balance ?? 0,
        subscription_plan: row?.subscription_plan ?? null,
        roles: Array.from(roleSet),
        ...row,
      };
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const user = data ?? null;
  const isAdmin = !!user?.roles?.includes('admin');
  const plan = user?.subscription_plan;
  const isStarter = plan === 'starter';
  const isPremium = plan === 'premium';
  const isElite = plan === 'elite';
  const isPaid = isStarter || isPremium || isElite;

  const gems = user?.gems_balance ?? 0;
  const canGenerate = isAdmin || gems > 0;
  const isLowGems = !isAdmin && (isPaid ? gems <= 5 : gems <= 1);

  return {
    user,
    isLoading: !authReady || isLoading,
    isFetching,
    isAdmin,
    isStarter,
    isPremium,
    isElite,
    isPaid,
    gems,
    canGenerate,
    isLowGems,
    GEM_COSTS: { standard: 1 },
    refetch: () => queryClient.invalidateQueries({ queryKey: ['current-user'] }),
  };
}
