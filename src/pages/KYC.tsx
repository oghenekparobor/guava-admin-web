import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import type { Period } from '../App'
import ChartCard from '../components/ChartCard'
import MetricCard from '../components/MetricCard'
import { NoApiState, ErrorBanner } from '../components/PageState'
import { ShieldCheck, Clock, Globe } from 'lucide-react'
import { formatNumber, CHART_COLORS } from '../lib/utils'
import { HAS_API, useKYCMonthlyStats, useKYCStatusDist } from '../hooks/useDashboardData'

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-card-hover p-3 text-xs">
      <p className="font-semibold text-gray-600 mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">{String(p.name).includes('Rate') ? `${p.value}%` : p.value}</span>
        </div>
      ))}
    </div>
  )
}

const KYC_COLORS = [CHART_COLORS.primary, CHART_COLORS.gray, CHART_COLORS.warning, CHART_COLORS.danger]

interface KYCProps { period: Period }

export default function KYC({ period: _period }: KYCProps) {
  if (!HAS_API) return <NoApiState />

  const { data: kycMonthlyStats,       loading: kmsL, error: kmsE, refetch: kmsR } = useKYCMonthlyStats()
  const { data: kycStatusDistribution, loading: ksdL                               } = useKYCStatusDist()

  const latest = kycMonthlyStats[kycMonthlyStats.length - 1] as any ?? {}
  const prev   = kycMonthlyStats[kycMonthlyStats.length - 2] as any ?? {}

  const verified   = kycStatusDistribution.find((d: any) => d.kyc_status === 'verified')    ?? { user_count: 0, percentage: 0 }
  const pending    = kycStatusDistribution.find((d: any) => d.kyc_status === 'pending')     ?? { user_count: 0, percentage: 0 }
  const notStarted = kycStatusDistribution.find((d: any) => d.kyc_status === 'not-started') ?? { user_count: 0, percentage: 0 }

  const pieData = kycStatusDistribution.map((d: any, i: number) => ({
    name: d.label ?? d.kyc_status,
    value: d.user_count,
    pct: d.percentage,
    color: KYC_COLORS[i],
  }))

  return (
    <div className="page-enter space-y-5">
      {kmsE && <ErrorBanner message={kmsE} onRetry={kmsR} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard loading={kmsL}
          title="Approval Rate (latest)"
          value={`${latest.approval_rate_percentage ?? 0}%`}
          change={(latest.approval_rate_percentage ?? 0) - (prev.approval_rate_percentage ?? 0)}
          changeLabel="vs last month"
          icon={ShieldCheck}
          iconBg="bg-guava-50" iconColor="text-guava-600"
        />
        <MetricCard loading={ksdL}
          title="Verified Users"
          value={formatNumber(verified.user_count)}
          subtitle={`${verified.percentage}% of all users`}
          icon={ShieldCheck}
          iconBg="bg-blue-50" iconColor="text-blue-600"
        />
        <MetricCard loading={ksdL}
          title="Pending Pipeline"
          value={formatNumber((pending.user_count ?? 0) + (notStarted.user_count ?? 0))}
          subtitle={`${((pending.percentage ?? 0) + (notStarted.percentage ?? 0)).toFixed(1)}% pipeline opportunity`}
          icon={Clock}
          iconBg="bg-amber-50" iconColor="text-amber-600"
        />
        <MetricCard loading={kmsL}
          title="Countries Served"
          value={formatNumber(latest.countries_served ?? 0)}
          change={(latest.countries_served ?? 0) - (prev.countries_served ?? 0)}
          changeLabel="new countries this month"
          icon={Globe}
          iconBg="bg-purple-50" iconColor="text-purple-600"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <ChartCard loading={kmsL} title="Approval Rate Trend" subtitle="Monthly improvement" className="col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={kycMonthlyStats} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`} width={36} domain={[0, 110]} />
              <Tooltip content={<TT />} />
              <Line type="monotone" dataKey="approval_rate_percentage" name="Approval Rate"
                stroke={CHART_COLORS.primary} strokeWidth={2.5}
                dot={{ r: 4, fill: CHART_COLORS.primary, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard loading={ksdL} title="User KYC Status" subtitle="Current distribution">
          <div className="flex flex-col items-center">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={54}
                  dataKey="value" strokeWidth={0} startAngle={90} endAngle={-270}>
                  {pieData.map((d: any, i: number) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-1.5 mt-3">
              {pieData.map((d: any) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-xs text-gray-600 flex-1">{d.name}</span>
                  <span className="text-xs font-bold text-gray-900">{d.value}</span>
                  <span className="text-[10px] text-gray-400">({d.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      <ChartCard loading={kmsL} title="Monthly KYC Submissions" subtitle="Approved / Rejected / Pending">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={kycMonthlyStats} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={22} />
            <Tooltip content={<TT />} />
            <Bar dataKey="approved" name="Approved" stackId="a" fill={CHART_COLORS.primary} maxBarSize={32} />
            <Bar dataKey="pending"  name="Pending"  stackId="a" fill={CHART_COLORS.warning} maxBarSize={32} />
            <Bar dataKey="rejected" name="Rejected" stackId="a" fill={CHART_COLORS.danger}  radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard loading={kmsL} title="Monthly KYC Detail">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-50">
                {['Month','Total','Approved','Rejected','Pending','Approval Rate','Countries'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 pb-2.5 pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...kycMonthlyStats].reverse().map((row: any) => (
                <tr key={row.month} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-2.5 pr-6 font-semibold text-gray-700">{row.label}</td>
                  <td className="py-2.5 pr-6">{row.total_verifications}</td>
                  <td className="py-2.5 pr-6 text-guava-600 font-semibold">{row.approved}</td>
                  <td className="py-2.5 pr-6 text-red-500">{row.rejected}</td>
                  <td className="py-2.5 pr-6 text-amber-600">{row.pending}</td>
                  <td className="py-2.5 pr-6">
                    <span className={row.approval_rate_percentage >= 80 ? 'badge-positive' : row.approval_rate_percentage >= 50 ? 'badge-warning' : 'badge-negative'}>
                      {row.approval_rate_percentage}%
                    </span>
                  </td>
                  <td className="py-2.5 pr-6">{row.countries_served}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}
