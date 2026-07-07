const { createClient } = require('@supabase/supabase-js');

function json(response, status, body) {
  response.status(status).json(body);
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

function cleanText(value) {
  return String(value ?? '').trim();
}

function escapeHtml(value) {
  return cleanText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseEmails(value) {
  return Array.from(
    new Set(
      String(value ?? '')
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
    ),
  );
}

async function getAuthedUser(request, supabaseUrl, publishableKey) {
  const token = getBearerToken(request);

  if (!token) {
    return { user: null, error: 'Sign in before inviting supporters.' };
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

function buildSupporterInviteHtml({ appName, claim, claimUrl }) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#05070d;color:#f8fbff;padding:32px">
      <div style="max-width:620px;margin:0 auto;background:#10141f;border:1px solid rgba(255,255,255,0.12);border-radius:24px;overflow:hidden">
        <div style="padding:24px 28px;background:linear-gradient(135deg,rgba(112,255,139,0.18),rgba(66,221,255,0.14))">
          <div style="display:inline-block;background:#111827;border-radius:999px;padding:8px 12px;font-weight:800">${escapeHtml(appName)}</div>
          <h1 style="margin:18px 0 0;font-size:30px;line-height:1.08">${escapeHtml(claim.creator_name)} invited you to back a live proof claim.</h1>
        </div>
        <div style="padding:28px">
          <h2 style="font-size:22px;line-height:1.2;margin:0 0 18px">${escapeHtml(claim.title)}</h2>
          <p style="color:#cbd2df;font-size:16px;line-height:1.6">
            This claim is open for backing on ${escapeHtml(appName)}. Supporters can pledge, share the claim,
            and watch the proof when it goes live.
          </p>
          <p style="color:#cbd2df;font-size:16px;line-height:1.6">
            Pledge goal: <strong>${escapeHtml(claim.pledgeGoal)}</strong>
          </p>
          <p style="margin:26px 0">
            <a href="${claimUrl}" style="display:inline-block;background:linear-gradient(135deg,#70ff8b,#42ddff);color:#041006;text-decoration:none;font-weight:900;border-radius:999px;padding:14px 22px">
              Open claim
            </a>
          </p>
          <p style="color:#8d96a8;font-size:13px;line-height:1.6">
            If the button does not work, copy and paste this link:<br />
            <span style="word-break:break-all">${claimUrl}</span>
          </p>
        </div>
        <div style="padding:20px 28px;border-top:1px solid rgba(255,255,255,0.1);color:#8d96a8;font-size:13px;line-height:1.6">
          Want to follow the proof live? <a href="${claimUrl}" style="color:#70ff8b;font-weight:800">Join claim</a>
        </div>
      </div>
    </div>
  `;
}

async function readResendError(resendResponse) {
  const body = await resendResponse.json().catch(() => null);
  return body?.message || body?.error || `Resend returned HTTP ${resendResponse.status}.`;
}

function formatMoney(cents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(cents || 0) / 100);
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
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Claimroom <onboarding@resend.dev>';
  const appName = process.env.VITE_APP_NAME || 'Claimroom';
  const origin = getOrigin(request);

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    json(response, 500, { error: 'Server Supabase configuration is incomplete.' });
    return;
  }

  if (!resendApiKey) {
    json(response, 500, { error: 'Email is not configured yet.' });
    return;
  }

  if (!origin) {
    json(response, 500, { error: 'App origin is not configured.' });
    return;
  }

  const { user, error: authError } = await getAuthedUser(request, supabaseUrl, publishableKey);

  if (!user) {
    json(response, 401, { error: authError || 'Sign in before inviting supporters.' });
    return;
  }

  const claimId = cleanText(request.body?.claimId);
  const emails = parseEmails(Array.isArray(request.body?.emails) ? request.body.emails.join(' ') : request.body?.emails);

  if (!claimId) {
    json(response, 400, { error: 'claimId is required.' });
    return;
  }

  if (emails.length === 0) {
    json(response, 400, { error: 'Add at least one valid supporter email.' });
    return;
  }

  if (emails.length > 50) {
    json(response, 400, { error: 'Send up to 50 supporter invites at a time.' });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data: claim, error: claimError } = await supabaseAdmin
    .from('claims')
    .select('id, slug, creator_id, creator_name, title, pledge_threshold_cents, status')
    .eq('id', claimId)
    .single();

  if (claimError || !claim) {
    json(response, 404, { error: claimError?.message || 'Claim not found.' });
    return;
  }

  if (claim.creator_id !== user.id) {
    json(response, 403, { error: 'Only the claimer can invite supporters.' });
    return;
  }

  if (claim.status === 'draft') {
    json(response, 400, { error: 'Activate the claim before inviting supporters.' });
    return;
  }

  const claimUrl = `${origin}/claims/${claim.slug}`;
  const html = buildSupporterInviteHtml({
    appName,
    claim: {
      ...claim,
      pledgeGoal: formatMoney(claim.pledge_threshold_cents),
    },
    claimUrl,
  });
  let sent = 0;
  let skipped = 0;
  const errors = [];

  for (const email of emails) {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: `${claim.creator_name} invited you to back a ${appName} claim`,
        html,
      }),
    });

    if (resendResponse.ok) {
      sent += 1;
    } else {
      skipped += 1;
      const error = await readResendError(resendResponse);
      errors.push({ email, error });
      console.warn('Supporter invite email failed', {
        claimId: claim.id,
        email,
        status: resendResponse.status,
        error,
      });
    }
  }

  if (sent === 0 && skipped > 0) {
    json(response, 502, {
      error: errors[0]?.error || 'No supporter invites were sent.',
      sent,
      skipped,
      errors,
    });
    return;
  }

  json(response, 200, {
    ok: true,
    sent,
    skipped,
    errors,
  });
};
