const { createClient } = require('@supabase/supabase-js');
const stripeFactory = require('stripe');

function json(response, status, body) {
  response.status(status).json(body);
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function getBearerToken(request) {
  const header = request.headers.authorization || request.headers.Authorization || '';
  return String(header).startsWith('Bearer ') ? String(header).slice(7) : '';
}

async function getAuthedUser(request, supabaseUrl, publishableKey) {
  const token = getBearerToken(request);

  if (!token) {
    return { user: null, error: 'Sign in before verifying a payment method.' };
  }

  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error } = await supabase.auth.getUser(token);

  return { user: data.user ?? null, error: error?.message };
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    json(response, 405, { error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_JWT || process.env.SUPABASE_SECRET_KEY;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !stripeSecretKey) {
    json(response, 500, { error: 'Payment setup is not configured yet.' });
    return;
  }

  const { user, error: authError } = await getAuthedUser(request, supabaseUrl, publishableKey);

  if (!user) {
    json(response, 401, { error: authError || 'Sign in before verifying a payment method.' });
    return;
  }

  const sessionId = cleanText(request.body?.sessionId);

  if (!sessionId) {
    json(response, 400, { error: 'sessionId is required.' });
    return;
  }

  const stripe = stripeFactory(stripeSecretKey);
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['setup_intent.payment_method'],
  });

  if (session.mode !== 'setup' || session.client_reference_id !== user.id || session.metadata?.userId !== user.id) {
    json(response, 403, { error: 'This payment setup session does not belong to the signed-in user.' });
    return;
  }

  if (session.status !== 'complete') {
    json(response, 402, { error: 'Payment method setup was not completed. Add or update payment info and retry.' });
    return;
  }

  const setupIntent = session.setup_intent;
  const paymentMethod = setupIntent?.payment_method;

  if (!paymentMethod || typeof paymentMethod === 'string' || !paymentMethod.card) {
    json(response, 400, { error: 'No card payment method was returned by Stripe.' });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  await supabaseAdmin
    .from('user_payment_methods')
    .update({ is_default: false })
    .eq('user_id', user.id)
    .eq('status', 'active');

  const { data: savedMethod, error: saveError } = await supabaseAdmin
    .from('user_payment_methods')
    .upsert({
      brand: paymentMethod.card.brand,
      exp_month: paymentMethod.card.exp_month,
      exp_year: paymentMethod.card.exp_year,
      failure_message: null,
      is_default: true,
      last4: paymentMethod.card.last4,
      provider: 'stripe',
      provider_customer_id: cleanText(session.customer),
      provider_payment_method_id: paymentMethod.id,
      status: 'active',
      user_id: user.id,
    }, { onConflict: 'provider,provider_payment_method_id' })
    .select('id, brand, last4, exp_month, exp_year, status, is_default')
    .single();

  if (saveError) {
    json(response, 400, { error: saveError.message });
    return;
  }

  json(response, 200, { ok: true, paymentMethod: savedMethod });
};
