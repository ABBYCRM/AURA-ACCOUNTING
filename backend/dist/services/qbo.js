"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthUrl = getAuthUrl;
exports.exchangeCode = exchangeCode;
exports.refreshAccessToken = refreshAccessToken;
exports.revokeToken = revokeToken;
exports.getApiBaseUrl = getApiBaseUrl;
exports.getConnection = getConnection;
exports.qboFetch = qboFetch;
exports.qboQuery = qboQuery;
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const REVOKE_URL = 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke';
function getAuthUrl(opts) {
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
async function exchangeCode(opts) {
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
    return res.json();
}
async function refreshAccessToken(opts) {
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
    return res.json();
}
async function revokeToken(opts) {
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
function getApiBaseUrl(environment) {
    return environment === 'production'
        ? 'https://quickbooks.api.intuit.com'
        : 'https://sandbox-quickbooks.api.intuit.com';
}
function getConnection(conn, clientId, clientSecret) {
    return {
        conn,
        clientId,
        clientSecret,
        apiBase: getApiBaseUrl(conn.environment),
    };
}
async function qboFetch(opts) {
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
async function qboQuery(opts) {
    const encoded = encodeURIComponent(opts.query);
    return qboFetch({
        apiBase: opts.apiBase,
        accessToken: opts.accessToken,
        realmId: opts.realmId,
        path: `/query?query=${encoded}&minorversion=70`,
    });
}
//# sourceMappingURL=qbo.js.map