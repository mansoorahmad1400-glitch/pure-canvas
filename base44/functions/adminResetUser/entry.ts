import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email } = await req.json();
    if (!email) return Response.json({ error: 'email required' }, { status: 400 });

    const allUsers = await base44.asServiceRole.entities.User.list();
    const target = allUsers.find(u => u.email === email);
    if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

    await base44.asServiceRole.entities.User.update(target.id, {
      role: 'user',
      gems_balance: 2,
      gems_limit_monthly: 2,
      gems_used_this_month: 0,
      subscription_plan: null,
      subscription_status: null,
      stripe_customer_id: null,
      subscription_reset_date: null,
    });

    return Response.json({ success: true, message: `Reset ${email} to Free Starter` });
  } catch (error) {
    console.error('[adminResetUser] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});