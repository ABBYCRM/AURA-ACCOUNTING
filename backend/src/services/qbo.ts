import { QboConnection } from '../types';

const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const REVOKE_URL = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';

export function getAuthUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
  environment: 'sandbox' | 'production';
}): string {
  const scope = 'com.intuit.quickbooks.accounting';
  const params = new URLSearchParams({
    client_id: opts.clientId,
    response_type: 'code',
    scope,
    redirect_uri: opts.redirectUri,
    state: opts.state,
  });
  const host = opts.environment === 'production' ? 'appcenter.intuit.com' : 'appcenter.intuit.com';
  return `https://${host}/connect/oauth2?${params.toString()}`;
}

export async function exchangeCode(opts: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  token_type: string;
}> {
  const basic = Buffer.from(`${opts.clientId}:${opts.clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: opts.code,
    redirect_uri: opts.redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QBO token exchange failed: ${res.status} ${text}`);
  }
  return res.json() as any;
}

export async function refreshAccessToken(opts: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
}> {
  const basic = Buffer.from(`${opts.clientId}:${opts.clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: opts.refreshToken,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QBO token refresh failed: ${res.status} ${text}`);
  }
  return res.json() as any;
}

export async function revokeToken(opts: { clientId: string; clientSecret: string; refreshToken: string }) {
  const basic = Buffer.from(`${opts.clientId}:${opts.clientSecret}`).toString('base64');
  const body = new URLSearchParams({ token: opts.refreshToken });
  await fetch(REVOKE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });
}

export function getApiBaseUrl(environment: 'sandbox' | 'production'): string {
  return environment === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com';
}

export function getConnection(conn: QboConnection, clientId: string, clientSecret: string) {
  return {
    conn,
    clientId,
    clientSecret,
    apiBase: getApiBaseUrl(conn.environment),
  };
}

export async function qboFetch(opts: {
  apiBase: string;
  accessToken: string;
  realmId: string;
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
}): Promise<any> {
  const url = `${opts.apiBase}/v3/company/${opts.realmId}${opts.path}`;
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QBO API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function qboQuery(opts: {
  apiBase: string;
  accessToken: string;
  realmId: string;
  query: string;
}): Promise<any> {
  const encoded = encodeURIComponent(opts.query);
  return qboFetch({
    apiBase: opts.apiBase,
    accessToken: opts.accessToken,
    realmId: opts.realmId,
    path: `/query?query=${encoded}&minorversion=70`,
  });
}
