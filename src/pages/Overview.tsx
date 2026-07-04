import { useState } from 'react'
import {
  DollarSign, Users, ArrowLeftRight, TrendingUp, Activity, CheckCircle2, AlertTriangle,
  ChevronDown, ArrowUpRight, ServerCog, Wallet, Building2,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Line, LineChart,
} from 'recharts'
import type { Period } from '../App'
import MetricCard from '../components/MetricCard'
import ChartCard from '../components/ChartCard'
import Subheader from '../components/Subheader'
import { NoApiState, ErrorBanner } from '../components/PageState'
import { formatCurrency, formatNumber, cn, CHART_COLORS } from '../lib/utils'
import { currencyLabel } from '../lib/geo'
import {
  HAS_API,
  usePlatformHealth, useLifetimeStats, useSystemHealth, useTransactionsOverview,
  useMonthlyRevenue, useQuarterlyRevenue, useAnnualRevenue, useWeeklyRevenue,
  useMonthlyUserGrowth, useWeeklyUserGrowth, useQuarterlyUserGrowth,
  useVolumeOverTime, useGeography, useBankTransfers, useKYCStatusDist,
  useTransactionTypes, useTopUsers,
} from '../hooks/useDashboardData'

// The dashboard period toggle (D/W/M/Q/Y) maps onto the summary endpoints'
// coarser 30d / 90d / all windows.
function periodWindow(period: Period): '30d' | '90d' | 'all' {
  if (period === 'quarterly' || period === 'annual') return 'all'
  if (period === 'monthly') return '90d'
  return '30d'
}

const TX_TYPES = [
  { id: 'all',     label: 'All types' },
  { id: 'wallet',  label: 'Wallet' },
  { id: 'bank',    label: 'Bank' },
  { id: 'deposit', label: 'Deposit' },
]

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-xl shadow-card-hover p-3 text-xs">
      <p className="font-semibold text-muted mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-muted">{p.name}:</span>
          <span className="font-semibold text-ink">
            {/Transaction|Users|Count/i.test(String(p.name))
              ? formatNumber(p.value)
              : typeof p.value === 'number' && p.value > 1000
                ? formatCurrency(p.value, { compact: true })
                : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// Design's ring: recessed track + coloured progress arc with a centred value.
function Donut({ value, label, color, track = 'rgba(255,255,255,0.10)' }: {
  value: number; label: string; color: string; track?: string
}) {
  const r = 52
  const c = 2 * Math.PI * r
  const pctClamped = Math.max(0, Math.min(100, Math.abs(value)))
  const dash = (pctClamped / 100) * c
  return (
    <div className="relative w-[120px] h-[120px] flex items-center justify-center flex-shrink-0">
      <svg width="120" height="120" viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke={track} strokeWidth="6" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`} />
      </svg>
      <div className="text-center leading-tight">
        <div className="text-xl font-extrabold text-ink">{value}%</div>
        <div className="text-[10px] text-faint">{label}</div>
      </div>
    </div>
  )
}

interface OverviewProps { period: Period }

export default function Overview({ period }: OverviewProps) {
  if (!HAS_API) return <NoApiState />

  const window = periodWindow(period)

  const { data: health,         loading: hL,  error: hE,  refetch: hR  } = usePlatformHealth()
  const { data: lifetime,       loading: lfL                            } = useLifetimeStats()
  const { data: system,         loading: sysL                           } = useSystemHealth()
  const { data: txOverview,     loading: toL                            } = useTransactionsOverview(window)
  const { data: monthlyRevenue, loading: mrL, error: mrE, refetch: mrR } = useMonthlyRevenue()
  const { data: quarterlyRevenue                                        } = useQuarterlyRevenue()
  const { data: annualRevenue                                           } = useAnnualRevenue()
  const { data: weeklyRevenue                                           } = useWeeklyRevenue()
  const { data: volumeOverTime                                          } = useVolumeOverTime()
  const { data: monthlyGrowth,  loading: mgL, error: mgE                } = useMonthlyUserGrowth()
  const { data: weeklyGrowth                                             } = useWeeklyUserGrowth()
  const { data: quarterlyGrowth                                          } = useQuarterlyUserGrowth()
  const { data: geography,      loading: gL,  error: gE                 } = useGeography()
  const { data: bankTransfers,  loading: btL, error: btE                } = useBankTransfers()
  const { data: kycDist,        loading: kycL                            } = useKYCStatusDist()
  const { data: txTypes,        loading: ttL                             } = useTransactionTypes()
  const { data: topUsersResp,   loading: tuL                             } = useTopUsers({ rank_by: 'usdc_volume', window, limit: 10 })
  const topUsers = topUsersResp.results

  const servicesUp = system.heartbeats.filter((h: any) => !h.is_stale).length

  // Transaction overview — transactions over time, driven by the D/W/M/Q/Y
  // toggle. Uses a consistent metric (transaction count) across every grain,
  // and the type filter only where per-type data exists (monthly).
  const [txType, setTxType] = useState('all')
  const [txMenuOpen, setTxMenuOpen] = useState(false)
  const num = (v: any) => Number(v ?? 0)
  const txOverviewData: { label: string; value: number }[] = (() => {
    if (period === 'monthly') {
      const byMonth = new Map<string, { label: string; value: number }>()
      for (const r of txTypes as any[]) {
        if (txType !== 'all' && r.transaction_type !== txType) continue
        const cur = byMonth.get(r.month) ?? { label: r.label ?? r.month, value: 0 }
        cur.value += num(r.transaction_count)
        byMonth.set(r.month, cur)
      }
      return [...byMonth.values()]
    }
    const map = (rows: any[], key: string) =>
      rows.map((r) => ({ label: r.label ?? r.month, value: num(r[key] ?? r.total_transactions ?? r.transaction_count) }))
    switch (period) {
      case 'daily':     return map(volumeOverTime, 'daily_transaction_count')
      case 'weekly':    return map(weeklyRevenue, 'transaction_count')
      case 'quarterly': return map(quarterlyRevenue, 'total_transactions')
      case 'annual':    return map(annualRevenue, 'total_transactions')
      default:          return map(monthlyRevenue, 'total_transactions')
    }
  })()
  const PERIOD_LABEL: Record<string, string> = {
    daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual',
  }

  const growthData =
    period === 'weekly'    ? weeklyGrowth.slice(-8) :
    period === 'quarterly' ? quarterlyGrowth :
    monthlyGrowth

  const latest   = monthlyRevenue[monthlyRevenue.length - 1] as any ?? {}
  const prev     = monthlyRevenue[monthlyRevenue.length - 2] as any ?? {}
  const latestUG = monthlyGrowth[monthlyGrowth.length - 1] as any ?? {}
  const prevUG   = monthlyGrowth[monthlyGrowth.length - 2] as any ?? {}

  const pct = (a: number, b: number) => b ? ((a - b) / b) * 100 : 0

  const errors = [hE, mrE, mgE, gE, btE].filter(Boolean)
  const latestBT = bankTransfers[bankTransfers.length - 1] as any ?? {}

  const growthRate = Number(latestUG.growth_rate_percentage ?? pct(latestUG.new_users ?? 0, prevUG.new_users ?? 0)).toFixed(0)
  const successRate = Number(latestBT.success_rate_percentage ?? 0).toFixed(0)

  const KYC_COLORS = [CHART_COLORS.primary, CHART_COLORS.warning, CHART_COLORS.gray, CHART_COLORS.danger]

  return (
    <div className="page-enter space-y-6">
      <Subheader title="Dashboard"
        health={{ status: system.overall_status, ok: servicesUp, total: system.heartbeats.length }} />

      {errors.length > 0 && (
        <ErrorBanner message={errors[0]!} onRetry={() => { hR(); mrR() }} />
      )}

      {latestBT.success_rate_percentage === 0 && bankTransfers.length > 0 && (
        <div className="flex items-center gap-3 bg-warning/15 border border-warning/30 rounded-2xl px-4 py-3 text-sm">
          <AlertTriangle size={16} className="text-warning flex-shrink-0" />
          <span className="font-semibold text-warning">Bank transfer success rate is 0%.</span>
          <span className="text-warning ml-1">Remediation underway: new payout partner + automated retries.</span>
        </div>
      )}

      {/* KPI stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard loading={lfL} title="Total Volume" value={formatCurrency(lifetime.volume, { compact: true })}
          change={pct(latest.total_volume ?? 0, prev.total_volume ?? 0)} changeLabel="vs last month"
          icon={DollarSign} iconBg="bg-info/15" iconColor="text-info" />
        <MetricCard loading={hL} title="Revenue (30d)" value={formatCurrency(health.revenue_30d, { decimals: 2 })}
          change={health.revenue_growth_percentage ?? pct(latest.total_revenue ?? 0, prev.total_revenue ?? 0)} changeLabel="vs prev 30d"
          icon={TrendingUp} iconBg="bg-lime/15" iconColor="text-lime" />
        <MetricCard loading={hL} title="Active Users (30d)" value={formatNumber(health.active_users_30d)}
          change={health.active_users_growth_percentage ?? pct(latestUG.new_users ?? 0, prevUG.new_users ?? 0)} changeLabel="vs prev 30d"
          icon={Users} iconBg="bg-white/10" iconColor="text-[#C2B6F0]" />
        <MetricCard loading={hL} title="Transactions (30d)" value={formatNumber(health.transactions_30d)}
          change={health.transactions_growth_percentage ?? pct(latest.total_transactions ?? 0, prev.total_transactions ?? 0)} changeLabel="vs prev 30d"
          icon={ArrowLeftRight} iconBg="bg-warning/15" iconColor="text-warning" />
      </div>

      {/* Volume + rings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard loading={ttL} title="Transaction overview"
          subtitle={`${PERIOD_LABEL[period]} · transactions${period === 'monthly' && txType !== 'all' ? ` · ${TX_TYPES.find(t => t.id === txType)?.label}` : ''}`}
          className="lg:col-span-2"
          action={period === 'monthly' ? (
            <div className="relative">
              <button onClick={() => setTxMenuOpen(o => !o)} className="dc-control">
                {TX_TYPES.find(t => t.id === txType)?.label}
                <ChevronDown size={13} />
              </button>
              {txMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setTxMenuOpen(false)} />
                  <div className="absolute right-0 top-11 w-40 bg-surface rounded-2xl shadow-card-hover border border-border p-1.5 z-50">
                    {TX_TYPES.map(t => (
                      <div key={t.id}
                        onClick={() => { setTxType(t.id); setTxMenuOpen(false) }}
                        className={cn('px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors',
                          txType === t.id ? 'bg-lime/15 text-lime' : 'text-muted hover:text-ink hover:bg-white/5')}>
                        {t.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : undefined}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={txOverviewData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CHART_COLORS.primary} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#38564F" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : `${v}`}
                width={40} />
              <Tooltip content={<TT />} />
              <Area type="monotone" dataKey="value" name="Transactions" stroke={CHART_COLORS.primary}
                strokeWidth={2.5} fill="url(#volGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard loading={mgL || btL} title="Rates" subtitle="Growth & success">
          <div className="flex items-center justify-around gap-2 py-2">
            <Donut value={Number(growthRate)} label="Growth rate" color={CHART_COLORS.primary} />
            <Donut value={Number(successRate)} label="Successful" color={CHART_COLORS.secondary} />
          </div>
        </ChartCard>
      </div>

      {/* Growth + system health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard loading={mgL} title="User Growth" subtitle="New signups per period" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={growthData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#38564F" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<TT />} />
              <Bar dataKey="new_users" name="New Users" fill={CHART_COLORS.secondary}
                radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard loading={sysL} title="System Health"
          subtitle="Service heartbeats"
          action={
            <span className={system.overall_status === 'healthy' ? 'badge-positive' : 'badge-warning'}>
              <ServerCog size={11} strokeWidth={2.5} />{servicesUp}/{system.heartbeats.length}
            </span>
          }>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${/^(up|ok|healthy)$/i.test(system.database) ? 'bg-positive animate-pulse' : 'bg-negative'}`} />
                <span className="text-xs text-muted">Database</span>
              </div>
              <span className="text-sm font-bold text-ink capitalize">{system.database}</span>
            </div>
            {system.heartbeats.length === 0 && (
              <p className="text-[11px] text-faint">No service heartbeats reporting.</p>
            )}
            {system.heartbeats.map((h: any) => (
              <div key={h.service} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${h.is_stale ? 'bg-warning' : 'bg-positive'}`} />
                  <span className="text-xs text-muted truncate">{h.service}</span>
                </div>
                <span className={`text-[11px] font-semibold capitalize ${h.is_stale ? 'text-warning' : 'text-muted'}`}>{h.status}</span>
              </div>
            ))}

            <div className="pt-3 border-t border-border space-y-3">
              {[
                { label: 'Active Users (30d)', value: health.active_users_30d, icon: CheckCircle2, color: 'text-lime'  },
                { label: 'KYC (30d)',          value: health.kyc_submissions_30d, icon: Activity,  color: 'text-info'   },
                { label: 'Deposits (30d)',     value: health.deposits_30d,     icon: Activity,     color: 'text-[#C2B6F0]' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={12} className={color} />
                    <span className="text-xs text-muted">{label}</span>
                  </div>
                  <span className="text-sm font-bold text-ink">{formatNumber(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Transaction health + User growth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard loading={toL} title="Transaction health"
          subtitle={`${PERIOD_LABEL[period]} window · ${txOverview.window}`}
          action={
            <span className={txOverview.success_rate_percentage >= (txOverview.prior_success_rate_percentage || 0) ? 'badge-positive' : 'badge-warning'}>
              {Number(txOverview.success_rate_percentage).toFixed(1)}% success
            </span>
          }>
          {(() => {
            const completed = txOverview.by_status.completed ?? 0
            const inProgress = txOverview.by_status.in_progress ?? txOverview.in_flight?.count ?? 0
            const failed = txOverview.by_status.failed ?? 0
            const total = Math.max(1, completed + inProgress + failed)
            const seg = (n: number) => `${(n / total) * 100}%`
            return (
              <div className="mt-1">
                <div className="flex items-baseline justify-between mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[26px] font-extrabold text-ink leading-none">{formatNumber(txOverview.total_transactions)}</span>
                    <span className="text-sm text-muted">transactions</span>
                  </div>
                  {txOverview.transactions_growth_percentage != null && (
                    <span className={txOverview.transactions_growth_percentage >= 0 ? 'badge-positive' : 'badge-negative'}>
                      <ArrowUpRight size={11} strokeWidth={2.5} />{Math.abs(Number(txOverview.transactions_growth_percentage)).toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5 h-8">
                  <div style={{ width: seg(completed) }} className="bg-positive rounded-lg" />
                  <div style={{ width: seg(inProgress) }} className="bg-warning rounded-lg" />
                  <div style={{ width: seg(failed) }} className="bg-negative rounded-lg" />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-xs">
                  {[
                    ['Completed', 'bg-positive', completed],
                    ['In-flight', 'bg-warning', inProgress],
                    ['Failed', 'bg-negative', failed],
                  ].map(([l, c, v]) => (
                    <div key={l as string} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${c}`} />
                      <span className="text-muted">{l}</span>
                      <span className="font-semibold text-ink">{formatNumber(v as number)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border text-xs">
                  <span className="text-muted">Failed value</span>
                  <span className="font-mono font-semibold text-ink">
                    ₦{formatNumber(txOverview.failed_value?.ngn ?? 0)}
                    {(txOverview.failed_value?.usdc ?? 0) > 0 && (
                      <span className="text-muted"> · {formatCurrency(txOverview.failed_value.usdc, { decimals: 2 })}</span>
                    )}
                  </span>
                </div>
              </div>
            )
          })()}
        </ChartCard>

        <ChartCard loading={mgL} title="User growth">
          <ResponsiveContainer width="100%" height={90}>
            <LineChart data={growthData} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <Line type="monotone" dataKey="new_users" stroke={CHART_COLORS.primary} strokeWidth={2.5}
                dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              <Tooltip content={<TT />} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-[26px] font-extrabold text-ink leading-none">{formatNumber(lifetime.users)}</span>
              <span className="text-sm text-muted">users</span>
            </div>
            <span className="badge-positive">
              <ArrowUpRight size={11} strokeWidth={2.5} />{Math.abs(Number(growthRate))}%
            </span>
          </div>
        </ChartCard>
      </div>

      {/* Top users — arranged by total volume over the active window.
          The subtitle shows the window the API actually returned. */}
      <ChartCard loading={tuL} title="Top Users"
        subtitle={`By total volume · ${topUsersResp.window || window}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['#', 'User', 'KYC', 'Transactions', 'Total Volume', 'USDC Volume', 'Revenue'].map((h) => (
                  <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-faint pb-3 pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...topUsers]
                .sort((a: any, b: any) => (b.total_volume ?? 0) - (a.total_volume ?? 0))
                .map((u: any, i: number) => (
                <tr key={u.user_id ?? u.wallet_address ?? i} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 pr-6 font-bold text-lime font-mono">{String(i + 1).padStart(2, '0')}</td>
                  <td className="py-3.5 pr-6 font-semibold text-ink">
                    {u.username ?? <span className="font-mono text-muted">{u.wallet_address}</span>}
                  </td>
                  <td className="py-3.5 pr-6">
                    <span className={cn('text-[11px] font-semibold',
                      u.kyc_status === 'verified' ? 'text-positive' :
                      u.kyc_status === 'failed' ? 'text-negative' :
                      u.kyc_status === 'pending' ? 'text-warning' : 'text-faint')}>
                      {u.kyc_status ?? '—'}
                    </span>
                  </td>
                  <td className="py-3.5 pr-6 text-muted">{formatNumber(u.transaction_count)}</td>
                  <td className="py-3.5 pr-6 font-mono text-ink">{formatCurrency(u.total_volume, { decimals: 2 })}</td>
                  <td className="py-3.5 pr-6 font-mono text-muted">{formatCurrency(u.usdc_volume, { decimals: 2 })}</td>
                  <td className="py-3.5 pr-6 font-mono text-muted">{formatCurrency(u.revenue_contributed, { decimals: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Top currencies + KYC status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard loading={gL} title="Top Currencies" subtitle="User distribution" className="lg:col-span-2">
          <div className="space-y-2.5 mt-1">
            {geography.slice(0, 6).map((c: any) => (
              <div key={c.currency_code}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted truncate max-w-[180px]">{currencyLabel(c.currency_code)}</span>
                  <span className="text-xs font-semibold text-ink flex-shrink-0">{c.percentage}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-lime rounded-full" style={{ width: `${c.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard loading={kycL} title="KYC Status" subtitle="Verification distribution">
          <div className="space-y-2.5 mt-1">
            {kycDist.map((d: any, i: number) => (
              <div key={d.kyc_status} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: KYC_COLORS[i] }} />
                <span className="text-xs text-muted flex-1 truncate">{d.label ?? d.kyc_status}</span>
                <span className="text-xs font-semibold text-ink">{d.user_count}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Lifetime stats — GET /stats/lifetime/ */}
      <ChartCard loading={lfL} title="Lifetime Stats"
        subtitle={lifetime.first_transaction_at ? `Since ${new Date(lifetime.first_transaction_at).toLocaleDateString('en', { month: 'short', year: 'numeric' })}` : 'All-time platform totals'}>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
          {[
            { label: 'Total Users',   value: formatNumber(lifetime.users),                       icon: Users,          color: 'text-[#C2B6F0]' },
            { label: 'Total Volume',  value: formatCurrency(lifetime.volume, { compact: true }),  icon: DollarSign,     color: 'text-info'   },
            { label: 'Total Revenue', value: formatCurrency(lifetime.revenue, { decimals: 2 }),   icon: TrendingUp,     color: 'text-lime'  },
            { label: 'Total Txns',    value: formatNumber(lifetime.transactions),                 icon: ArrowLeftRight, color: 'text-warning' },
            { label: 'Deposits',      value: formatNumber(lifetime.deposits),                     icon: Wallet,         color: 'text-info'   },
            { label: 'Businesses',    value: formatNumber(lifetime.businesses),                   icon: Building2,      color: 'text-lime'  },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="text-center">
              <div className={`flex items-center justify-center mb-2 ${color}`}>
                <Icon size={22} strokeWidth={1.5} />
              </div>
              <p className="text-lg font-bold text-ink">{value}</p>
              <p className="text-[10px] text-faint mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  )
}
