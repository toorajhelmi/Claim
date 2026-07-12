const { createClient } = require('@supabase/supabase-js');

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
    return { user: null, error: 'Sign in as an admin first.' };
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

function nullableUrl(value) {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_JWT || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    response.status(500).json({ error: 'Supabase environment is not configured' });
    return;
  }

  const { user, error: authError } = await getAuthedUser(request, supabaseUrl, publishableKey);

  if (!user) {
    response.status(401).json({ error: authError || 'Sign in as an admin first.' });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data: adminProfile, error: adminError } = await supabaseAdmin
    .from('profiles')
    .select('platform_role')
    .eq('id', user.id)
    .single();

  if (adminError || adminProfile?.platform_role !== 'admin') {
    response.status(403).json({ error: 'Admin access is required.' });
    return;
  }

  const paymentId = cleanText(request.body?.paymentId);
  const status = cleanText(request.body?.status);
  const invoiceUrl = nullableUrl(request.body?.invoiceUrl);
  const receiptUrl = nullableUrl(request.body?.receiptUrl);
  const paymentUrl = nullableUrl(request.body?.paymentUrl);
  const adminNotes = cleanText(request.body?.adminNotes);

  if (!paymentId || !['pending', 'completed', 'cancelled'].includes(status)) {
    response.status(400).json({ error: 'paymentId and status are required.' });
    return;
  }

  if (status === 'completed' && !receiptUrl && !invoiceUrl) {
    response.status(400).json({ error: 'Attach a receipt or invoice link before marking a charity payment complete.' });
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from('claim_charity_payments')
    .update({
      admin_notes: adminNotes || null,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      invoice_url: invoiceUrl,
      payment_url: paymentUrl,
      receipt_url: receiptUrl,
      status,
    })
    .eq('id', paymentId);

  if (updateError) {
    response.status(400).json({ error: updateError.message });
    return;
  }

  response.status(200).json({ ok: true });
};
