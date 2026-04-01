import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ComposedChart, PieChart, Pie, Cell,
} from 'recharts'
import type { Period } from '../App'
import ChartCard from '../components/ChartCard'
import MetricCard from '../components/MetricCard'
import { NoApiState, ErrorBanner } from '../components/PageState'
import { formatCurrency, formatNumber, CHART_COLORS, CURRENCY_COLORS, cn } from '../lib/utils'
import {
  HAS_API,
  useWeeklyRevenue, useMonthlyRevenue, useQuarterlyRevenue,
  useAnnualRevenue, useRevenueByCurrency, useRunRates,
} from '../hooks/useDashboardData'
import { DollarSign, TrendingUp } from 'lucide-react'

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
            {p.name === 'Transactions' ? formatNumber(p.value) : formatCurrency(p.value, { decimals: 2 })}
          </span>
        </div>
      ))}
    </div>
  )
}

interface RevenueProps { period: Period }

export default function Revenue({ period }: RevenueProps) {
  if (!HAS_API) return <NoApiState />

  const { data: weeklyRevenue,    loading: wrL, error: wrE } = useWeeklyRevenue()
  const { data: monthlyRevenue,   loading: mrL, error: mrE } = useMonthlyRevenue()
  const { data: quarterlyRevenue, loading: qrL              } = useQuarterlyRevenue()
  const { data: annualRevenue,    loading: arL              } = useAnnualRevenue()
  const { data: revenueByCurrency,loading: rcL              } = useRevenueByCurrency()
  const { data: runRates,         loading: rrL              } = useRunRates()

  const chartData =
    period === 'weekly'    ? weeklyRevenue.map((d: any)    => ({ label: d.label, revenue: d.weekly_revenue ?? 0, transactions: d.transaction_count ?? 0 })) :
    period === 'quarterly' ? quarterlyRevenue.map((d: any) => ({ label: d.label, revenue: d.total_revenue  ?? 0, transactions: d.total_transactions ?? 0 })) :
    period === 'annual'    ? annualRevenue.map((d: any)    => ({ label: d.label, revenue: d.total_revenue  ?? 0, transactions: d.total_transactions ?? 0 })) :
    monthlyRevenue.map((d: any) => ({ label: d.label, revenue: d.total_revenue ?? 0, transactions: d.total_transactions ?? 0 }))

  const isChartLoading =
    period === 'weekly'    ? wrL :
    period === 'quarterly' ? qrL :
    period === 'annual'    ? arL : mrL

  const totalCurRev = revenueByCurrency.reduce((a: number, c: any) => a + (Number(c.total_revenue) || 0), 0) || 1
  const currencyPieData = revenueByCurrency.map((d: any) => ({
    name: d.currency,
    value: d.total_revenue,
    pct: ((Number(d.total_revenue) / totalCurRev) * 100).toFixed(1),
  }))

  const errors = [wrE, mrE].filter(Boolean)

  const rrCards = [
    { label: 'MRR',  sublabel: 'Monthly Revenue Run Rate',   value: formatCurrency(runRates.mrr,  { decimals: 2 }), change: runRates.mrr_growth, desc: 'Last full month',  color: 'text-guava-600',  bg: 'bg-guava-50'  },
    { label: 'ARR',  sublabel: 'Annual Revenue Run Rate',     value: formatCurrency(runRates.arr,  { decimals: 2 }), change: runRates.mrr_growth, desc: 'MRR × 12',        color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'QRR',  sublabel: 'Quarterly Revenue Run Rate',  value: formatCurrency(runRates.qrr,  { decimals: 2 }), change: runRates.mrr_growth, desc: 'MRR × 3',         color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'WRR',  sublabel: 'Weekly Revenue Run Rate',     value: formatCurrency(runRates.wrr,  { decimals: 2 }), change: runRates.mrr_growth, desc: 'Weekly avg × 52', color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <div className="page-enter space-y-5">
      {errors.length > 0 && <ErrorBanner message={errors[0]!} />}

      {/* Run rate cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {rrCards.map(r => (
          <div key={r.label} className={cn('card-hover p-5', rrL && 'animate-pulse')}>
            {rrL ? (
              <>
                <div className="w-10 h-5 bg-gray-100 rounded mb-3" />
                <div className="h-7 w-24 bg-gray-100 rounded mb-2" />
                <div className="h-3 w-32 bg-gray-100 rounded" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-lg', r.bg, r.color)}>{r.label}</span>
                  {r.change > 0
                    ? <ArrowUpRight size={14} className="text-guava-500" />
                    : <ArrowDownRight size={14} className="text-red-500" />
                  }
                </div>
                <p className="text-2xl font-bold text-gray-900 leading-none">{r.value}</p>
                <p className="text-xs font-medium text-gray-500 mt-1">{r.sublabel}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{r.desc}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Volume run rates */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Monthly Volume Run Rate',  value: formatCurrency(runRates.mvrr,  { compact: true }), sub: 'Based on latest month' },
          { label: 'Annual Volume Run Rate',    value: formatCurrency(runRates.avrr,  { compact: true }), sub: 'Monthly × 12'          },
          { label: 'Previous MRR',              value: formatCurrency(runRates.prev_mrr, { decimals: 2 }), sub: 'Month before latest'  },
        ].map(r => (
          <div key={r.label} className={cn('card-hover p-5', rrL && 'animate-pulse')}>
            {rrL ? (
              <><div className="h-3 w-32 bg-gray-100 rounded mb-2" /><div className="h-7 w-20 bg-gray-100 rounded" /></>
            ) : (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{r.label}</p>
                <p className="text-2xl font-bold text-gray-900">{r.value}</p>
                <p className="text-xs text-gray-400 mt-1">{r.sub}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Revenue trend */}
      <ChartCard loading={isChartLoading} title="Revenue Trend" subtitle="Revenue and transaction count over time">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={CHART_COLORS.primary} stopOpacity={0.12} />
                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="rev" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
              tickFormatter={v => `$${v}`} width={40} />
            <YAxis yAxisId="txn" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={30} />
            <Tooltip content={<TT />} />
            <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.primary}
              strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            <Bar yAxisId="txn" dataKey="transactions" name="Transactions" fill={CHART_COLORS.secondary}
              opacity={0.3} radius={[2, 2, 0, 0]} maxBarSize={20} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard loading={rcL} title="Revenue by Currency" subtitle="Latest period breakdown">
          {currencyPieData.length > 0 ? (
            <div className="flex items-start gap-4">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={currencyPieData} cx="50%" cy="50%" innerRadius={36} outerRadius={58}
                    dataKey="value" strokeWidth={0} startAngle={90} endAngle={-270}>
                    {currencyPieData.map((d: any) => (
                      <Cell key={d.name} fill={CURRENCY_COLORS[d.name] ?? CHART_COLORS.gray} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 pt-1">
                {currencyPieData.map((d: any) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CURRENCY_COLORS[d.name] ?? CHART_COLORS.gray }} />
                    <span className="text-xs font-semibold text-gray-700 w-10">{d.name}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: CURRENCY_COLORS[d.name] ?? CHART_COLORS.gray }} />
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">{d.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-8 text-center">No currency data available</p>
          )}
        </ChartCard>

        <ChartCard loading={mrL} title="Monthly Revenue">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyRevenue} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${v}`} width={36} />
              <Tooltip content={<TT />} />
              <Bar dataKey="total_revenue" name="Revenue" fill={CHART_COLORS.primary}
                radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Table */}
      <ChartCard loading={mrL} title="Revenue Detail" subtitle="Monthly breakdown">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-50">
                {['Month','Revenue','Volume','Transactions','Active Users','Rev/User','Avg Txn'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 pb-2.5 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...monthlyRevenue].reverse().map((row: any) => (
                <tr key={row.month} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-2.5 pr-4 font-semibold text-gray-700">{row.label}</td>
                  <td className="py-2.5 pr-4 font-mono">{formatCurrency(row.total_revenue ?? 0, { decimals: 2 })}</td>
                  <td className="py-2.5 pr-4 font-mono">{formatCurrency(row.total_volume ?? 0,  { compact: true })}</td>
                  <td className="py-2.5 pr-4">{formatNumber(row.total_transactions ?? 0)}</td>
                  <td className="py-2.5 pr-4">{row.active_users ?? '—'}</td>
                  <td className="py-2.5 pr-4 font-mono">{row.revenue_per_user != null ? formatCurrency(row.revenue_per_user, { decimals: 2 }) : '—'}</td>
                  <td className="py-2.5 pr-4 font-mono">{row.avg_transaction_amount != null ? formatCurrency(row.avg_transaction_amount, { compact: true }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}
