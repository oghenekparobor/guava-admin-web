import { auth } from './firebase'

/**
 * Firebase Remote Config admin client.
 *
 * Talks to the Vercel serverless proxy at /api/remote-config, which holds the
 * service-account credentials server-side (see api/remote-config.ts). Each
 * request is authenticated with the signed-in admin's Firebase ID token; the
 * proxy checks it against the RC_ADMIN_EMAILS allowlist before doing any
 * privileged work, so nothing secret ever reaches the browser.
 *
 * In dev (vite dev has no serverless functions) set VITE_RC_PROXY_BASE to the
 * deployed dashboard origin, e.g. https://admin.guava.finance — the function
 * sends CORS headers, and auth still rides on the ID token.
 */

const PROXY_BASE = ((import.meta.env.VITE_RC_PROXY_BASE as string | undefined) ?? '').replace(/\/$/, '')
const ENDPOINT = `${PROXY_BASE}/api/remote-config`

export interface RemoteConfigParameterValue {
  value?: string
  useInAppDefault?: boolean
}

export interface RemoteConfigParameter {
  defaultValue?: RemoteConfigParameterValue
  conditionalValues?: Record<string, RemoteConfigParameterValue>
  description?: string
  valueType?: 'STRING' | 'BOOLEAN' | 'NUMBER' | 'JSON' | 'VALUE_TYPE_UNSPECIFIED'
}

export interface RemoteConfigTemplate {
  conditions?: unknown[]
  parameters?: Record<string, RemoteConfigParameter>
  parameterGroups?: Record<string, { description?: string; parameters?: Record<string, RemoteConfigParameter> }>
  version?: {
    versionNumber?: string
    updateTime?: string
    updateUser?: { email?: string }
    updateOrigin?: string
    updateType?: string
    description?: string
  }
}

export interface TemplateFetchResult {
  template: RemoteConfigTemplate
  /** ETag for optimistic concurrency on publish; '*' if unavailable. */
  etag: string
}

// ── Errors ───────────────────────────────────────────────────────────────────

/** Caller isn't allowed: signed out, expired token, or not on the allowlist. */
export class RemoteConfigAuthError extends Error {}
export class RemoteConfigConflictError extends Error {
  constructor(message = 'The template changed since it was loaded (someone else published). Reload and re-apply your edit.') {
    super(message)
  }
}

// ── Proxy transport ──────────────────────────────────────────────────────────

async function call<T>(method: 'GET' | 'PUT', body?: unknown): Promise<T> {
  const user = auth.currentUser
  if (!user) throw new RemoteConfigAuthError('You are signed out — sign in again to continue.')
  const idToken = await user.getIdToken()

  const res = await fetch(ENDPOINT, {
    method,
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // `vite dev` has no serverless functions — it serves the function's source
  // (or a 404) for /api/* instead of running it. Detect anything non-JSON.
  const isJson = (res.headers.get('content-type') ?? '').includes('application/json')
  if (!isJson || res.status === 404 || res.status === 405) {
    throw new Error(
      'Remote Config proxy not available. The /api/remote-config function only runs on Vercel — in local dev, set VITE_RC_PROXY_BASE in .env.local to the deployed dashboard URL (or use `vercel dev`).',
    )
  }
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch { /* non-JSON error body */ }
    if (res.status === 401 || res.status === 403) throw new RemoteConfigAuthError(message)
    if (res.status === 409) throw new RemoteConfigConflictError(message)
    throw new Error(`Remote Config request failed: ${message}`)
  }
  return res.json() as Promise<T>
}

// ── Template operations ──────────────────────────────────────────────────────

export function fetchTemplate(): Promise<TemplateFetchResult> {
  return call<TemplateFetchResult>('GET')
}

/** Server-side dry run — verifies the template without publishing it. */
export async function validateTemplate(template: RemoteConfigTemplate, etag: string): Promise<string> {
  const { version: _version, ...rest } = template // version is output-only
  const res = await call<{ etag: string }>('PUT', { template: rest, etag, validateOnly: true })
  return res.etag
}

/** Publishes the template live. Returns the new ETag. */
export async function publishTemplate(template: RemoteConfigTemplate, etag: string): Promise<string> {
  const { version: _version, ...rest } = template
  const res = await call<{ etag: string }>('PUT', { template: rest, etag })
  return res.etag
}
