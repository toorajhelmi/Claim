const { createClient } = require('@supabase/supabase-js');

function json(response, status, body) {
  response.status(status).json(body);
}

function normalizeOrigin(origin) {
  if (!origin) return '';
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
}

function buildConfirmationHtml({ appName, actionLink, displayName }) {
  const greeting = displayName ? `Hi ${displayName},` : 'Hi,';

  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#05070d;color:#f8fbff;padding:32px">
      <div style="max-width:560px;margin:0 auto;background:#10141f;border-radius:24px;padding:28px">
        <h1 style="margin:0 0 16px;font-size:32px;line-height:1.05">Confirm your ${appName} account</h1>
        <p style="color:#cbd2df;font-size:16px;line-height:1.6">${greeting}</p>
        <p style="color:#cbd2df;font-size:16px;line-height:1.6">
          Confirm your email to continue setting up your live proof claim.
        </p>
        <p style="margin:28px 0">
          <a href="${actionLink}" style="display:inline-block;background:linear-gradient(135deg,#70ff8b,#42ddff);color:#041006;text-decoration:none;font-weight:800;border-radius:999px;padding:14px 22px">
            Confirm email
          </a>
        </p>
        <p style="color:#8d96a8;font-size:13px;line-height:1.6">
          If the button does not work, copy and paste this link into your browser:<br />
          <span style="word-break:break-all">${actionLink}</span>
        </p>
      </div>
    </div>
  `;
}

function buildConfirmationText({ appName, actionLink, displayName }) {
  const greeting = displayName ? `Hi ${displayName},` : 'Hi,';

  return [
    `${greeting}`,
    '',
    `Confirm your ${appName} account to continue setting up your live proof claim.`,
    '',
    `Confirm email: ${actionLink}`,
    '',
    `If you did not request this ${appName} account, you can ignore this email.`,
  ].join('\n');
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    json(response, 405, { error: 'Method not allowed' });
    return;
  }

  const {
    displayName,
    email,
    handle,
    password,
    primaryPlatform,
    redirectTo,
  } = request.body ?? {};

  if (!displayName || !email || !handle || !password || !primaryPlatform || !redirectTo) {
    json(response, 400, { error: 'displayName, email, handle, password, primaryPlatform, and redirectTo are required' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_JWT || process.env.SUPABASE_SECRET_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const appName = process.env.VITE_APP_NAME || 'Klaimd';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Klaimd <noreply@send.klaimd.app>';

  if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
    json(response, 500, { error: 'Server email configuration is incomplete' });
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const normalizedEmail = String(email).trim().toLowerCase();
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const existingUser = existingUsers?.users?.find(
    (user) => user.email?.toLowerCase() === normalizedEmail,
  );

  if (existingUser?.email_confirmed_at) {
    json(response, 409, { error: 'This email is already confirmed. Sign in to continue.' });
    return;
  }

  if (existingUser) {
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.id);

    if (deleteError) {
      json(response, 400, { error: deleteError.message });
      return;
    }
  }

  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email: normalizedEmail,
    password: String(password),
    options: {
      data: {
        display_name: String(displayName).trim(),
        handle: String(handle).trim(),
        primary_platform: String(primaryPlatform),
        role: 'claimer',
      },
      redirectTo: String(redirectTo),
    },
  });

  if (linkError || !linkData?.properties?.action_link || !linkData.user?.id) {
    json(response, 400, { error: linkError?.message ?? 'Could not create confirmation link' });
    return;
  }

  await supabaseAdmin.from('profiles').upsert({
    id: linkData.user.id,
    display_name: String(displayName).trim(),
    handle: String(handle).trim(),
    contact_email: String(email).trim(),
    primary_platform: String(primaryPlatform),
  });

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [normalizedEmail],
      subject: `Confirm your ${appName} account`,
      text: buildConfirmationText({
        appName,
        actionLink: linkData.properties.action_link,
        displayName: String(displayName).trim(),
      }),
      html: buildConfirmationHtml({
        appName,
        actionLink: linkData.properties.action_link,
        displayName: String(displayName).trim(),
      }),
    }),
  });

  if (!resendResponse.ok) {
    const resendError = await resendResponse.json().catch(() => ({}));
    json(response, 502, {
      error: resendError.message || 'Resend could not send the confirmation email',
    });
    return;
  }

  json(response, 200, {
    ok: true,
    email: normalizedEmail,
    redirectOrigin: normalizeOrigin(new URL(String(redirectTo)).origin),
  });
};
