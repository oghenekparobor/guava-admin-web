import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ComposedChart, Line, AreaChart, Area,
} from 'recharts'
import type { Period } from '../App'
import ChartCard from '../components/ChartCard'
import MetricCard from '../components/MetricCard'
import { NoApiState, ErrorBanner } from '../components/PageState'
import Subheader from '../components/Subheader'
import { BarChart3, DollarSign, Users, TrendingUp } from 'lucide-react'
import { formatCurrency, formatNumber, CHART_COLORS } from '../lib/utils'
import { HAS_API, useCohort } from '../hooks/useDashboardData'

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-xl shadow-card-hover p-3 text-xs">
      <p className="font-semibold text-muted mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{p.name}:</span>
          <span className="font-semibold text-ink">
            {/Rev|LTV|Value/.test(String(p.name))
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

  const arpam = (c: any) => c.avg_revenue_per_active_month ?? 0
  const bestCohort         = [...cohortMonthly].sort((a: any, b: any) => arpam(b) - arpam(a))[0] as any ?? {}
  const totalCohortRevenue = cohortMonthly.reduce((s: number, c: any) => s + (c.total_revenue ?? 0), 0)
  const avgArpam           = cohortMonthly.length ? cohortMonthly.reduce((s: number, c: any) => s + arpam(c), 0) / cohortMonthly.length : 0

  return (
    <div className="page-enter space-y-5">
      <Subheader title="Cohort Analysis" />
      {cE && <ErrorBanner message={cE} onRetry={cR} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard loading={cL}
          title="Best Cohort (Rev/Active Mo.)"
          value={formatCurrency(arpam(bestCohort), { decimals: 2 })}
          subtitle={bestCohort.label ? `${bestCohort.label} cohort` : undefined}
          icon={TrendingUp}
          iconBg="bg-lime/15" iconColor="text-lime"
        />
        <MetricCard loading={cL}
          title="Avg Rev / Active Month"
          value={formatCurrency(avgArpam, { decimals: 2 })}
          subtitle="Across all cohorts"
          icon={BarChart3}
          iconBg="bg-info/15" iconColor="text-info"
        />
        <MetricCard loading={cL}
          title="Total Cohort Revenue"
          value={formatCurrency(totalCohortRevenue, { decimals: 2 })}
          subtitle="All cohorts combined"
          icon={DollarSign}
          iconBg="bg-white/10" iconColor="text-[#C2B6F0]"
        />
        <MetricCard loading={cL}
          title="Total Cohort Users"
          value={formatNumber(cohortMonthly.reduce((s: number, c: any) => s + (c.cohort_size ?? 0), 0))}
          subtitle="Cumulative signups tracked"
          icon={Users}
          iconBg="bg-warning/15" iconColor="text-warning"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard loading={cL} title="Avg Revenue per Active Month" subtitle="Monetisation normalised by cohort age">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cohortMonthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#38564F" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v}`} width={36} />
              <Tooltip content={<TT />} />
              <Bar dataKey="avg_revenue_per_active_month" name="Rev/Active Mo." fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard loading={cL} title="Cohort Size vs Active Users" subtitle="Signups and who actually transacted">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={cohortMonthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#38564F" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="size" tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false} width={28} />
              <YAxis yAxisId="rev" orientation="right" tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v}`} width={36} />
              <Tooltip content={<TT />} />
              <Bar yAxisId="size" dataKey="cohort_size" name="Cohort Size" fill={CHART_COLORS.secondary}
                opacity={0.4} radius={[3, 3, 0, 0]} maxBarSize={24} />
              <Bar yAxisId="size" dataKey="active_users" name="Active Users" fill={CHART_COLORS.tertiary}
                radius={[3, 3, 0, 0]} maxBarSize={24} />
              <Line yAxisId="rev" type="monotone" dataKey="total_revenue" name="Total Revenue"
                stroke={CHART_COLORS.primary} strokeWidth={2}
                dot={{ r: 3, fill: CHART_COLORS.primary, strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard loading={cL} title="Avg Revenue per User Over Time" subtitle="Total revenue ÷ cohort size">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={cohortMonthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="ltv2Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={CHART_COLORS.purple} stopOpacity={0.12} />
                <stop offset="95%" stopColor={CHART_COLORS.purple} stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#38564F" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false}
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
              <tr className="border-b border-border">
                {['Cohort','Age (mo)','Size','Active','Total Revenue','Avg Rev/User','Rev/Active Mo.','Status'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-faint pb-2.5 pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...cohortMonthly].reverse().map((row: any) => {
                const v = arpam(row)
                const maturity = v >= 20 ? 'Mature' : v >= 5 ? 'Growing' : 'Early'
                return (
                  <tr key={row.cohort ?? row.label} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 pr-6 font-semibold text-muted">{row.label}</td>
                    <td className="py-2.5 pr-6 text-muted">{row.cohort_age_months ?? '—'}</td>
                    <td className="py-2.5 pr-6">{formatNumber(row.cohort_size ?? 0)}</td>
                    <td className="py-2.5 pr-6">{formatNumber(row.active_users ?? 0)}</td>
                    <td className="py-2.5 pr-6 font-mono">{formatCurrency(row.total_revenue ?? 0, { decimals: 2 })}</td>
                    <td className="py-2.5 pr-6 font-mono">{formatCurrency(row.avg_revenue_per_user ?? 0, { decimals: 2 })}</td>
                    <td className="py-2.5 pr-6 font-mono font-semibold text-ink">{formatCurrency(v, { decimals: 2 })}</td>
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
