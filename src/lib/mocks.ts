/**
 * Spec-shaped mock data for the admin-analytics overhaul.
 *
 * Used by `api.ts` as a per-endpoint fallback: the client tries the real
 * endpoint first and falls back to the matching mock here on 404 / network
 * error, or serves mocks directly when no VITE_API_BASE_URL is configured.
 * Every shape mirrors the "Expected output" blocks in the overhaul spec so the
 * UI can be built ahead of the backend.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Date helpers (relative to "now" so charts look live) ────────────────────
function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthsBack(n: number): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) out.push(ym(new Date(now.getFullYear(), now.getMonth() - i, 1)))
  return out
}
function weeksBack(n: number): string[] {
  const out: string[] = []
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((day + 6) % 7))
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(monday)
    d.setDate(monday.getDate() - i * 7)
    out.push(d.toISOString().slice(0, 10) + 'T00:00:00Z')
  }
  return out
}
function daysBack(n: number): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    out.push(d.toISOString().slice(0, 10) + 'T00:00:00Z')
  }
  return out
}
const rnd = (seed: number) => {
  // deterministic pseudo-random in [0,1) so mock output is stable per index
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}
const growth = (curr: number, prev: number): number | null =>
  prev > 0 ? Number((((curr - prev) / prev) * 100).toFixed(2)) : null

// ── User growth ─────────────────────────────────────────────────────────────
function userGrowthMonthly() {
  const months = monthsBack(12)
  const results = months.map((month, i) => {
    const prev = 8 + Math.round(rnd(i + 1) * 20)
    const curr = 8 + Math.round(rnd(i + 2) * 22)
    return {
      month,
      new_users: curr,
      prev_month_users: prev,
      growth_rate_percentage: growth(curr, prev),
      is_partial: i === months.length - 1,
    }
  })
  return { results }
}
function userGrowthWeekly() {
  const weeks = weeksBack(26)
  const results = weeks.map((week_start, i) => {
    const prev = 5 + Math.round(rnd(i + 3) * 12)
    const curr = 5 + Math.round(rnd(i + 4) * 14)
    return {
      week_start,
      new_users: curr,
      prev_week_users: prev,
      growth_rate_percentage: growth(curr, prev),
      is_partial: i === weeks.length - 1,
    }
  })
  return { results }
}
function userGrowthQuarterly() {
  const now = new Date()
  const results = Array.from({ length: 8 }, (_, k) => {
    const i = 7 - k
    const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1)
    const q = Math.floor(d.getMonth() / 3) + 1
    const prev = 20 + Math.round(rnd(i + 5) * 40)
    const curr = 20 + Math.round(rnd(i + 6) * 45)
    return {
      quarter: `${d.getFullYear()}-Q${q}`,
      new_users: curr,
      prev_quarter_users: prev,
      growth_rate_percentage: growth(curr, prev),
      is_partial: k === 7,
    }
  })
  return { results }
}

// ── Revenue (unified superset across grains) ────────────────────────────────
function revenueRow(period: Record<string, string>, i: number, isPartial: boolean) {
  const txns = 60 + Math.round(rnd(i + 10) * 80)
  const volume = Number((300 + rnd(i + 11) * 900).toFixed(2))
  const fiat = Number((400000 + rnd(i + 12) * 900000).toFixed(2))
  const revenue = Number((0.8 + rnd(i + 13) * 3).toFixed(2))
  const active = 8 + Math.round(rnd(i + 14) * 18)
  return {
    ...period,
    total_transactions: txns,
    total_volume: volume,
    fiat_volume_ngn: fiat,
    total_revenue: revenue,
    avg_transaction_amount: Number((volume / txns).toFixed(2)),
    active_users: active,
    revenue_per_user: Number((revenue / active).toFixed(2)),
    avg_fee_per_transaction: Number((revenue / txns).toFixed(2)),
    is_partial: isPartial,
  }
}
function revenueMonthly() {
  const months = monthsBack(12)
  return { results: months.map((month, i) => revenueRow({ month }, i, i === months.length - 1)) }
}
function revenueQuarterly() {
  const now = new Date()
  const results = Array.from({ length: 8 }, (_, k) => {
    const i = 7 - k
    const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1)
    const q = Math.floor(d.getMonth() / 3) + 1
    return revenueRow({ quarter: `${d.getFullYear()}-Q${q}` }, i + 30, k === 7)
  })
  return { results }
}
function revenueAnnual() {
  const y = new Date().getFullYear()
  const results = [y - 2, y - 1, y].map((year, i) =>
    revenueRow({ year: String(year) }, i + 60, year === y),
  )
  return { results }
}
function revenueWeeklyGrowth() {
  const weeks = weeksBack(12)
  const results = weeks.map((week_start, i) => {
    const count = 8 + Math.round(rnd(i + 20) * 12)
    const rev = Number((0.2 + rnd(i + 21) * 0.6).toFixed(2))
    const prev = Number((0.2 + rnd(i + 20) * 0.6).toFixed(2))
    return {
      week_start,
      transaction_count: count,
      weekly_revenue: rev,
      prev_week_revenue: prev,
      revenue_growth_percentage: growth(rev, prev),
      is_partial: i === weeks.length - 1,
    }
  })
  return { results }
}
function revenueByCurrency() {
  const months = monthsBack(6)
  const results: any[] = []
  months.forEach((month, i) => {
    results.push({ month, currency: 'NGN', transaction_count: 45 + Math.round(rnd(i + 40) * 20), total_volume: Number((800000 + rnd(i + 41) * 400000).toFixed(2)), total_revenue: Number((4 + rnd(i + 42) * 5).toFixed(2)) })
    results.push({ month, currency: 'USDC', transaction_count: 35 + Math.round(rnd(i + 43) * 20), total_volume: Number((400 + rnd(i + 44) * 500).toFixed(2)), total_revenue: Number((1 + rnd(i + 45) * 2).toFixed(2)) })
  })
  return { results }
}

// ── Deposits ────────────────────────────────────────────────────────────────
function depositsMonthly() {
  const months = monthsBack(6)
  const results: any[] = []
  months.forEach((month, i) => {
    const bridgeCount = 3 + Math.round(rnd(i + 50) * 5)
    const pajCount = 3 + Math.round(rnd(i + 51) * 5)
    results.push({
      month, channel: 'bridge_va', currency: 'USDC',
      total_deposits: bridgeCount, total_deposit_amount: Number((200 + rnd(i + 52) * 300).toFixed(2)),
      total_deposit_fees: 0.0, avg_deposit_amount: Number((40 + rnd(i + 53) * 40).toFixed(2)),
      unique_depositors: Math.max(1, bridgeCount - 2), successful_deposits: bridgeCount,
      success_rate_percentage: 100.0,
    })
    const pajSuccess = Math.max(1, pajCount - 1)
    results.push({
      month, channel: 'paj', currency: 'NGN',
      total_deposits: pajCount, total_deposit_amount: Number((2000 + rnd(i + 54) * 2000).toFixed(2)),
      total_deposit_fees: Number((60 + rnd(i + 55) * 40).toFixed(2)), avg_deposit_amount: Number((500 + rnd(i + 56) * 200).toFixed(2)),
      unique_depositors: Math.max(1, pajCount - 2), successful_deposits: pajSuccess,
      success_rate_percentage: Number(((pajSuccess / pajCount) * 100).toFixed(2)),
    })
  })
  return { results }
}
function depositsByChannel() {
  return {
    results: [
      { channel: 'bridge_va', currency: 'USDC', total_count: 20, total_amount: 815.60, count_30d: 5, amount_30d: 302.60, success_rate_percentage: 90.91 },
      { channel: 'paj', currency: 'NGN', total_count: 34, total_amount: 21400.0, count_30d: 6, amount_30d: 3600.0, success_rate_percentage: 82.35 },
    ],
  }
}

// ── Engagement ──────────────────────────────────────────────────────────────
function mau() {
  const months = monthsBack(12)
  return {
    results: months.map((month, i) => {
      const users = 8 + Math.round(rnd(i + 70) * 14)
      const txns = users * (4 + Math.round(rnd(i + 71) * 5))
      return { month, monthly_active_users: users, total_transactions: txns, avg_transactions_per_user: Number((txns / users).toFixed(2)) }
    }),
  }
}
function retention() {
  const months = monthsBack(12)
  return {
    results: months.map((month, i) => {
      const prev = 8 + Math.round(rnd(i + 80) * 12)
      const retained = Math.round(prev * (0.4 + rnd(i + 81) * 0.4))
      return { month, prev_month_users: prev, retained_users: retained, retention_rate_percentage: Number(((retained / prev) * 100).toFixed(2)) }
    }),
  }
}

// ── KYC ─────────────────────────────────────────────────────────────────────
function kycMonthlyStats() {
  const months = monthsBack(12)
  return {
    results: months.map((month, i) => {
      const total = 4 + Math.round(rnd(i + 90) * 14)
      const approved = Math.round(total * (0.5 + rnd(i + 91) * 0.35))
      const pending = Math.round(rnd(i + 94) * 3)
      const rejected = Math.max(0, total - approved - pending)
      const decided = approved + rejected
      return {
        month, total_verifications: total, approved, rejected, pending,
        approval_rate_percentage: decided ? Number(((approved / decided) * 100).toFixed(2)) : 0,
        countries_served: 1 + Math.round(rnd(i + 92) * 3),
        countries_unknown: Math.round(rnd(i + 93) * 2),
      }
    }),
  }
}
function kycStatusDist() {
  return {
    results: [
      { kyc_status: 'not-started', user_count: 695, percentage: 92.18 },
      { kyc_status: 'pending', user_count: 0, percentage: 0.0 },
      { kyc_status: 'verified', user_count: 52, percentage: 6.90 },
      { kyc_status: 'failed', user_count: 7, percentage: 0.93 },
    ],
  }
}

// ── Transactions / categories ───────────────────────────────────────────────
function transactionTypes() {
  const months = monthsBack(6)
  const results: any[] = []
  months.forEach((month, i) => {
    const wallet = 30 + Math.round(rnd(i + 100) * 20)
    const bank = 40 + Math.round(rnd(i + 101) * 20)
    const dep = 5 + Math.round(rnd(i + 102) * 6)
    const total = wallet + bank + dep
    results.push({ month, transaction_type: 'wallet', denomination: 'USDC', transaction_count: wallet, total_volume: Number((300 + rnd(i + 103) * 400).toFixed(2)), transaction_type_percentage: Number(((wallet / total) * 100).toFixed(2)) })
    results.push({ month, transaction_type: 'bank', denomination: 'NGN', transaction_count: bank, total_volume: Number((800000 + rnd(i + 104) * 300000).toFixed(2)), transaction_type_percentage: Number(((bank / total) * 100).toFixed(2)) })
    results.push({ month, transaction_type: 'deposit', denomination: 'USDC', transaction_count: dep, total_volume: Number((200 + rnd(i + 105) * 200).toFixed(2)), transaction_type_percentage: Number(((dep / total) * 100).toFixed(2)) })
  })
  return { results }
}
function monthlyCategoryVolume() {
  const months = monthsBack(6)
  const results: any[] = []
  months.forEach((month, i) => {
    results.push({ month, transaction_category: 'WALLET', denomination: 'USDC', transaction_count: 30 + Math.round(rnd(i + 110) * 20), total_volume: Number((300 + rnd(i + 111) * 400).toFixed(2)), total_fees: Number((1 + rnd(i + 112) * 2).toFixed(2)) })
    results.push({ month, transaction_category: 'BANK', denomination: 'NGN', transaction_count: 40 + Math.round(rnd(i + 113) * 20), total_volume: Number((800000 + rnd(i + 114) * 300000).toFixed(2)), total_fees: Number((3 + rnd(i + 115) * 4).toFixed(2)) })
  })
  return { results }
}
function categoryComparative() {
  return {
    results: [
      { transaction_category: 'BANK', status: 'completed', denomination: 'NGN', transaction_count: 1191, total_volume: 23762964.52, total_fees: 242.54, avg_transaction_amount: 19952.11, status_percentage: 87.39 },
      { transaction_category: 'BANK', status: 'in_progress', denomination: 'NGN', transaction_count: 118, total_volume: 2100340.10, total_fees: 21.30, avg_transaction_amount: 17799.49, status_percentage: 8.66 },
      { transaction_category: 'BANK', status: 'failed', denomination: 'NGN', transaction_count: 54, total_volume: 980220.00, total_fees: 0.0, avg_transaction_amount: 18152.22, status_percentage: 3.96 },
      { transaction_category: 'WALLET', status: 'completed', denomination: 'USDC', transaction_count: 402, total_volume: 6421.88, total_fees: 17.42, avg_transaction_amount: 15.98, status_percentage: 92.20 },
      { transaction_category: 'WALLET', status: 'in_progress', denomination: 'USDC', transaction_count: 34, total_volume: 512.10, total_fees: 0.0, avg_transaction_amount: 15.06, status_percentage: 7.80 },
    ],
  }
}
function typeSourceAnalysis() {
  return {
    results: [
      { transaction_type: 'wallet', source: 'app', denomination: 'USDC', transaction_count: 402, total_volume: 6421.88 },
      { transaction_type: 'bank', source: 'app', denomination: 'NGN', transaction_count: 1191, total_volume: 23762964.52 },
      { transaction_type: 'deposit', source: 'paj', denomination: 'NGN', transaction_count: 34, total_volume: 21400.0 },
      { transaction_type: 'deposit', source: 'bridge', denomination: 'USDC', transaction_count: 20, total_volume: 815.60 },
    ],
  }
}
function volumeOverTime() {
  const days = daysBack(90)
  const results = days.map((transaction_day, i) => {
    const count = 2 + Math.round(rnd(i + 120) * 8)
    const usdc = Number((10 + rnd(i + 121) * 60).toFixed(2))
    const ngn = Number((500 + rnd(i + 122) * 2000).toFixed(2))
    const prevCount = 2 + Math.round(rnd(i + 119) * 8)
    const prevUsdc = Number((10 + rnd(i + 120) * 60).toFixed(2))
    return {
      transaction_day, daily_transaction_count: count,
      usdc_volume: usdc, ngn_volume: ngn,
      avg_usdc_amount: Number((usdc / count).toFixed(2)),
      transaction_count_growth_percentage: growth(count, prevCount),
      usdc_volume_growth_percentage: prevUsdc > 0.005 ? growth(usdc, prevUsdc) : null,
    }
  })
  const first = days[0].slice(0, 10)
  const d = new Date(first); d.setDate(d.getDate() - 1)
  return { results, next_cursor: d.toISOString().slice(0, 10) }
}

// ── Geography ───────────────────────────────────────────────────────────────
function geoCurrency() {
  const rows = [
    { currency_code: 'NGN', user_count: 257, verified_users: 48 },
    { currency_code: 'USD', user_count: 190, verified_users: 20 },
    { currency_code: 'KES', user_count: 96, verified_users: 6 },
    { currency_code: 'GHS', user_count: 74, verified_users: 3 },
    { currency_code: 'ZAR', user_count: 40, verified_users: 2 },
    { currency_code: 'OTHER', user_count: 71, verified_users: 0 },
    { currency_code: 'UNKNOWN', user_count: 26, verified_users: 0 },
  ]
  const total = rows.reduce((s, r) => s + r.user_count, 0)
  return {
    results: rows.map((r) => ({
      ...r,
      percentage: Number(((r.user_count / total) * 100).toFixed(2)),
      verified_percentage: r.user_count ? Number(((r.verified_users / r.user_count) * 100).toFixed(2)) : 0.0,
    })),
  }
}
function geoByKyc() {
  const rows = [
    { country: 'NG', user_count: 51 },
    { country: 'KE', user_count: 1 },
  ]
  const withKyc = rows.reduce((s, r) => s + r.user_count, 0)
  return {
    results: rows.map((r) => ({ ...r, percentage: Number(((r.user_count / withKyc) * 100).toFixed(2)) })),
    coverage: { users_with_kyc_geo: withKyc, total_users: 754 },
  }
}

// ── Cohort ──────────────────────────────────────────────────────────────────
function cohortMonthly() {
  const months = monthsBack(10)
  return {
    results: months.map((cohort, i) => {
      const age = months.length - i
      const size = 20 + Math.round(rnd(i + 130) * 40)
      const active = i < months.length - 1 ? Math.round(size * (0.2 + rnd(i + 131) * 0.4)) : 0
      const revenue = Number((active * (rnd(i + 132) * 2)).toFixed(2))
      return {
        cohort, cohort_size: size, active_users: active, total_revenue: revenue,
        avg_revenue_per_user: size ? Number((revenue / size).toFixed(2)) : 0.0,
        avg_revenue_per_active_month: age ? Number((revenue / size / age).toFixed(2)) : 0.0,
        cohort_age_months: age,
      }
    }),
  }
}

// ── Bank transfers ──────────────────────────────────────────────────────────
function bankTransfers() {
  const months = monthsBack(12)
  return {
    results: months.map((month, i) => {
      const count = 30 + Math.round(rnd(i + 140) * 50)
      const success = Math.round(count * (0.6 + rnd(i + 141) * 0.3))
      return {
        month, country: 'NG', transfer_count: count,
        total_amount: Number((600000 + rnd(i + 142) * 900000).toFixed(2)),
        successful_transfers: success,
        success_rate_percentage: Number(((success / count) * 100).toFixed(2)),
      }
    }),
  }
}

// ── Health ──────────────────────────────────────────────────────────────────
function healthOverview() {
  return {
    new_users_30d: 59, active_users_30d: 13, transactions_30d: 96, revenue_30d: 2.1,
    kyc_submissions_30d: 17, deposits_30d: 5,
    deposit_volume_30d_by_currency: { USDC: 302.60, NGN: 3600.0 },
    uptime_percentage: 99.98, error_rate: 0.02,
    total_users: 754, total_volume: 30184.45, total_revenue: 261.30, total_transactions: 2087,
  }
}

// ── Notifications ───────────────────────────────────────────────────────────
const SEGMENT_TOTALS: Record<string, number> = {
  'all': 754, 'kyc:not-started': 695, 'kyc:pending': 0, 'kyc:verified': 52,
  'kyc:failed': 7, 'active-30d': 13, 'dormant-90d': 512,
}
function notificationsPreview(params: Record<string, string>) {
  const segment = params.segment || 'all'
  const limit = Number(params.limit ?? 100)
  const total = SEGMENT_TOTALS[segment] ?? (segment.startsWith('currency:') ? 190 : 120)
  const n = Math.min(limit, total)
  const statuses = ['not-started', 'pending', 'verified', 'failed']
  const results = Array.from({ length: n }, (_, i) => ({
    wallet_address: `${['7xKX', '9aLm', 'Bd3Q', 'Fk8Z', 'Hn2R'][i % 5]}…${['gAsU', 'p2Vt', 'x9Kd', 'mB4e', 'Ln7c'][i % 5]}`,
    username: ['chidi', 'amara', 'kwame', 'zainab', 'tunde', null][i % 6],
    kyc_status: segment.startsWith('kyc:') ? segment.split(':')[1] : statuses[i % 4],
    email: i % 3 === 0 ? `user${i}@example.com` : null,
    device_count: 1 + (i % 3),
  }))
  return { segment, total, results }
}
function notificationsSend(body: any) {
  const resolved = body?.wallet_addresses?.length ?? (SEGMENT_TOTALS[body?.segment] ?? 100)
  const devices = Math.round(resolved * 1.15)
  const pruned = Math.round(devices * 0.02)
  const inApp = (body?.channels ?? []).includes('in_app') ? resolved : 0
  return {
    campaign_id: 'camp_' + Math.random().toString(16).slice(2, 10),
    recipients_resolved: resolved,
    devices_targeted: devices,
    delivered: devices - pruned,
    pruned_stale_tokens: pruned,
    in_app_created: inApp,
  }
}

// ── Fraud alerts + Top users ────────────────────────────────────────────────
function fraudAlerts() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3)
  const fmt = (d: Date) => `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`
  return {
    total_alerts: 4,
    range: `${fmt(start)} - ${fmt(now)}`,
    high_pct: 3,
    medium_pct: 15,
    low_pct: 77,
  }
}
function topUsers() {
  const names = ['chidiogo', 'amara.k', 'kwame_b', 'zainab99', 'tunde.o', 'lerato']
  const rows = names.map((name, i) => {
    const txns = 9500 - i * 900 - Math.round(rnd(i + 200) * 300)
    const revenue = Number((90 - i * 8 - rnd(i + 201) * 4).toFixed(2))
    return { name, transaction_count: txns, revenue }
  })
  const total = rows.reduce((s, r) => s + r.revenue, 0)
  return {
    results: rows.map((r, i) => ({
      rank: i + 1,
      ...r,
      pct: Number(((r.revenue / total) * 100).toFixed(0)),
    })),
  }
}

// ── Registry ────────────────────────────────────────────────────────────────
type MockFn = (params: Record<string, string>, body?: any) => any

const MOCKS: Record<string, MockFn> = {
  '/account/admin-details/user-growth/weekly/': userGrowthWeekly,
  '/account/admin-details/user-growth/monthly/': userGrowthMonthly,
  '/account/admin-details/user-growth/quarterly/': userGrowthQuarterly,
  '/account/admin-details/revenue/monthly/': revenueMonthly,
  '/account/admin-details/revenue/quarterly/': revenueQuarterly,
  '/account/admin-details/revenue/annual/': revenueAnnual,
  '/account/admin-details/revenue/weekly-growth/': revenueWeeklyGrowth,
  '/account/admin-details/revenue/by-currency/': revenueByCurrency,
  '/account/admin-details/deposits/monthly/': depositsMonthly,
  '/account/admin-details/deposits/by-channel/': depositsByChannel,
  '/account/admin-details/engagement/mau/': mau,
  '/account/admin-details/engagement/retention/': retention,
  '/account/admin-details/kyc/monthly-stats/': kycMonthlyStats,
  '/account/admin-details/kyc/status-distribution/': kycStatusDist,
  '/account/admin-details/transaction-types/monthly/': transactionTypes,
  '/account/admin-details/monthly-category-volume/': monthlyCategoryVolume,
  '/account/admin-details/category-comparative/': categoryComparative,
  '/account/admin-details/type-source-analysis/': typeSourceAnalysis,
  '/account/admin-details/volume-over-time/': volumeOverTime,
  '/account/admin-details/geography/user-distribution/': geoCurrency,
  '/account/admin-details/geography/user-distribution/by-kyc/': geoByKyc,
  '/account/admin-details/cohort/monthly/': cohortMonthly,
  '/account/admin-details/bank-transfers/monthly/': bankTransfers,
  '/account/admin-details/health/overview/': healthOverview,
  '/account/admin-details/fraud/alerts/': fraudAlerts,
  '/account/admin-details/users/top/': topUsers,
  '/account/admin-details/notifications/segments/preview/': notificationsPreview,
  '/account/admin-details/notifications/send/': notificationsSend,
}

/** Returns spec-shaped mock data for a path, or undefined if none exists. */
export function mockFor(path: string, params: Record<string, string> = {}, body?: any): any | undefined {
  const fn = MOCKS[path]
  return fn ? fn(params, body) : undefined
}

export function hasMock(path: string): boolean {
  return path in MOCKS
}
