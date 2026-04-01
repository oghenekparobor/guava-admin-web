// Guava Admin API client
// Set VITE_API_BASE_URL in .env.local to connect to a live backend.
// In development the Vite proxy forwards /account/* requests to avoid CORS issues.
// In production, requests go directly to VITE_API_BASE_URL.

const BASE = ''

const HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  'X-App-ID': 'com.example.app',
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : ''
  const res = await fetch(BASE + path + qs, { headers: HEADERS })
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
  return res.json() as Promise<T>
}

// Most endpoints return { results: [...] }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function results(path: string, params: Record<string, string> = {}): Promise<any[]> {
  const body = await get<{ results: unknown[] }>(path, params)
  return body.results as any[]
}

const sd = (startDate?: string): Record<string, string> =>
  startDate ? { start_date: startDate } : {}

// ── Endpoints (all prefixed /account/admin-details/) ─────────────────────────

export const api = {
  // User growth
  weeklyUserGrowth:    (s?: string) => results('/account/admin-details/user-growth/weekly/',         sd(s)),
  monthlyUserGrowth:   (s?: string) => results('/account/admin-details/user-growth/monthly/',        sd(s)),
  quarterlyUserGrowth: (s?: string) => results('/account/admin-details/user-growth/quarterly/',      sd(s)),

  // Revenue
  monthlyRevenue:      (s?: string) => results('/account/admin-details/revenue/monthly/',            sd(s)),
  quarterlyRevenue:    (s?: string) => results('/account/admin-details/revenue/quarterly/',          sd(s)),
  annualRevenue:       (s?: string) => results('/account/admin-details/revenue/annual/',             sd(s)),
  weeklyRevenueGrowth: (s?: string) => results('/account/admin-details/revenue/weekly-growth/',      sd(s)),
  revenueByCurrency:   (s?: string) => results('/account/admin-details/revenue/by-currency/',        sd(s)),

  // Deposits
  monthlyDeposits:     (s?: string) => results('/account/admin-details/deposits/monthly/',           sd(s)),

  // Engagement
  mau:                 (s?: string) => results('/account/admin-details/engagement/mau/',             sd(s)),
  retention:           (s?: string) => results('/account/admin-details/engagement/retention/',       sd(s)),

  // KYC
  kycMonthlyStats:     (s?: string) => results('/account/admin-details/kyc/monthly-stats/',          sd(s)),
  kycStatusDist:       ()           => results('/account/admin-details/kyc/status-distribution/'),

  // Transactions
  transactionTypes:    (s?: string) => results('/account/admin-details/transaction-types/monthly/', sd(s)),
  monthlyVolume:       (s?: string) => results('/account/admin-details/monthly-category-volume/',   sd(s)),
  categoryComparison:  (s?: string) => results('/account/admin-details/category-comparative/',      sd(s)),
  sourceAnalysis:      (s?: string) => results('/account/admin-details/type-source-analysis/',      sd(s)),
  volumeOverTime:      (s?: string) => results('/account/admin-details/volume-over-time/',          sd(s)),

  // Geography
  userDistribution:    ()           => results('/account/admin-details/geography/user-distribution/'),

  // Cohort
  cohortMonthly:       (s?: string) => results('/account/admin-details/cohort/monthly/',            sd(s)),

  // Bank transfers
  bankTransfers:       (s?: string) => results('/account/admin-details/bank-transfers/monthly/',    sd(s)),

  // Platform health (no results wrapper)
  platformHealth:      ()           => get<Record<string, number>>('/account/admin-details/health/overview/'),
} as const
