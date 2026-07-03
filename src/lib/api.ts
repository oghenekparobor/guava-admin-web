// Guava Admin API client
// Set VITE_API_BASE_URL in .env to connect to the backend.
//
// Per-endpoint mock fallback: each call tries the real endpoint first and falls
// back to spec-shaped mock data (src/lib/mocks.ts) on 404 / network error, or
// serves mocks directly when no VITE_API_BASE_URL is configured. Endpoints
// "light up" with real data as the backend ships them.

import { auth } from './firebase'
import { mockFor, hasMock } from './mocks'

const BASE = (import.meta.env.VITE_API_BASE_URL as string) ?? ''

// Built per-request so X-Admin-Key always carries the current Firebase auth UID.
function headers(): HeadersInit {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-App-ID': 'finance.guava.web',
  }
  const uid = auth.currentUser?.uid
  if (uid) h['X-Admin-Key'] = uid
  return h
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  // No backend configured → serve mock when we have one.
  if (!BASE) {
    const m = mockFor(path, params)
    if (m !== undefined) return m as T
    throw new Error('API not configured')
  }
  const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : ''
  try {
    const res = await fetch(BASE + path + qs, { headers: headers() })
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
    return (await res.json()) as T
  } catch (e) {
    // Endpoint not shipped yet / unreachable → fall back to mock if available.
    const m = mockFor(path, params)
    if (m !== undefined) {
      if (import.meta.env.DEV) console.warn(`[api] ${path} → mock fallback (${(e as Error).message})`)
      return m as T
    }
    throw e
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  if (!BASE) {
    const m = mockFor(path, {}, body)
    if (m !== undefined) return m as T
    throw new Error('API not configured')
  }
  try {
    const res = await fetch(BASE + path, { method: 'POST', headers: headers(), body: JSON.stringify(body) })
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
    return (await res.json()) as T
  } catch (e) {
    const m = mockFor(path, {}, body)
    if (m !== undefined) {
      if (import.meta.env.DEV) console.warn(`[api] ${path} → mock fallback (${(e as Error).message})`)
      return m as T
    }
    throw e
  }
}

// Most endpoints return { results: [...] }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function results(path: string, params: Record<string, string> = {}): Promise<any[]> {
  const body = await get<{ results: unknown[] }>(path, params)
  return (body.results ?? []) as any[]
}

const sd = (startDate?: string): Record<string, string> =>
  startDate ? { start_date: startDate } : {}

// ── Endpoints (all prefixed /account/admin-details/) ─────────────────────────

const P = '/account/admin-details'

export const api = {
  // User growth
  weeklyUserGrowth:    (s?: string) => results(`${P}/user-growth/weekly/`,    sd(s)),
  monthlyUserGrowth:   (s?: string) => results(`${P}/user-growth/monthly/`,   sd(s)),
  quarterlyUserGrowth: (s?: string) => results(`${P}/user-growth/quarterly/`, sd(s)),

  // Revenue
  monthlyRevenue:      (s?: string) => results(`${P}/revenue/monthly/`,        sd(s)),
  quarterlyRevenue:    (s?: string) => results(`${P}/revenue/quarterly/`,      sd(s)),
  annualRevenue:       (s?: string) => results(`${P}/revenue/annual/`,         sd(s)),
  weeklyRevenueGrowth: (s?: string) => results(`${P}/revenue/weekly-growth/`,  sd(s)),
  revenueByCurrency:   (s?: string) => results(`${P}/revenue/by-currency/`,    sd(s)),

  // Deposits
  monthlyDeposits:     (s?: string) => results(`${P}/deposits/monthly/`,       sd(s)),
  depositsByChannel:   ()           => results(`${P}/deposits/by-channel/`),

  // Engagement
  mau:                 (s?: string) => results(`${P}/engagement/mau/`,         sd(s)),
  retention:           (s?: string) => results(`${P}/engagement/retention/`,   sd(s)),

  // KYC
  kycMonthlyStats:     (s?: string) => results(`${P}/kyc/monthly-stats/`,      sd(s)),
  kycStatusDist:       ()           => results(`${P}/kyc/status-distribution/`),

  // Transactions
  transactionTypes:    (s?: string) => results(`${P}/transaction-types/monthly/`, sd(s)),
  monthlyVolume:       (s?: string) => results(`${P}/monthly-category-volume/`,   sd(s)),
  categoryComparison:  (s?: string) => results(`${P}/category-comparative/`,      sd(s)),
  sourceAnalysis:      (s?: string) => results(`${P}/type-source-analysis/`,      sd(s)),

  // Volume over time (bounded window + cursor; returns { results, next_cursor })
  volumeOverTime: (opts: { before?: string; days?: number; fill_gaps?: boolean } = {}) => {
    const params: Record<string, string> = {}
    if (opts.before) params.before = opts.before
    if (opts.days) params.days = String(opts.days)
    if (opts.fill_gaps) params.fill_gaps = 'true'
    return get<{ results: any[]; next_cursor: string | null }>(`${P}/volume-over-time/`, params)
  },

  // Geography
  userDistribution:    (limit?: number) =>
    results(`${P}/geography/user-distribution/`, limit ? { limit: String(limit) } : {}),
  geographyByKyc:      () =>
    get<{ results: any[]; coverage: { users_with_kyc_geo: number; total_users: number } }>(
      `${P}/geography/user-distribution/by-kyc/`,
    ),

  // Cohort
  cohortMonthly:       (s?: string) => results(`${P}/cohort/monthly/`,          sd(s)),

  // Bank transfers
  bankTransfers:       (s?: string, byProvider?: boolean) =>
    results(`${P}/bank-transfers/monthly/`, { ...sd(s), ...(byProvider ? { by_provider: 'true' } : {}) }),

  // Platform health (flat object, no results wrapper)
  platformHealth:      () => get<Record<string, any>>(`${P}/health/overview/`),

  // Fraud + top users (dashboard right column)
  fraudAlerts:         () => get<{ total_alerts: number; range: string; high_pct: number; medium_pct: number; low_pct: number }>(`${P}/fraud/alerts/`),
  topUsers:            () => results(`${P}/users/top/`),

  // Notifications
  notificationsPreview: (segment: string, limit = 100, offset = 0) =>
    get<{ segment: string; total: number; results: any[] }>(
      `${P}/notifications/segments/preview/`,
      { segment, limit: String(limit), offset: String(offset) },
    ),
  notificationsSend: (body: {
    segment?: string
    wallet_addresses?: string[]
    title: string
    message: string
    type?: string
    channels: string[]
  }) =>
    post<{
      campaign_id: string
      recipients_resolved: number
      devices_targeted: number
      delivered: number
      pruned_stale_tokens: number
      in_app_created: number
    }>(`${P}/notifications/send/`, body),
} as const

export { hasMock }
