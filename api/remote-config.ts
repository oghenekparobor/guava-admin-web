import { createSign } from 'node:crypto'

/**
 * Vercel serverless proxy for Firebase Remote Config.
 *
 * The dashboard cannot hold Remote Config write credentials client-side, so
 * this function does the privileged work with a service account whose JSON
 * key lives ONLY in the `RC_SERVICE_ACCOUNT` env var (never in the bundle).
 *
 * Every request must carry a Firebase ID token (`Authorization: Bearer …`)
 * from the signed-in dashboard admin; the token is verified against this
 * Firebase project and the email checked against the `RC_ADMIN_EMAILS`
 * allowlist. Fails closed if either env var is missing.
 *
 *   GET  /api/remote-config                 → { etag, template }
 *   PUT  /api/remote-config                 → publish  { template, etag } → { etag }
 *   PUT  /api/remote-config (validateOnly)  → validate { template, etag, validateOnly: true }
 */

// Public web API key (same one shipped in src/lib/firebase.ts) — scopes ID
// token verification to this Firebase project.
const FIREBASE_API_KEY = 'AIzaSyB7CCw42rCiCCmJq5-Qs5qt2OCE0KGg9qc'
const PROJECT_ID = 'guavafinance-7d405'
const RC_URL = `https://firebaseremoteconfig.googleapis.com/v1/projects/${PROJECT_ID}/remoteConfig`
const SCOPE = 'https://www.googleapis.com/auth/firebase.remoteconfig'

interface ServiceAccount { client_email: string; private_key: string }

// ── Service-account access token (cached across warm invocations) ────────────

let cachedToken: { token: string; expires: number } | null = null

async function serviceAccountToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires - 60_000) return cachedToken.token

  const raw = process.env.RC_SERVICE_ACCOUNT
  if (!raw) throw new HttpError(500, 'RC_SERVICE_ACCOUNT env var is not configured')
  let sa: ServiceAccount
  try {
    sa = JSON.parse(raw)
  } catch {
    throw new HttpError(500, 'RC_SERVICE_ACCOUNT is not valid JSON')
  }

  const now = Math.floor(Date.now() / 1000)
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`
  const signature = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  })
  if (!res.ok) throw new HttpError(502, `Service account token exchange failed (${res.status})`)
  const { access_token, expires_in } = await res.json()
  cachedToken = { token: access_token, expires: Date.now() + expires_in * 1000 }
  return access_token
}

// ── Caller verification (Firebase ID token + email allowlist) ────────────────

async function verifyAdmin(authorization: string | undefined): Promise<string> {
  const idToken = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null
  if (!idToken) throw new HttpError(401, 'Missing Firebase ID token')

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    },
  )
  if (!res.ok) throw new HttpError(401, 'Invalid or expired Firebase ID token')
  const { users } = await res.json()
  const email: string | undefined = users?.[0]?.email
  if (!email) throw new HttpError(401, 'Could not resolve the signed-in account')

  const allowlist = (process.env.RC_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (allowlist.length === 0) throw new HttpError(500, 'RC_ADMIN_EMAILS env var is not configured')
  if (!allowlist.includes(email.toLowerCase())) {
    throw new HttpError(403, `${email} is not on the Remote Config admin allowlist`)
  }
  return email
}

// ── Handler ──────────────────────────────────────────────────────────────────

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

function setCors(req: any, res: any): void {
  // Auth is enforced per-request via the ID token, so cross-origin dev access
  // (e.g. localhost Vite pointing at the deployed function) is safe to allow.
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*')
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
}

export default async function handler(req: any, res: any) {
  setCors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()

  try {
    await verifyAdmin(req.headers.authorization)
    const token = await serviceAccountToken()

    if (req.method === 'GET') {
      const upstream = await fetch(RC_URL, { headers: { Authorization: `Bearer ${token}` } })
      if (!upstream.ok) throw await upstreamError(upstream)
      const template = await upstream.json()
      return res.status(200).json({ etag: upstream.headers.get('etag') ?? '*', template })
    }

    if (req.method === 'PUT') {
      const { template, etag, validateOnly } = req.body ?? {}
      if (!template || !etag) throw new HttpError(400, 'Body must include { template, etag }')
      const upstream = await fetch(validateOnly ? `${RC_URL}?validate_only=true` : RC_URL, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8',
          'If-Match': etag,
        },
        body: JSON.stringify(template),
      })
      if (!upstream.ok) throw await upstreamError(upstream)
      return res.status(200).json({ etag: upstream.headers.get('etag') ?? '*' })
    }

    throw new HttpError(405, `Method ${req.method} not allowed`)
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500
    const message = e instanceof Error ? e.message : 'Internal error'
    return res.status(status).json({ error: message })
  }
}

async function upstreamError(upstream: Response): Promise<HttpError> {
  if (upstream.status === 409 || upstream.status === 412) {
    return new HttpError(409, 'Template changed since it was loaded — reload and re-apply your edit')
  }
  let detail = `${upstream.status} ${upstream.statusText}`
  try {
    const body = await upstream.json()
    if (body?.error?.message) detail = body.error.message
  } catch { /* non-JSON upstream error */ }
  return new HttpError(502, `Remote Config API error: ${detail}`)
}
