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
    return { user: null, error: 'Sign in before changing payment info.' };
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

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    json(response, 500, { error: 'Server Supabase configuration is incomplete.' });
    return;
  }

  const { user, error: authError } = await getAuthedUser(request, supabaseUrl, publishableKey);

  if (!user) {
    json(response, 401, { error: authError || 'Sign in before changing payment info.' });
    return;
  }

  const paymentMethodId = cleanText(request.body?.paymentMethodId);

  if (!paymentMethodId) {
    json(response, 400, { error: 'paymentMethodId is required.' });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data: method, error: methodError } = await supabaseAdmin
    .from('user_payment_methods')
    .select('id, provider_payment_method_id, is_default')
    .eq('id', paymentMethodId)
    .eq('user_id', user.id)
    .neq('status', 'deleted')
    .single();

  if (methodError || !method) {
    json(response, 404, { error: methodError?.message || 'Payment method not found.' });
    return;
  }

  if (stripeSecretKey && method.provider_payment_method_id) {
    const stripe = stripeFactory(stripeSecretKey);
    await stripe.paymentMethods.detach(method.provider_payment_method_id).catch((error) => {
      console.warn('Stripe payment method detach failed', {
        error: error?.message,
        paymentMethodId: method.provider_payment_method_id,
        userId: user.id,
      });
    });
  }

  const { error: updateError } = await supabaseAdmin
    .from('user_payment_methods')
    .update({ is_default: false, status: 'deleted' })
    .eq('id', method.id)
    .eq('user_id', user.id);

  if (updateError) {
    json(response, 400, { error: updateError.message });
    return;
  }

  if (method.is_default) {
    const { data: nextMethod } = await supabaseAdmin
      .from('user_payment_methods')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (nextMethod) {
      await supabaseAdmin
        .from('user_payment_methods')
        .update({ is_default: true })
        .eq('id', nextMethod.id);
    }
  }

  json(response, 200, { ok: true });
};
