import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ComposedChart, Line, AreaChart, Area,
} from 'recharts'
import type { Period } from '../App'
import ChartCard from '../components/ChartCard'
import MetricCard from '../components/MetricCard'
import { NoApiState, ErrorBanner } from '../components/PageState'
import { BarChart3, DollarSign, Users, TrendingUp } from 'lucide-react'
import { formatCurrency, formatNumber, CHART_COLORS } from '../lib/utils'
import { HAS_API, useCohort } from '../hooks/useDashboardData'

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
            {String(p.name).includes('LTV') || String(p.name).includes('Revenue')
              ? formatCurrency(p.value, { decimals: 2 })
              : formatNumber(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

interface CohortProps { period: Period }

export default function Cohort({ period: _period }: CohortProps) {
  if (!HAS_API) return <NoApiState />

  const { data: cohortMonthly, loading: cL, error: cE, refetch: cR } = useCohort()

  const bestCohort         = [...cohortMonthly].sort((a: any, b: any) => (b.lifetime_value ?? 0) - (a.lifetime_value ?? 0))[0] as any ?? {}
  const totalCohortRevenue = cohortMonthly.reduce((s: number, c: any) => s + (c.total_revenue ?? 0), 0)
  const avgLTV             = cohortMonthly.length ? cohortMonthly.reduce((s: number, c: any) => s + (c.lifetime_value ?? 0), 0) / cohortMonthly.length : 0

  return (
    <div className="page-enter space-y-5">
      {cE && <ErrorBanner message={cE} onRetry={cR} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard loading={cL}
          title="Best Cohort LTV"
          value={formatCurrency(bestCohort.lifetime_value ?? 0, { decimals: 2 })}
          subtitle={bestCohort.label ? `${bestCohort.label} cohort` : undefined}
          icon={TrendingUp}
          iconBg="bg-guava-50" iconColor="text-guava-600"
        />
        <MetricCard loading={cL}
          title="Avg LTV (all cohorts)"
          value={formatCurrency(avgLTV, { decimals: 2 })}
          subtitle="Across all cohorts"
          icon={BarChart3}
          iconBg="bg-blue-50" iconColor="text-blue-600"
        />
        <MetricCard loading={cL}
          title="Total Cohort Revenue"
          value={formatCurrency(totalCohortRevenue, { decimals: 2 })}
          subtitle="All cohorts combined"
          icon={DollarSign}
          iconBg="bg-purple-50" iconColor="text-purple-600"
        />
        <MetricCard loading={cL}
          title="Total Cohort Users"
          value={formatNumber(cohortMonthly.reduce((s: number, c: any) => s + (c.cohort_size ?? 0), 0))}
          subtitle="Cumulative signups tracked"
          icon={Users}
          iconBg="bg-orange-50" iconColor="text-orange-600"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ChartCard loading={cL} title="Lifetime Value by Cohort" subtitle="Revenue earned per user">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cohortMonthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v}`} width={36} />
              <Tooltip content={<TT />} />
              <Bar dataKey="lifetime_value" name="LTV" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard loading={cL} title="Cohort Size vs Revenue" subtitle="Size and total revenue generated">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={cohortMonthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="cohGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CHART_COLORS.secondary} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="size" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
              <YAxis yAxisId="rev" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v}`} width={36} />
              <Tooltip content={<TT />} />
              <Bar yAxisId="size" dataKey="cohort_size" name="Cohort Size" fill={CHART_COLORS.secondary}
                opacity={0.4} radius={[3, 3, 0, 0]} maxBarSize={24} />
              <Line yAxisId="rev" type="monotone" dataKey="total_revenue" name="Total Revenue"
                stroke={CHART_COLORS.primary} strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS.primary, strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard loading={cL} title="Avg Revenue per User Over Time" subtitle="Monetisation improvement per cohort">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={cohortMonthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="ltv2Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={CHART_COLORS.purple} stopOpacity={0.12} />
                <stop offset="95%" stopColor={CHART_COLORS.purple} stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
              tickFormatter={v => `$${v}`} width={36} />
            <Tooltip content={<TT />} />
            <Area type="monotone" dataKey="avg_revenue_per_user" name="Avg Revenue/User"
              stroke={CHART_COLORS.purple} strokeWidth={2} fill="url(#ltv2Grad)"
              dot={{ r: 3, fill: CHART_COLORS.purple, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard loading={cL} title="Cohort Performance Table">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-50">
                {['Cohort','Cohort Size','Total Revenue','Avg Rev/User','Lifetime Value','Status'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 pb-2.5 pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...cohortMonthly].reverse().map((row: any) => {
                const maturity = (row.lifetime_value ?? 0) >= 20 ? 'Mature' : (row.lifetime_value ?? 0) >= 5 ? 'Growing' : 'Early'
                return (
                  <tr key={row.cohort ?? row.label} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 pr-6 font-semibold text-gray-700">{row.label}</td>
                    <td className="py-2.5 pr-6">{formatNumber(row.cohort_size ?? 0)}</td>
                    <td className="py-2.5 pr-6 font-mono">{formatCurrency(row.total_revenue ?? 0, { decimals: 2 })}</td>
                    <td className="py-2.5 pr-6 font-mono">{formatCurrency(row.avg_revenue_per_user ?? 0, { decimals: 2 })}</td>
                    <td className="py-2.5 pr-6 font-mono font-semibold text-gray-900">{formatCurrency(row.lifetime_value ?? 0, { decimals: 2 })}</td>
                    <td className="py-2.5 pr-6">
                      <span className={maturity === 'Mature' ? 'badge-positive' : maturity === 'Growing' ? 'badge-warning' : 'badge-neutral'}>
                        {maturity}
                      </span>
                    </td>
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
