import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ComposedChart, Line,
} from 'recharts'
import type { Period } from '../App'
import ChartCard from '../components/ChartCard'
import MetricCard from '../components/MetricCard'
import { NoApiState, ErrorBanner } from '../components/PageState'
import { Users as UsersIcon, UserCheck, RefreshCw, Activity } from 'lucide-react'
import { formatNumber, formatPercent, CHART_COLORS } from '../lib/utils'
import {
  HAS_API,
  useWeeklyUserGrowth, useMonthlyUserGrowth, useQuarterlyUserGrowth,
  useCumulativeUsers, useMAU, useRetention, usePlatformHealth,
} from '../hooks/useDashboardData'

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-card-hover p-3 text-xs">
      <p className="font-semibold text-gray-600 mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">
            {String(p.name).includes('Rate') || String(p.name).includes('%') ? `${p.value}%` : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

interface UsersProps { period: Period }

export default function Users({ period }: UsersProps) {
  if (!HAS_API) return <NoApiState />

  const { data: weeklyUserGrowth,    loading: wgL               } = useWeeklyUserGrowth()
  const { data: monthlyUserGrowth,   loading: mgL, error: mgE, refetch: mgR } = useMonthlyUserGrowth()
  const { data: quarterlyUserGrowth, loading: qgL               } = useQuarterlyUserGrowth()
  const { data: cumulativeUsers,     loading: cuL               } = useCumulativeUsers()
  const { data: mauData,             loading: mauL              } = useMAU()
  const { data: retentionData,       loading: retL              } = useRetention()
  const { data: platformHealth,      loading: phL               } = usePlatformHealth()

  const isGrowthLoading =
    period === 'weekly'    ? wgL :
    period === 'quarterly' ? qgL : mgL

  const growthData =
    period === 'weekly'    ? weeklyUserGrowth :
    period === 'quarterly' ? quarterlyUserGrowth :
    monthlyUserGrowth

  const latest    = monthlyUserGrowth[monthlyUserGrowth.length - 1] as any ?? {}
  const prev      = monthlyUserGrowth[monthlyUserGrowth.length - 2] as any ?? {}
  const latestMAU = mauData[mauData.length - 1] as any ?? {}
  const prevMAU   = mauData[mauData.length - 2] as any ?? {}
  const latestRet = retentionData[retentionData.length - 1] as any ?? {}
  const prevRet   = retentionData[retentionData.length - 2] as any ?? {}

  const pct = (a: number, b: number) => b ? ((a - b) / b) * 100 : 0

  return (
    <div className="page-enter space-y-5">
      {mgE && <ErrorBanner message={mgE} onRetry={mgR} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard loading={phL || mgL}
          title="Total Signups"
          value={formatNumber(platformHealth.total_users)}
          change={pct(latest.new_users ?? 0, prev.new_users ?? 0)}
          changeLabel="new users vs last month"
          icon={UsersIcon}
          iconBg="bg-guava-50" iconColor="text-guava-600"
        />
        <MetricCard loading={mauL}
          title="Monthly Active Users"
          value={formatNumber(latestMAU.monthly_active_users ?? 0)}
          change={pct(latestMAU.monthly_active_users ?? 0, prevMAU.monthly_active_users ?? 0)}
          changeLabel="vs last month"
          icon={Activity}
          iconBg="bg-blue-50" iconColor="text-blue-600"
        />
        <MetricCard loading={retL}
          title="Retention Rate"
          value={`${latestRet.retention_rate_percentage ?? 0}%`}
          change={(latestRet.retention_rate_percentage ?? 0) - (prevRet.retention_rate_percentage ?? 0)}
          changeLabel="vs last month"
          icon={RefreshCw}
          iconBg="bg-purple-50" iconColor="text-purple-600"
        />
        <MetricCard loading={mauL}
          title="Avg Txns / User"
          value={`${latestMAU.avg_transactions_per_user ?? 0}`}
          change={pct(latestMAU.avg_transactions_per_user ?? 0, prevMAU.avg_transactions_per_user ?? 0)}
          changeLabel="vs last month"
          icon={UserCheck}
          iconBg="bg-orange-50" iconColor="text-orange-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ChartCard loading={isGrowthLoading} title="New User Signups" subtitle="Growth per period">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={growthData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<TT />} />
              <Bar dataKey="new_users" name="New Users" fill={CHART_COLORS.primary}
                radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard loading={cuL} title="Cumulative Users" subtitle="Total signups over time">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={cumulativeUsers} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CHART_COLORS.primary} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
              <Tooltip content={<TT />} />
              <Area type="monotone" dataKey="total" name="Total Users" stroke={CHART_COLORS.primary}
                strokeWidth={2} fill="url(#cumGrad)"
                dot={{ r: 3, fill: CHART_COLORS.primary, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ChartCard loading={mauL} title="Monthly Active Users (MAU)" subtitle="Active users + avg transactions/user">
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={mauData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="mau" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={22} />
              <YAxis yAxisId="tpu" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={22} />
              <Tooltip content={<TT />} />
              <Bar yAxisId="mau" dataKey="monthly_active_users" name="MAU" fill={CHART_COLORS.secondary}
                opacity={0.7} radius={[3, 3, 0, 0]} maxBarSize={24} />
              <Line yAxisId="tpu" type="monotone" dataKey="avg_transactions_per_user" name="Avg Txns/User"
                stroke={CHART_COLORS.primary} strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS.primary, strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard loading={retL} title="User Retention Rate" subtitle="Returning users per month">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={retentionData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="retGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CHART_COLORS.purple} stopOpacity={0.12} />
                  <stop offset="95%" stopColor={CHART_COLORS.purple} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`} width={32} domain={[0, 110]} />
              <Tooltip content={<TT />} />
              <Area type="monotone" dataKey="retention_rate_percentage" name="Retention Rate"
                stroke={CHART_COLORS.purple} strokeWidth={2} fill="url(#retGrad)"
                dot={{ r: 3, fill: CHART_COLORS.purple, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard loading={mgL} title="User Metrics by Month">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-50">
                {['Month','New Users','Growth Rate','MAU','Returning','Retention','Avg Txns/User'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 pb-2.5 pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...monthlyUserGrowth].reverse().map((row: any) => {
                const mau = mauData.find((m: any) => m.month === row.month)
                const ret = retentionData.find((r: any) => r.month === row.month)
                return (
                  <tr key={row.month} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 pr-6 font-semibold text-gray-700">{row.label}</td>
                    <td className="py-2.5 pr-6 font-semibold text-gray-900">{row.new_users}</td>
                    <td className="py-2.5 pr-6">
                      {row.growth_rate_percentage != null ? (
                        <span className={row.growth_rate_percentage > 0 ? 'badge-positive' : row.growth_rate_percentage < 0 ? 'badge-negative' : 'badge-neutral'}>
                          {formatPercent(row.growth_rate_percentage)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2.5 pr-6">{mau?.monthly_active_users ?? '—'}</td>
                    <td className="py-2.5 pr-6">{ret?.returning_users ?? '—'}</td>
                    <td className="py-2.5 pr-6">
                      {ret ? (
                        <span className={ret.retention_rate_percentage >= 70 ? 'badge-positive' : ret.retention_rate_percentage >= 30 ? 'badge-warning' : 'badge-negative'}>
                          {ret.retention_rate_percentage}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2.5 pr-6">{mau ? Number(mau.avg_transactions_per_user).toFixed(1) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}
