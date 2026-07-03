/**
 * All dashboard data hooks.
 *
 * The api layer (src/lib/api.ts) falls back to spec-shaped mocks per endpoint,
 * so hooks always resolve to data — real when the backend is reachable, mock
 * otherwise. `HAS_API` stays exported (true) so pages keep their guard call
 * sites, but the dashboard always renders.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api'
import { shortMonth } from '../lib/utils'

// Data is always available (mock fallback), so pages never show NoApiState.
export const HAS_API = true

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withMonthLabel(items: any[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return items.map((i: any) => ({ ...i, label: shortMonth(i.month) }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withWeekLabel(items: any[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return items.map((i: any) => {
    const d = new Date(i.week_start)
    return { ...i, label: `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}` }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withQuarterLabel(items: any[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return items.map((i: any) => ({ ...i, label: String(i.quarter).replace('-', ' ') }))
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
    async () => (await api.annualRevenue()).map((i: any) => ({ ...i, label: String(i.year) })),
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
  return useData(async () => withMonthLabel(await api.monthlyVolume()), EMPTY)
}
export function useVolumeOverTime() {
  return useData(async () => {
    const res = await api.volumeOverTime()
    return (res.results ?? []).map((i: any) => {
      const d = new Date(i.transaction_day)
      return { ...i, label: `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}` }
    })
  }, EMPTY)
}
export function useDepositsByChannel() {
  return useData(() => api.depositsByChannel(), EMPTY)
}
export function useTopUsers() {
  return useData(() => api.topUsers(), EMPTY)
}

export type FraudAlerts = {
  total_alerts: number; range: string; high_pct: number; medium_pct: number; low_pct: number
}
const EMPTY_FRAUD: FraudAlerts = { total_alerts: 0, range: '', high_pct: 0, medium_pct: 0, low_pct: 0 }
export function useFraudAlerts() {
  return useData(() => api.fraudAlerts() as Promise<FraudAlerts>, EMPTY_FRAUD)
}
export function useCategoryComparison() {
  return useData(() => api.categoryComparison(), EMPTY)
}
export function useSourceAnalysis() {
  return useData(() => api.sourceAnalysis(), EMPTY)
}

// ── Geography ─────────────────────────────────────────────────────────────────

export function useGeography() {
  return useData(() => api.userDistribution(), EMPTY)
}

export type KycGeo = {
  results: { country: string; user_count: number; percentage: number }[]
  coverage: { users_with_kyc_geo: number; total_users: number }
}
const EMPTY_KYC_GEO: KycGeo = { results: [], coverage: { users_with_kyc_geo: 0, total_users: 0 } }

export function useGeographyByKyc() {
  return useData(() => api.geographyByKyc() as Promise<KycGeo>, EMPTY_KYC_GEO)
}

// ── Cohort ────────────────────────────────────────────────────────────────────

export function useCohort() {
  return useData(
    async () => (await api.cohortMonthly()).map((i: any) => ({
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

// ── Platform Health ───────────────────────────────────────────────────────────

export type PlatformHealth = {
  new_users_30d: number; active_users_30d: number; transactions_30d: number
  revenue_30d: number; kyc_submissions_30d: number; deposits_30d: number
  deposit_volume_30d_by_currency: Record<string, number>
  uptime_percentage: number; error_rate: number
  total_users: number; total_volume: number; total_revenue: number; total_transactions: number
}

const EMPTY_HEALTH: PlatformHealth = {
  new_users_30d: 0, active_users_30d: 0, transactions_30d: 0,
  revenue_30d: 0, kyc_submissions_30d: 0, deposits_30d: 0,
  deposit_volume_30d_by_currency: {},
  uptime_percentage: 0, error_rate: 0,
  total_users: 0, total_volume: 0, total_revenue: 0, total_transactions: 0,
}

export function usePlatformHealth() {
  return useData(
    async () => {
      const h = await api.platformHealth() as Record<string, any>
      return {
        new_users_30d:       h.new_users_30d       ?? 0,
        active_users_30d:    h.active_users_30d    ?? 0,
        transactions_30d:    h.transactions_30d    ?? 0,
        revenue_30d:         h.revenue_30d         ?? 0,
        kyc_submissions_30d: h.kyc_submissions_30d ?? 0,
        deposits_30d:        h.deposits_30d        ?? 0,
        deposit_volume_30d_by_currency: h.deposit_volume_30d_by_currency ?? {},
        uptime_percentage:   h.uptime_percentage   ?? 0,
        error_rate:          h.error_rate          ?? 0,
        total_users:         h.total_users         ?? 0,
        total_volume:        h.total_volume        ?? 0,
        total_revenue:       h.total_revenue       ?? 0,
        total_transactions:  h.total_transactions  ?? 0,
      } as PlatformHealth
    },
    EMPTY_HEALTH,
  )
}
