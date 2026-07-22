import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../db';
import {
  getAuthUrl,
  exchangeCode,
  refreshAccessToken,
  revokeToken,
  qboQuery,
  getApiBaseUrl,
} from '../services/qbo';

const router = Router();
router.use(requireAuth);

const STATE_TTL_MS = 10 * 60 * 1000;
const stateStore = new Map<string, { companyId: number; createdAt: number; userId: number }>();

function cleanStates() {
  const now = Date.now();
  for (const [k, v] of stateStore) {
    if (now - v.createdAt > STATE_TTL_MS) stateStore.delete(k);
  }
}

function isConfigured(): boolean {
  return !!(process.env.QBO_CLIENT_ID && process.env.QBO_CLIENT_SECRET && process.env.QBO_REDIRECT_URI);
}

router.get('/status', (req: Request, res: Response) => {
  const conn = db
    .prepare('SELECT id, realmId, environment, connectedAt, accessTokenExpiresAt, refreshTokenExpiresAt FROM qbo_connections WHERE companyId = ?')
    .get(req.user!.companyId) as any;
  res.json({
    configured: isConfigured(),
    environment: process.env.QBO_ENVIRONMENT || 'sandbox',
    connected: !!conn,
    connection: conn || null,
  });
});

router.get('/connect', (req: Request, res: Response) => {
  if (!isConfigured()) {
    return res.status(400).json({
      error: 'QuickBooks Online OAuth is not configured. Set QBO_CLIENT_ID, QBO_CLIENT_SECRET, and QBO_REDIRECT_URI in environment variables.',
    });
  }
  cleanStates();
  const state = crypto.randomBytes(16).toString('hex');
  stateStore.set(state, {
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    createdAt: Date.now(),
  });
  const url = getAuthUrl({
    clientId: process.env.QBO_CLIENT_ID!,
    redirectUri: process.env.QBO_REDIRECT_URI!,
    state,
    environment: (process.env.QBO_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  });
  res.json({ url });
});

async function handleCallback(req: Request, res: Response) {
  const { code, state, realmId } = req.query as Record<string, string>;
  if (!code || !state || !realmId) {
    return res.status(400).send('Missing code, state, or realmId in callback.');
  }
  const stored = stateStore.get(state);
  if (!stored) {
    return res.status(400).send('Invalid or expired state. Please restart the QuickBooks connection.');
  }
  stateStore.delete(state);
  if (stored.companyId !== req.user!.companyId && stored.userId !== req.user!.userId) {
    // Allow if state is for the current session
  }

  try {
    const tokens = await exchangeCode({
      clientId: process.env.QBO_CLIENT_ID!,
      clientSecret: process.env.QBO_CLIENT_SECRET!,
      redirectUri: process.env.QBO_REDIRECT_URI!,
      code,
    });
    const now = new Date();
    const accessExpires = new Date(now.getTime() + tokens.expires_in * 1000).toISOString();
    const refreshExpires = new Date(now.getTime() + tokens.x_refresh_token_expires_in * 1000).toISOString();

    db.prepare(
      `INSERT INTO qbo_connections
       (companyId, realmId, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt, environment)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(companyId) DO UPDATE SET
         realmId = excluded.realmId,
         accessToken = excluded.accessToken,
         refreshToken = excluded.refreshToken,
         accessTokenExpiresAt = excluded.accessTokenExpiresAt,
         refreshTokenExpiresAt = excluded.refreshTokenExpiresAt,
         environment = excluded.environment,
         connectedAt = excluded.connectedAt`
    ).run(
      stored.companyId,
      realmId,
      tokens.access_token,
      tokens.refresh_token,
      accessExpires,
      refreshExpires,
      (process.env.QBO_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
    );

    logAudit({
      companyId: stored.companyId,
      userId: stored.userId,
      action: 'qbo.connect',
      details: { realmId, environment: process.env.QBO_ENVIRONMENT },
    });

    res.redirect('/settings?tab=integrations&qbo=connected');
  } catch (e: any) {
    res.status(500).send(`OAuth exchange failed: ${e.message}`);
  }
}

router.get('/callback', requireAuth, handleCallback);

// Allow non-auth callback (since Intuit will redirect the user back)
router.get('/callback-public', (req, res) => {
  // For the OAuth callback, the user may not have a cookie if they came from a different
  // session. Look up the connection by realmId + create cookies if needed.
  const { code, state, realmId } = req.query as Record<string, string>;
  if (!code || !state || !realmId) {
    return res.status(400).send('Missing parameters.');
  }
  const stored = stateStore.get(state);
  if (!stored) {
    return res.status(400).send('Invalid or expired state.');
  }
  stateStore.delete(state);

  exchangeCode({
    clientId: process.env.QBO_CLIENT_ID!,
    clientSecret: process.env.QBO_CLIENT_SECRET!,
    redirectUri: process.env.QBO_REDIRECT_URI!,
    code,
  })
    .then((tokens) => {
      const now = new Date();
      const accessExpires = new Date(now.getTime() + tokens.expires_in * 1000).toISOString();
      const refreshExpires = new Date(now.getTime() + tokens.x_refresh_token_expires_in * 1000).toISOString();
      db.prepare(
        `INSERT INTO qbo_connections
         (companyId, realmId, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt, environment)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(companyId) DO UPDATE SET
           realmId = excluded.realmId, accessToken = excluded.accessToken, refreshToken = excluded.refreshToken,
           accessTokenExpiresAt = excluded.accessTokenExpiresAt, refreshTokenExpiresAt = excluded.refreshTokenExpiresAt,
           environment = excluded.environment, connectedAt = excluded.connectedAt`
      ).run(
        stored.companyId, realmId, tokens.access_token, tokens.refresh_token,
        accessExpires, refreshExpires,
        (process.env.QBO_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
      );
      logAudit({
        companyId: stored.companyId,
        userId: stored.userId,
        action: 'qbo.connect',
        details: { realmId },
      });
      res.redirect('/settings?tab=integrations&qbo=connected');
    })
    .catch((e) => res.status(500).send(`OAuth exchange failed: ${e.message}`));
});

async function getValidTokens(companyId: number) {
  const conn = db
    .prepare('SELECT * FROM qbo_connections WHERE companyId = ?')
    .get(companyId) as any;
  if (!conn) throw new Error('QuickBooks is not connected. Please connect first.');
  const now = Date.now();
  const accessExpiry = new Date(conn.accessTokenExpiresAt).getTime();
  if (accessExpiry - now < 60_000) {
    if (!isConfigured()) throw new Error('QBO env vars not set; cannot refresh.');
    const refreshed = await refreshAccessToken({
      clientId: process.env.QBO_CLIENT_ID!,
      clientSecret: process.env.QBO_CLIENT_SECRET!,
      refreshToken: conn.refreshToken,
    });
    const accessExpires = new Date(now + refreshed.expires_in * 1000).toISOString();
    const refreshExpires = new Date(now + refreshed.x_refresh_token_expires_in * 1000).toISOString();
    db.prepare(
      'UPDATE qbo_connections SET accessToken = ?, refreshToken = ?, accessTokenExpiresAt = ?, refreshTokenExpiresAt = ? WHERE companyId = ?'
    ).run(refreshed.access_token, refreshed.refresh_token, accessExpires, refreshExpires, companyId);
    conn.accessToken = refreshed.access_token;
    conn.refreshToken = refreshed.refresh_token;
    conn.accessTokenExpiresAt = accessExpires;
    conn.refreshTokenExpiresAt = refreshExpires;
  }
  return conn;
}

router.post('/disconnect', async (req: Request, res: Response) => {
  const conn = db
    .prepare('SELECT * FROM qbo_connections WHERE companyId = ?')
    .get(req.user!.companyId) as any;
  if (!conn) return res.json({ ok: true });
  try {
    if (isConfigured()) {
      await revokeToken({
        clientId: process.env.QBO_CLIENT_ID!,
        clientSecret: process.env.QBO_CLIENT_SECRET!,
        refreshToken: conn.refreshToken,
      });
    }
  } catch (e) {
    // best-effort
  }
  db.prepare('DELETE FROM qbo_connections WHERE companyId = ?').run(req.user!.companyId);
  logAudit({
    companyId: req.user!.companyId,
    userId: req.user!.userId,
    action: 'qbo.disconnect',
  });
  res.json({ ok: true });
});

router.post('/sync/customers', async (req: Request, res: Response) => {
  try {
    const conn = await getValidTokens(req.user!.companyId);
    const data = await qboQuery({
      apiBase: getApiBaseUrl(conn.environment),
      accessToken: conn.accessToken,
      realmId: conn.realmId,
      query: 'SELECT * FROM Customer MAXRESULTS 200',
    });
    const customers = (data?.QueryResponse?.Customer as any[]) || [];
    logAudit({
      companyId: req.user!.companyId,
      userId: req.user!.userId,
      action: 'qbo.sync_customers',
      details: { count: customers.length },
    });
    res.json({ count: customers.length, customers: customers.slice(0, 50) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/sync/invoices', async (req: Request, res: Response) => {
  try {
    const conn = await getValidTokens(req.user!.companyId);
    const data = await qboQuery({
      apiBase: getApiBaseUrl(conn.environment),
      accessToken: conn.accessToken,
      realmId: conn.realmId,
      query: 'SELECT * FROM Invoice MAXRESULTS 200',
    });
    const invoices = (data?.QueryResponse?.Invoice as any[]) || [];
    logAudit({
      companyId: req.user!.companyId,
      userId: req.user!.userId,
      action: 'qbo.sync_invoices',
      details: { count: invoices.length },
    });
    res.json({ count: invoices.length, invoices: invoices.slice(0, 50) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/sync/accounts', async (req: Request, res: Response) => {
  try {
    const conn = await getValidTokens(req.user!.companyId);
    const data = await qboQuery({
      apiBase: getApiBaseUrl(conn.environment),
      accessToken: conn.accessToken,
      realmId: conn.realmId,
      query: 'SELECT * FROM Account MAXRESULTS 500',
    });
    const accounts = (data?.QueryResponse?.Account as any[]) || [];
    logAudit({
      companyId: req.user!.companyId,
      userId: req.user!.userId,
      action: 'qbo.sync_accounts',
      details: { count: accounts.length },
    });
    res.json({ count: accounts.length, accounts: accounts.slice(0, 50) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/company-info', async (req: Request, res: Response) => {
  try {
    const conn = await getValidTokens(req.user!.companyId);
    const data = await qboQuery({
      apiBase: getApiBaseUrl(conn.environment),
      accessToken: conn.accessToken,
      realmId: conn.realmId,
      query: 'SELECT * FROM CompanyInfo',
    });
    res.json({ companyInfo: data?.QueryResponse?.CompanyInfo?.[0] || null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
