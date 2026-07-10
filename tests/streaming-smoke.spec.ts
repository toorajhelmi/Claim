import { expect, test, chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

type TestUser = {
  email: string;
  id: string;
  name: string;
  password: string;
};

type TestData = {
  claimer: TestUser;
  recorderOne: TestUser;
  recorderTwo: TestUser;
  supporter: TestUser;
  liveClaimId: string;
  liveClaimSlug: string;
  rejectedClaimSlug: string;
  verifiedClaimSlug: string;
};

const rootDir = path.resolve(__dirname, '..');
const baseUrl = process.env.KLAIMD_BASE_URL ?? 'http://127.0.0.1:5173';
const password = `Stream-${Date.now()}!`;
const runId = `smoke${Date.now().toString(36)}`;
const createdUserIds: string[] = [];
const createdClaimIds: string[] = [];

let admin: SupabaseClient;
let browser: Browser;
let testData: TestData;

test.describe.configure({ mode: 'serial', timeout: 240_000 });

test.beforeAll(async () => {
  loadEnvFile(path.join(rootDir, '.env.local'));
  loadEnvFile(path.join(rootDir, 'apps/web/.env.local'));

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_JWT;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required for streaming smoke tests.');
  }

  admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
  testData = await createStreamingTestData();
});

test.afterAll(async () => {
  await browser?.close();

  for (const claimId of createdClaimIds.reverse()) {
    await admin?.from('claims').delete().eq('id', claimId);
  }

  for (const userId of createdUserIds.reverse()) {
    await admin?.auth.admin.deleteUser(userId);
  }
});

test('claimer and multiple recorders can stream, leave, rejoin, and supporters can switch streams', async () => {
  const livePath = `/claims/${testData.liveClaimSlug}/live`;
  const claimer = await openSignedInLivePage(testData.claimer, livePath);
  const recorderOne = await openSignedInLivePage(testData.recorderOne, livePath);
  const recorderTwo = await openSignedInLivePage(testData.recorderTwo, livePath);
  const supporter = await openSignedInLivePage(testData.supporter, livePath);

  await joinRoom(claimer, /Open live room/i);
  await expectTileCount(claimer, 1);

  await joinRoom(recorderOne, /Open live room/i);
  await joinRoom(recorderTwo, /Open live room/i);
  await expectTileCount(claimer, 3);

  await joinRoom(supporter, /Watch live/i);
  await expectTileCount(supporter, 3);
  await expect(supporter.locator('[data-testid="live-media-tile"][data-live-local="true"]')).toHaveCount(0);

  await supporter.locator('[data-testid="live-stream-strip"] [data-live-role="recorder"]').first().click();
  await expect(supporter.locator('[data-testid="live-featured-stream"] [data-live-role="recorder"]')).toBeVisible();

  await leaveRoom(recorderOne);
  await expectTileCount(supporter, 2);

  await joinRoom(recorderOne, /Open live room/i);
  await expectTileCount(supporter, 3);

  await leaveRoom(claimer);
  await expectTileCount(supporter, 2);
  await expect(supporter.locator('[data-testid="live-media-tile"][data-live-role="recorder"]')).toHaveCount(2);

  await leaveRoom(recorderOne);
  await leaveRoom(recorderTwo);
  await expect(supporter.getByTestId('live-empty-stage')).toBeVisible();

  await joinRoom(claimer, /Open live room/i);
  await expectTileCount(supporter, 1);

  await closePages([claimer, recorderOne, recorderTwo, supporter]);
});

test('verified recordings are replayable but rejected claims are claimer-only', async () => {
  const supporter = await openSignedInPage(testData.supporter, `/claims/${testData.verifiedClaimSlug}/result`);

  await expect(supporter.getByTestId('event-replay-video')).toBeVisible();
  await expect(supporter.getByRole('link', { name: /Open recording/i })).toBeVisible();

  await supporter.goto(`${baseUrl}/claims/${testData.rejectedClaimSlug}/result`);
  await expect(supporter.getByText(/Claim not found/i)).toBeVisible();

  const claimer = await openSignedInPage(testData.claimer, `/claims/${testData.rejectedClaimSlug}/result`);
  await expect(claimer.getByTestId('event-replay-video')).toBeVisible();

  await closePages([supporter, claimer]);
});

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) {
      continue;
    }

    const [key, ...valueParts] = line.split('=');
    process.env[key] ??= valueParts.join('=').trim();
  }
}

async function createStreamingTestData(): Promise<TestData> {
  const claimer = await createUser('Claimer');
  const recorderOne = await createUser('Recorder One');
  const recorderTwo = await createUser('Recorder Two');
  const supporter = await createUser('Supporter');
  const liveClaim = await createClaim({
    claimer,
    slug: `stream-${runId}-live1`,
    status: 'live',
    title: `Streaming smoke live claim ${runId}`,
  });
  const verifiedClaim = await createClaim({
    claimer,
    slug: `stream-${runId}-verified1`,
    status: 'verified',
    title: `Streaming smoke verified claim ${runId}`,
  });
  const rejectedClaim = await createClaim({
    claimer,
    slug: `stream-${runId}-rejected1`,
    status: 'not_proven',
    title: `Streaming smoke rejected claim ${runId}`,
  });

  await insertRecorderInvites(liveClaim.id, [recorderOne, recorderTwo]);
  await insertRecordingAndResult(verifiedClaim.id, 'verified');
  await insertRecordingAndResult(rejectedClaim.id, 'not_proven');

  return {
    claimer,
    recorderOne,
    recorderTwo,
    supporter,
    liveClaimId: liveClaim.id,
    liveClaimSlug: liveClaim.slug,
    rejectedClaimSlug: rejectedClaim.slug,
    verifiedClaimSlug: verifiedClaim.slug,
  };
}

async function createUser(role: string): Promise<TestUser> {
  const email = `${runId}-${role.toLowerCase().replace(/\s+/g, '-')}@klaimd.test`;
  const name = `Smoke ${role}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: name,
    },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? `Could not create ${role} test user.`);
  }

  createdUserIds.push(data.user.id);

  const { error: profileError } = await admin.from('profiles').upsert({
    contact_email: email,
    display_name: name,
    handle: `${runId}-${role.toLowerCase().replace(/\s+/g, '-')}`,
    id: data.user.id,
  });

  if (profileError) {
    throw new Error(profileError.message);
  }

  return {
    email,
    id: data.user.id,
    name,
    password,
  };
}

async function createClaim({
  claimer,
  slug,
  status,
  title,
}: {
  claimer: TestUser;
  slug: string;
  status: 'live' | 'not_proven' | 'verified';
  title: string;
}) {
  const now = new Date();
  const { data, error } = await admin
    .from('claims')
    .insert({
      claim_type: 'live_claim',
      contact_email: claimer.email,
      creator_id: claimer.id,
      creator_name: claimer.name,
      creator_platform: 'other',
      deadline_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
      description: 'Disposable streaming smoke test claim.',
      event_context: 'Playwright fake camera and microphone stream.',
      live_starts_at: now.toISOString(),
      pledge_threshold_cents: 0,
      proof_summary: 'Automated streaming smoke test.',
      slug,
      stake_amount_cents: 0,
      status,
      title,
    })
    .select('id, slug')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? `Could not create claim ${slug}.`);
  }

  createdClaimIds.push(data.id);
  return data as { id: string; slug: string };
}

async function insertRecorderInvites(claimId: string, recorders: TestUser[]) {
  const { error } = await admin.from('claim_recorder_invites').insert(recorders.map((recorder) => ({
    claim_id: claimId,
    invitee_contact: recorder.email,
    invitee_name: recorder.name,
    payout_share_bps: 1000,
    responsibilities: 'Publish a fake camera stream for automated LiveKit smoke testing.',
    role: 'recorder',
    status: 'accepted',
    accepted_at: new Date().toISOString(),
  })));

  if (error) {
    throw new Error(error.message);
  }
}

async function insertRecordingAndResult(claimId: string, status: 'verified' | 'not_proven') {
  const recordingUrl = `https://example.com/klaimd-smoke/${claimId}.mp4`;
  const { error: roomError } = await admin.from('claim_live_rooms').upsert({
    claim_id: claimId,
    livekit_room_name: `claim-${claimId}`,
    opened_at: new Date(Date.now() - 60_000).toISOString(),
    closed_at: new Date().toISOString(),
    recording_url: recordingUrl,
  }, { onConflict: 'claim_id' });

  if (roomError) {
    throw new Error(roomError.message);
  }

  const { error: resultError } = await admin.from('claim_results').upsert({
    claim_id: claimId,
    reviewer_name: 'Klaimd smoke test',
    status,
    summary: status === 'verified' ? 'Automated verified replay fixture.' : 'Automated rejected replay fixture.',
  }, { onConflict: 'claim_id' });

  if (resultError) {
    throw new Error(resultError.message);
  }
}

async function newMediaContext(): Promise<BrowserContext> {
  return browser.newContext({
    permissions: ['camera', 'microphone'],
  });
}

async function openSignedInLivePage(user: TestUser, livePath: string) {
  return openSignedInPage(user, livePath);
}

async function openSignedInPage(user: TestUser, nextPath: string) {
  const context = await newMediaContext();
  const page = await context.newPage();
  page.setDefaultTimeout(45_000);
  await page.goto(`${baseUrl}/auth?next=${encodeURIComponent(nextPath)}`);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: /Sign in and continue/i }).click();
  await page.waitForURL((url) => {
    if (url.pathname.startsWith('/auth')) {
      return false;
    }

    if (url.pathname === nextPath) {
      return true;
    }

    if (nextPath.endsWith('/live')) {
      return url.pathname.startsWith('/claims/') && url.pathname.endsWith('/live');
    }

    if (nextPath.endsWith('/result')) {
      return url.pathname.startsWith('/claims/') && url.pathname.endsWith('/result');
    }

    return url.pathname.startsWith('/claims/');
  }, { timeout: 45_000 });
  return page;
}

async function joinRoom(page: Page, buttonName: RegExp) {
  await page.getByRole('button', { name: buttonName }).click();
  await expect(page.getByTestId('live-room-stage')).toBeVisible({ timeout: 60_000 });
}

async function leaveRoom(page: Page) {
  await page.getByLabel(/Leave live room/i).click();
  await expect(page.getByTestId('live-room-stage')).toHaveCount(0, { timeout: 30_000 });
}

async function expectTileCount(page: Page, count: number) {
  await expect.poll(async () => page.getByTestId('live-media-tile').count(), {
    timeout: 45_000,
  }).toBe(count);
}

async function closePages(pages: Page[]) {
  await Promise.all(pages.map((page) => page.context().close()));
}
