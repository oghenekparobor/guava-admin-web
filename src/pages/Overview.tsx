import {
  DollarSign, Users, ArrowLeftRight, TrendingUp, Activity, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { Period } from '../App'
import MetricCard from '../components/MetricCard'
import ChartCard from '../components/ChartCard'
import { NoApiState, ErrorBanner } from '../components/PageState'
import { formatCurrency, formatNumber, CHART_COLORS } from '../lib/utils'
import {
  HAS_API,
  usePlatformHealth, useMonthlyRevenue, useWeeklyRevenue,
  useQuarterlyRevenue, useMonthlyUserGrowth, useWeeklyUserGrowth,
  useGeography, useBankTransfers, useKYCStatusDist,
} from '../hooks/useDashboardData'

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-card-hover p-3 text-xs">
      <p className="font-semibold text-gray-600 mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">
            {typeof p.value === 'number' && p.value > 1000
              ? formatCurrency(p.value, { compact: true })
              : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

interface OverviewProps { period: Period }

export default function Overview({ period }: OverviewProps) {
  if (!HAS_API) return <NoApiState />

  const { data: health,         loading: hL,  error: hE,  refetch: hR  } = usePlatformHealth()
  const { data: monthlyRevenue, loading: mrL, error: mrE, refetch: mrR } = useMonthlyRevenue()
  const { data: weeklyRevenue,  loading: wrL, error: wrE                } = useWeeklyRevenue()
  const { data: quarterlyRevenue                                         } = useQuarterlyRevenue()
  const { data: monthlyGrowth,  loading: mgL, error: mgE                } = useMonthlyUserGrowth()
  const { data: weeklyGrowth                                             } = useWeeklyUserGrowth()
  const { data: geography,      loading: gL,  error: gE                 } = useGeography()
  const { data: bankTransfers,  loading: btL, error: btE                } = useBankTransfers()
  const { data: kycDist,        loading: kycL                            } = useKYCStatusDist()

  const volumeData =
    period === 'weekly'    ? weeklyRevenue.map((d: any) => ({ label: d.label, volume: d.volume ?? d.total_volume ?? 0 })) :
    period === 'quarterly' ? quarterlyRevenue.map((d: any) => ({ label: d.label, volume: d.total_volume ?? 0 })) :
    monthlyRevenue.map((d: any) => ({ label: d.label, volume: d.total_volume ?? 0 }))

  const growthData =
    period === 'weekly' ? weeklyGrowth.slice(-8) : monthlyGrowth

  const latest   = monthlyRevenue[monthlyRevenue.length - 1] as any ?? {}
  const prev     = monthlyRevenue[monthlyRevenue.length - 2] as any ?? {}
  const latestUG = monthlyGrowth[monthlyGrowth.length - 1] as any ?? {}
  const prevUG   = monthlyGrowth[monthlyGrowth.length - 2] as any ?? {}

  const pct = (a: number, b: number) => b ? ((a - b) / b) * 100 : 0

  const errors = [hE, mrE, mgE, gE, btE].filter(Boolean)
  const latestBT = bankTransfers[bankTransfers.length - 1] as any ?? {}

  const KYC_COLORS = [CHART_COLORS.primary, CHART_COLORS.warning, CHART_COLORS.gray, CHART_COLORS.danger]

  return (
    <div className="page-enter space-y-5">
      {errors.length > 0 && (
        <ErrorBanner message={errors[0]!} onRetry={() => { hR(); mrR() }} />
      )}

      {latestBT.success_rate_percentage === 0 && bankTransfers.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <span className="font-semibold text-amber-800">Bank transfer success rate is 0%.</span>
          <span className="text-amber-700 ml-1">Remediation underway: new payout partner + automated retries.</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard loading={hL} title="Total Volume"    value={formatCurrency(health.total_volume,  { compact: true })}
          change={pct(latest.total_volume  ?? 0, prev.total_volume  ?? 0)} changeLabel="vs last month"
          icon={DollarSign}     iconBg="bg-blue-50"   iconColor="text-blue-600"   />
        <MetricCard loading={hL} title="Revenue (30d)"   value={formatCurrency(health.revenue_30d,  { decimals: 2 })}
          change={pct(latest.total_revenue ?? 0, prev.total_revenue ?? 0)} changeLabel="vs last month"
          icon={TrendingUp}     iconBg="bg-guava-50"  iconColor="text-guava-600"  />
        <MetricCard loading={hL} title="Active Users (30d)" value={formatNumber(health.active_users_30d)}
          change={pct(latestUG.new_users ?? 0, prevUG.new_users ?? 0)} changeLabel="vs last month"
          icon={Users}          iconBg="bg-purple-50" iconColor="text-purple-600" />
        <MetricCard loading={hL} title="Transactions (30d)" value={formatNumber(health.transactions_30d)}
          change={pct(latest.total_transactions ?? 0, prev.total_transactions ?? 0)} changeLabel="vs last month"
          icon={ArrowLeftRight} iconBg="bg-orange-50" iconColor="text-orange-600" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        <ChartCard loading={mrL || wrL} title="Transaction Volume"
          subtitle={period === 'weekly' ? '12-week' : period === 'quarterly' ? 'quarterly' : '6-month'}
          className="col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={volumeData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`}
                width={48} />
              <Tooltip content={<TT />} />
              <Area type="monotone" dataKey="volume" name="Volume" stroke={CHART_COLORS.primary}
                strokeWidth={2} fill="url(#volGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard loading={hL} title="System Health" subtitle="Live platform status">
          <div className="space-y-4">
            {[
              { label: 'Uptime',     value: `${health.uptime_percentage}%`, dot: 'bg-guava-400 animate-pulse' },
              { label: 'Error Rate', value: `${health.error_rate}%`,        dot: 'bg-amber-400' },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${r.dot}`} />
                  <span className="text-xs text-gray-500">{r.label}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{r.value}</span>
              </div>
            ))}
            {[
              { label: 'Total Users',    value: health.total_users,          icon: CheckCircle2, color: 'text-guava-500'  },
              { label: 'KYC (30d)',      value: health.kyc_submissions_30d,  icon: Activity,     color: 'text-blue-500'   },
              { label: 'Deposits (30d)', value: health.deposits_30d,          icon: Activity,     color: 'text-purple-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={12} className={color} />
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{formatNumber(value)}</span>
              </div>
            ))}

            {/* KYC status mini */}
            {!kycL && kycDist.length > 0 && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs font-semibold text-gray-500 mb-2.5">KYC Status</p>
                <div className="space-y-1.5">
                  {kycDist.map((d: any, i: number) => (
                    <div key={d.kyc_status} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: KYC_COLORS[i] }} />
                      <span className="text-[10px] text-gray-500 flex-1 truncate">{d.label ?? d.kyc_status}</span>
                      <span className="text-[10px] font-semibold text-gray-700">{d.user_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Growth + Geography */}
      <div className="grid grid-cols-3 gap-4">
        <ChartCard loading={mgL} title="User Growth" subtitle="New signups per period" className="col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={growthData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip content={<TT />} />
              <Bar dataKey="new_users" name="New Users" fill={CHART_COLORS.secondary}
                radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard loading={gL} title="Top Countries" subtitle="User distribution">
          <div className="space-y-2.5 mt-1">
            {geography.slice(0, 6).map((c: any) => (
              <div key={c.country_code}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {c.flag && <span className="text-sm">{c.flag}</span>}
                    <span className="text-xs font-medium text-gray-700 truncate max-w-[100px]">{c.country ?? c.country_code}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900 flex-shrink-0">{c.percentage}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-guava-400 rounded-full" style={{ width: `${c.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Lifetime stats */}
      <ChartCard loading={hL} title="Lifetime Stats" subtitle="All-time platform totals">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Users',   value: formatNumber(health.total_users),                       icon: Users,          color: 'text-purple-500' },
            { label: 'Total Volume',  value: formatCurrency(health.total_volume, { compact: true }),  icon: DollarSign,     color: 'text-blue-500'   },
            { label: 'Total Revenue', value: formatCurrency(health.total_revenue, { decimals: 2 }),   icon: TrendingUp,     color: 'text-guava-600'  },
            { label: 'Total Txns',    value: formatNumber(health.total_transactions),                 icon: ArrowLeftRight, color: 'text-orange-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="text-center">
              <div className={`flex items-center justify-center mb-2 ${color}`}>
                <Icon size={22} strokeWidth={1.5} />
              </div>
              <p className="text-lg font-bold text-gray-900">{value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </ChartCard>
    </div>
  )
}
