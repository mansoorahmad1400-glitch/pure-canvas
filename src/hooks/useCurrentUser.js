import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useCurrentUser() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, isFetching } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['current-user'] });

  const isStarter = user?.role === 'starter';
  const isPremium = user?.role === 'premium';
  const isElite = user?.role === 'elite';
  const isAdmin = user?.role === 'admin';
  const isPaid = isStarter || isPremium || isElite;

  const gems = user?.gems_balance ?? 0;

  // Admin has unlimited; paid/free can generate as long as gems > 0
  const canGenerate = isAdmin || gems > 0;

  // Warn when ≤ 5 gems left (paid plans) or ≤ 1 gem left (free)
  const isLowGems = !isAdmin && (isPaid ? gems <= 5 : gems <= 1);

  // All plans: 1 gem per successful blueprint generation
  const GEM_COSTS = { standard: 1 };

  return {
    user,
    isLoading,
    isFetching,
    isStarter,
    isPremium,
    isElite,
    isAdmin,
    isPaid,
    gems,
    canGenerate,
    isLowGems,
    GEM_COSTS,
    refetch,
  };
}