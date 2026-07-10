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

function getOrigin(request) {
  const configuredOrigin = process.env.VITE_AUTH_REDIRECT_ORIGIN || process.env.APP_ORIGIN;
  const origin = request.headers.origin || configuredOrigin;
  return String(origin || '').replace(/\/$/, '');
}

function getSafeReturnPath(value) {
  const text = cleanText(value);

  if (!text.startsWith('/claims/')) {
    return '/support';
  }

  return text;
}

async function getAuthedUser(request, supabaseUrl, publishableKey) {
  const token = getBearerToken(request);

  if (!token) {
    return { user: null, error: 'Sign in before adding a payment method.' };
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
  const origin = getOrigin(request);

  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !stripeSecretKey) {
    json(response, 500, { error: 'Payment setup is not configured yet.' });
    return;
  }

  const { user, error: authError } = await getAuthedUser(request, supabaseUrl, publishableKey);

  if (!user) {
    json(response, 401, { error: authError || 'Sign in before adding a payment method.' });
    return;
  }

  const returnPath = getSafeReturnPath(request.body?.returnPath);
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data: existingMethod } = await supabaseAdmin
    .from('user_payment_methods')
    .select('provider_customer_id')
    .eq('user_id', user.id)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const stripe = stripeFactory(stripeSecretKey);
  const customerId = existingMethod?.provider_customer_id || (
    await stripe.customers.create({
      email: user.email || undefined,
      metadata: {
        userId: user.id,
      },
    })
  ).id;
  const separator = returnPath.includes('?') ? '&' : '?';
  const session = await stripe.checkout.sessions.create({
    mode: 'setup',
    customer: customerId,
    payment_method_types: ['card'],
    client_reference_id: user.id,
    metadata: {
      userId: user.id,
      returnPath,
    },
    success_url: `${origin}${returnPath}${separator}payment_setup=success&setup_session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${returnPath}${separator}payment_setup=cancel`,
  });

  json(response, 200, { url: session.url });
};
