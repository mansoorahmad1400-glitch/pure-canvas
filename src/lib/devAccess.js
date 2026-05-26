// Dev/admin access helpers for StudioOne migration build.
// During the Lovable rebuild, paid plan/gem gates are bypassed for testing.
// Replace with real plan logic once billing is wired up.

import { supabase } from '@/integrations/supabase/client';

// Toggle to enable dev mode (bypasses paywalls/gem checks)
export const DEV_MODE = true;

export function isDevMode() {
  return DEV_MODE;
}

let _isAdminCache = null;
export async function isAdminUser() {
  if (_isAdminCache !== null) return _isAdminCache;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { _isAdminCache = false; return false; }
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();
  _isAdminCache = !!data;
  return _isAdminCache;
}

export async function canCreateProject() {
  if (DEV_MODE) return true;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return true;
  return await isAdminUser();
}

export async function canAccessPhase(/* phaseId */) {
  if (DEV_MODE) return true;
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}
