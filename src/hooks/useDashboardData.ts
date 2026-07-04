/**
 * All dashboard data hooks.
 *
 * Every hook fetches from the live backend via the api layer (src/lib/api.ts).
 * There is no mock data: a failed request leaves the hook in its error state so
 * the page can surface it, rather than showing fabricated numbers.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api'
import { shortMonth } from '../lib/utils'

// True when a backend base URL is configured; pages show NoApiState otherwise.
export const HAS_API = Boolean(import.meta.env.VITE_API_BASE_URL)

// ── Base hook ─────────────────────────────────────────────────────────────────

function useData<T>(
  fetcher: () => Promise<T>,
  empty: T,
): { data: T; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData]       = useState<T>(empty)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const mounted               = useRef(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      if (mounted.current) setData(result)
    } catch (e) {
      if (mounted.current) {
        setError(e instanceof Error ? e.message : 'Request failed')
      }
    } finally {
      if (mounted.current) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mounted.current = true
    load()
    return () => { mounted.current = false }
  }, [load])

  return { data, loading, error, refetch: load }
}

// ── Label helpers ─────────────────────────────────────────────────────────────
//
// The backend returns rows newest-first. We normalize every date series to
// ascending (chronological) order here so the ordering is deterministic:
// time-series charts read it directly (oldest → newest, left → right), and
// tables call `.reverse()` to present most-recent-first.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function byKeyAsc(items: any[], key: (i: any) => string): any[] {
  return [...items].sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withMonthLabel(items: any[]): any[] {
  // month is "YYYY-MM" — lexical sort is chronological.
  return byKeyAsc(items, (i) => String(i.month)).map((i: any) => ({ ...i, label: shortMonth(i.month) }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withWeekLabel(items: any[]): any[] {
  // week_start is an ISO date — lexical sort is chronological.
  return byKeyAsc(items, (i) => String(i.week_start)).map((i: any) => {
    const d = new Date(i.week_start)
    return { ...i, label: `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}` }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withQuarterLabel(items: any[]): any[] {
  // quarter is "YYYY-Q#" — lexical sort is chronological.
  return byKeyAsc(items, (i) => String(i.quarter)).map((i: any) => ({ ...i, label: String(i.quarter).replace('-', ' ') }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EMPTY: any[] = []

// ── User Growth ───────────────────────────────────────────────────────────────

export function useWeeklyUserGrowth() {
  return useData(async () => withWeekLabel(await api.weeklyUserGrowth()), EMPTY)
}
export function useMonthlyUserGrowth() {
  return useData(async () => withMonthLabel(await api.monthlyUserGrowth()), EMPTY)
}
export function useQuarterlyUserGrowth() {
  return useData(async () => withQuarterLabel(await api.quarterlyUserGrowth()), EMPTY)
}

/** Derived: running total from monthly user growth. */
export function useCumulativeUsers() {
  const { data: monthly, loading, error } = useMonthlyUserGrowth()
  let total = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = monthly.map((m: any) => { total += m.new_users ?? 0; return { ...m, total } })
  return { data, loading, error }
}

// ── Revenue ───────────────────────────────────────────────────────────────────

export function useMonthlyRevenue() {
  return useData(async () => withMonthLabel(await api.monthlyRevenue()), EMPTY)
}
export function useQuarterlyRevenue() {
  return useData(async () => withQuarterLabel(await api.quarterlyRevenue()), EMPTY)
}
export function useAnnualRevenue() {
  return useData(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async () => byKeyAsc(await api.annualRevenue(), (i) => String(i.year)).map((i: any) => ({ ...i, label: String(i.year) })),
    EMPTY,
  )
}
export function useWeeklyRevenue() {
  return useData(async () => withWeekLabel(await api.weeklyRevenueGrowth()), EMPTY)
}
export function useRevenueByCurrency() {
  return useData(() => api.revenueByCurrency(), EMPTY)
}

/** Derived: MRR/ARR/QRR/WRR calculated from live monthly + weekly revenue. */
export function useRunRates() {
  const { data: monthly, loading, error } = useMonthlyRevenue()
  const { data: weekly }                  = useWeeklyRevenue()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latest     = monthly[monthly.length - 1] as any ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prev       = monthly[monthly.length - 2] as any ?? null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestWeek = weekly[weekly.length - 1] as any ?? null

  const mrr   = Number(latest?.total_revenue)  || 0
  const prevMrr = Number(prev?.total_revenue)  || 0
  const wkr   = Number(latestWeek?.weekly_revenue) || (mrr / 4.345)
  const mvrr  = Number(latest?.total_volume)   || 0

  const data = {
    mrr, arr: mrr * 12, qrr: mrr * 3, wrr: wkr * 52,
    mvrr, avrr: mvrr * 12,
    prev_mrr: prevMrr,
    mrr_growth: prevMrr > 0 ? ((mrr - prevMrr) / prevMrr) * 100 : 0,
  }
  return { data, loading, error }
}

// ── Deposits ──────────────────────────────────────────────────────────────────

export function useMonthlyDeposits() {
  return useData(async () => withMonthLabel(await api.monthlyDeposits()), EMPTY)
}

// ── Engagement ────────────────────────────────────────────────────────────────

export function useMAU() {
  return useData(async () => withMonthLabel(await api.mau()), EMPTY)
}
export function useRetention() {
  return useData(async () => withMonthLabel(await api.retention()), EMPTY)
}

// ── KYC ───────────────────────────────────────────────────────────────────────

export function useKYCMonthlyStats() {
  return useData(async () => withMonthLabel(await api.kycMonthlyStats()), EMPTY)
}
export function useKYCStatusDist() {
  return useData(() => api.kycStatusDist(), EMPTY)
}

// ── Transactions ──────────────────────────────────────────────────────────────

export function useTransactionTypes() {
  return useData(async () => withMonthLabel(await api.transactionTypes()), EMPTY)
}
export function useMonthlyVolume() {
  // The endpoint returns `transaction_month` (ISO) + `monthly_*` metrics; the UI
  // works in canonical `month` / `transaction_count` / `total_volume` terms.
  return useData(async () => withMonthLabel((await api.monthlyVolume()).map((r: any) => ({
    ...r,
    month: r.month ?? String(r.transaction_month ?? '').slice(0, 7),
    transaction_count: r.transaction_count ?? r.monthly_transactions ?? 0,
    total_volume: r.total_volume ?? r.monthly_volume ?? 0,
    total_fees: r.total_fees ?? r.monthly_fees ?? 0,
    volume_growth_percentage: r.volume_growth_percentage ?? null,
  }))), EMPTY)
}
export function useVolumeOverTime() {
  return useData(async () => {
    const res = await api.volumeOverTime()
    return byKeyAsc(res.results ?? [], (i) => String(i.transaction_day)).map((i: any) => {
      const d = new Date(i.transaction_day)
      return { ...i, label: `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}` }
    })
  }, EMPTY)
}
export function useDepositsByChannel() {
  return useData(() => api.depositsByChannel(), EMPTY)
}
export type TopUsers = { rank_by: string; metric: string; window: string; results: any[] }
const EMPTY_TOP_USERS: TopUsers = { rank_by: '', metric: '', window: '', results: [] }
export function useTopUsers(
  opts: Parameters<typeof api.topUsers>[0] = { rank_by: 'usdc_volume', window: '30d', limit: 10 },
) {
  // Returns the response metadata (rank_by / metric / window) alongside the
  // rows so the UI can label the table with the window the API ACTUALLY
  // returned — not just the one we requested.
  return useData(async () => {
    const r = await api.topUsers(opts) as Record<string, any>
    return {
      rank_by: r.rank_by ?? '',
      metric: r.metric ?? r.rank_by ?? '',
      window: r.window ?? '',
      results: r.results ?? [],
    } as TopUsers
  }, EMPTY_TOP_USERS)
}
export function useCategoryComparison() {
  return useData(() => api.categoryComparison(), EMPTY)
}
export function useSourceAnalysis() {
  return useData(() => api.sourceAnalysis(), EMPTY)
}
export function useStatusAnalysis() {
  return useData(() => api.statusAnalysis(), EMPTY)
}
export function useUserCategoryAnalysis() {
  return useData(() => api.userCategoryAnalysis(), EMPTY)
}

// ── Transaction summary (window-driven) ─────────────────────────────────────────

export type TransactionsOverview = {
  window: string
  total_transactions: number
  transactions_growth_percentage: number | null
  usdc_volume: number
  ngn_volume: number
  success_rate_percentage: number
  prior_success_rate_percentage: number | null
  by_status: Record<string, number>
  by_type: Record<string, number>
  in_flight: { count: number; oldest_hours: number; usdc_value: number; ngn_value: number }
  failed_value: { usdc: number; ngn: number }
  unique_senders: number
  avg_usdc_amount: number
}
const EMPTY_TX_OVERVIEW: TransactionsOverview = {
  window: '30d', total_transactions: 0, transactions_growth_percentage: null,
  usdc_volume: 0, ngn_volume: 0, success_rate_percentage: 0, prior_success_rate_percentage: null,
  by_status: {}, by_type: {},
  in_flight: { count: 0, oldest_hours: 0, usdc_value: 0, ngn_value: 0 },
  failed_value: { usdc: 0, ngn: 0 },
  unique_senders: 0, avg_usdc_amount: 0,
}
export function useTransactionsOverview(window: '30d' | '90d' | 'all' = '30d') {
  return useData(
    async () => ({ ...EMPTY_TX_OVERVIEW, ...(await api.transactionsOverview(window)) }),
    EMPTY_TX_OVERVIEW,
  )
}

// ── Geography ─────────────────────────────────────────────────────────────────

export function useGeography() {
  return useData(() => api.userDistribution(), EMPTY)
}

export type KycGeo = {
  results: { country: string; country_iso?: string; kyc_status?: string; user_count: number; percentage: number }[]
  coverage: { users_with_kyc_geo: number; total_users: number }
}
const EMPTY_KYC_GEO: KycGeo = { results: [], coverage: { users_with_kyc_geo: 0, total_users: 0 } }

export function useGeographyByKyc() {
  return useData(() => api.geographyByKyc() as Promise<KycGeo>, EMPTY_KYC_GEO)
}

// ── Cohort ────────────────────────────────────────────────────────────────────

export function useCohort() {
  return useData(
    async () => byKeyAsc(await api.cohortMonthly(), (i) => String(i.cohort)).map((i: any) => ({
      ...i,
      label: `${shortMonth(i.cohort)} ${String(i.cohort).slice(2, 4)}`,
    })),
    EMPTY,
  )
}

// ── Bank Transfers ────────────────────────────────────────────────────────────

export function useBankTransfers() {
  return useData(async () => withMonthLabel(await api.bankTransfers()), EMPTY)
}

// ── Platform Health (GET /health/overview/ — last-30-days summary) ──────────────

export type PlatformHealth = {
  new_users_30d: number; new_users_growth_percentage: number | null
  active_users_30d: number; active_users_growth_percentage: number | null
  transactions_30d: number; transactions_growth_percentage: number | null
  revenue_30d: number; revenue_growth_percentage: number | null
  kyc_submissions_30d: number; deposits_30d: number
  deposit_volume_30d_by_currency: Record<string, number>
}

const EMPTY_HEALTH: PlatformHealth = {
  new_users_30d: 0, new_users_growth_percentage: null,
  active_users_30d: 0, active_users_growth_percentage: null,
  transactions_30d: 0, transactions_growth_percentage: null,
  revenue_30d: 0, revenue_growth_percentage: null,
  kyc_submissions_30d: 0, deposits_30d: 0,
  deposit_volume_30d_by_currency: {},
}

export function usePlatformHealth() {
  return useData(
    async () => {
      const h = await api.platformHealth() as Record<string, any>
      return {
        new_users_30d:                 h.new_users_30d                 ?? 0,
        new_users_growth_percentage:   h.new_users_growth_percentage   ?? null,
        active_users_30d:              h.active_users_30d              ?? 0,
        active_users_growth_percentage: h.active_users_growth_percentage ?? null,
        transactions_30d:              h.transactions_30d              ?? 0,
        transactions_growth_percentage: h.transactions_growth_percentage ?? null,
        revenue_30d:                   h.revenue_30d                   ?? 0,
        revenue_growth_percentage:     h.revenue_growth_percentage     ?? null,
        kyc_submissions_30d:           h.kyc_submissions_30d           ?? 0,
        deposits_30d:                  h.deposits_30d                  ?? 0,
        deposit_volume_30d_by_currency: h.deposit_volume_30d_by_currency ?? {},
      } as PlatformHealth
    },
    EMPTY_HEALTH,
  )
}

// ── Lifetime stats (GET /stats/lifetime/ — all-time totals) ─────────────────────
//
// The endpoint returns a nested payload (users/transactions/volume/… objects);
// we flatten it into convenient top-level numbers for the cards. `volume` and
// `revenue` are the USDC totals; NGN volume is kept alongside.
export type LifetimeStats = {
  as_of: string
  first_transaction_at: string | null
  users: number
  users_verified: number
  users_with_transactions: number
  transactions: number
  transactions_completed: number
  success_rate_percentage: number
  volume: number          // USDC
  volume_ngn: number
  revenue: number         // USDC
  avg_revenue_per_transaction: number
  deposits: number
  deposits_by_currency: Record<string, number>
  businesses: number
  businesses_verified: number
}
const EMPTY_LIFETIME: LifetimeStats = {
  as_of: '', first_transaction_at: null,
  users: 0, users_verified: 0, users_with_transactions: 0,
  transactions: 0, transactions_completed: 0, success_rate_percentage: 0,
  volume: 0, volume_ngn: 0, revenue: 0, avg_revenue_per_transaction: 0,
  deposits: 0, deposits_by_currency: {}, businesses: 0, businesses_verified: 0,
}
export function useLifetimeStats() {
  return useData(
    async () => {
      const r = await api.lifetimeStats() as Record<string, any>
      return {
        as_of: r.as_of ?? '',
        first_transaction_at: r.first_transaction_at ?? null,
        users: r.users?.total ?? 0,
        users_verified: r.users?.verified ?? 0,
        users_with_transactions: r.users?.with_transactions ?? 0,
        transactions: r.transactions?.total ?? 0,
        transactions_completed: r.transactions?.completed ?? 0,
        success_rate_percentage: r.transactions?.success_rate_percentage ?? 0,
        volume: r.volume?.usdc_total ?? 0,
        volume_ngn: r.volume?.ngn_total ?? 0,
        revenue: r.revenue?.usdc_total ?? 0,
        avg_revenue_per_transaction: r.revenue?.avg_per_transaction ?? 0,
        deposits: r.deposits?.total_count ?? 0,
        deposits_by_currency: r.deposits?.by_currency ?? {},
        businesses: r.businesses?.total ?? 0,
        businesses_verified: r.businesses?.verified ?? 0,
      } as LifetimeStats
    },
    EMPTY_LIFETIME,
  )
}

// ── System health (GET /health/system/ — heartbeat overview) ────────────────────

export type Heartbeat = {
  service: string; status: string; configured_status: string
  is_stale: boolean; last_seen_at: string | null; details: string
}
export type SystemHealth = {
  overall_status: string; stale_minutes: number; database: string; heartbeats: Heartbeat[]
}
const EMPTY_SYSTEM: SystemHealth = {
  overall_status: 'unknown', stale_minutes: 0, database: 'unknown', heartbeats: [],
}
export function useSystemHealth(staleMinutes?: number) {
  return useData(
    async () => ({ ...EMPTY_SYSTEM, ...(await api.systemHealth(staleMinutes)) }) as SystemHealth,
    EMPTY_SYSTEM,
  )
}
