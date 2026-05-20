import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

const PRICE_MAP = {
  starter: 'price_1TWNsLPqHNcdlhYOMqBSlGyB', // $9.99/month — 200 gems
  premium: 'price_1TWNsLPqHNcdlhYO4ScjKBIJ', // $19.99/month — 500 gems (Creator Pro)
  elite:   'price_1TWNsLPqHNcdlhYOUhYwDo4X', // $39.99/month — 1100 gems (Studio Elite)
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch (authErr) {
      console.warn('[createCheckoutSession] auth.me() failed:', authErr.message);
    }

    if (!user) {
      console.error('[createCheckoutSession] No authenticated user found');
      return Response.json({ error: 'You must be logged in to upgrade. Please sign in and try again.' }, { status: 401 });
    }

    console.log('[createCheckoutSession] user:', user.email);

    const { plan, success_url, cancel_url } = await req.json();
    const priceId = PRICE_MAP[plan];
    if (!priceId) {
      console.error('[createCheckoutSession] invalid plan:', plan);
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const origin = success_url ? new URL(success_url).origin : 'https://studioone.ai';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success_url || `${origin}/upgrade?success=1`,
      cancel_url: cancel_url || `${origin}/upgrade?cancelled=1`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_email: user.email,
        plan,
      },
    });

    console.log('[createCheckoutSession] session created:', session.id, 'for', user.email, 'plan:', plan);
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('[createCheckoutSession] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});