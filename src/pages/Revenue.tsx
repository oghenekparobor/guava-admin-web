import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ComposedChart,
} from 'recharts'
import type { Period } from '../App'
import ChartCard from '../components/ChartCard'
import MetricCard from '../components/MetricCard'
import { NoApiState, ErrorBanner } from '../components/PageState'
import Subheader from '../components/Subheader'
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
    <div className="bg-surface border border-border rounded-xl shadow-card-hover p-3 text-xs">
      <p className="font-semibold text-muted mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{p.name}:</span>
          <span className="font-semibold text-ink">
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

  // The endpoint returns one row per (month, currency). Aggregate into per-
  // currency totals so each denomination appears once with its revenue (USDC),
  // native volume, and transaction count — not a slice per month.
  const currencyBreakdown = (() => {
    const m = new Map<string, { currency: string; revenue: number; volume: number; txns: number }>()
    for (const r of revenueByCurrency as any[]) {
      const cur = r.currency ?? 'UNKNOWN'
      const e = m.get(cur) ?? { currency: cur, revenue: 0, volume: 0, txns: 0 }
      e.revenue += Number(r.total_revenue) || 0
      e.volume += Number(r.total_volume) || 0
      e.txns += Number(r.transaction_count) || 0
      m.set(cur, e)
    }
    return [...m.values()].sort((a, b) => b.revenue - a.revenue)
  })()
  const totalCurRev = currencyBreakdown.reduce((a, c) => a + c.revenue, 0) || 1
  const curColor = (c: string) => CURRENCY_COLORS[c] ?? CHART_COLORS.gray

  const errors = [wrE, mrE].filter(Boolean)

  const rrCards = [
    { label: 'MRR',  sublabel: 'Monthly Revenue Run Rate',   value: formatCurrency(runRates.mrr,  { decimals: 2 }), change: runRates.mrr_growth, desc: 'Last full month',  color: 'text-lime',  bg: 'bg-lime/15'  },
    { label: 'ARR',  sublabel: 'Annual Revenue Run Rate',     value: formatCurrency(runRates.arr,  { decimals: 2 }), change: runRates.mrr_growth, desc: 'MRR × 12',        color: 'text-info',   bg: 'bg-info/15'   },
    { label: 'QRR',  sublabel: 'Quarterly Revenue Run Rate',  value: formatCurrency(runRates.qrr,  { decimals: 2 }), change: runRates.mrr_growth, desc: 'MRR × 3',         color: 'text-[#C2B6F0]', bg: 'bg-white/10' },
    { label: 'WRR',  sublabel: 'Weekly Revenue Run Rate',     value: formatCurrency(runRates.wrr,  { decimals: 2 }), change: runRates.mrr_growth, desc: 'Weekly avg × 52', color: 'text-warning', bg: 'bg-warning/15' },
  ]

  return (
    <div className="page-enter space-y-5">
      <Subheader title="Revenue Analytics" />
      {errors.length > 0 && <ErrorBanner message={errors[0]!} />}

      {/* Run rate cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {rrCards.map(r => (
          <div key={r.label} className={cn('card-hover p-5', rrL && 'animate-pulse')}>
            {rrL ? (
              <>
                <div className="w-10 h-5 bg-white/10 rounded mb-3" />
                <div className="h-7 w-24 bg-white/10 rounded mb-2" />
                <div className="h-3 w-32 bg-white/10 rounded" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-lg', r.bg, r.color)}>{r.label}</span>
                  {r.change > 0
                    ? <ArrowUpRight size={14} className="text-lime" />
                    : <ArrowDownRight size={14} className="text-negative" />
                  }
                </div>
                <p className="text-2xl font-bold text-ink leading-none">{r.value}</p>
                <p className="text-xs font-medium text-muted mt-1">{r.sublabel}</p>
                <p className="text-[10px] text-faint mt-0.5">{r.desc}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Volume run rates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { label: 'Monthly Volume Run Rate',  value: formatCurrency(runRates.mvrr,  { compact: true }), sub: 'Based on latest month' },
          { label: 'Annual Volume Run Rate',    value: formatCurrency(runRates.avrr,  { compact: true }), sub: 'Monthly × 12'          },
          { label: 'Previous MRR',              value: formatCurrency(runRates.prev_mrr, { decimals: 2 }), sub: 'Month before latest'  },
        ].map(r => (
          <div key={r.label} className={cn('card-hover p-5', rrL && 'animate-pulse')}>
            {rrL ? (
              <><div className="h-3 w-32 bg-white/10 rounded mb-2" /><div className="h-7 w-20 bg-white/10 rounded" /></>
            ) : (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-faint mb-2">{r.label}</p>
                <p className="text-2xl font-bold text-ink">{r.value}</p>
                <p className="text-xs text-faint mt-1">{r.sub}</p>
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
            <CartesianGrid vertical={false} stroke="#38564F" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="rev" tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false}
              tickFormatter={v => `$${v}`} width={40} />
            <YAxis yAxisId="txn" orientation="right" tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false} width={30} />
            <Tooltip content={<TT />} />
            <Area yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke={CHART_COLORS.primary}
              strokeWidth={2} fill="url(#revGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            <Bar yAxisId="txn" dataKey="transactions" name="Transactions" fill={CHART_COLORS.secondary}
              opacity={0.3} radius={[2, 2, 0, 0]} maxBarSize={20} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard loading={rcL} title="Revenue by Currency" subtitle="Share of revenue by denomination">
          {currencyBreakdown.length > 0 ? (
            <div className="space-y-4">
              {/* Single 100%-wide share bar: revenue split across denominations. */}
              <div className="flex h-3 rounded-full overflow-hidden bg-white/5">
                {currencyBreakdown.map((c) => (
                  <div key={c.currency}
                    className="h-full first:rounded-l-full last:rounded-r-full"
                    style={{ width: `${(c.revenue / totalCurRev) * 100}%`, background: curColor(c.currency) }}
                    title={`${c.currency} · ${((c.revenue / totalCurRev) * 100).toFixed(1)}%`} />
                ))}
              </div>

              {/* Per-denomination detail: revenue (USDC), native volume, txns. */}
              <div className="space-y-2.5">
                {currencyBreakdown.map((c) => (
                  <div key={c.currency}
                    className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: curColor(c.currency) }} />
                    <div className="w-14 flex-shrink-0">
                      <p className="text-sm font-bold text-ink leading-none">{c.currency}</p>
                      <p className="text-[10px] text-faint mt-1">{((c.revenue / totalCurRev) * 100).toFixed(1)}% of rev</p>
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-2 text-right">
                      <div>
                        <p className="text-[10px] text-faint uppercase tracking-wider">Revenue</p>
                        <p className="text-xs font-mono font-semibold text-ink mt-0.5">{formatCurrency(c.revenue, { decimals: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-faint uppercase tracking-wider">Volume</p>
                        <p className="text-xs font-mono text-muted mt-0.5">
                          {c.currency === 'NGN' ? '₦' + formatNumber(c.volume) : formatCurrency(c.volume, { compact: true })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-faint uppercase tracking-wider">Txns</p>
                        <p className="text-xs font-mono text-muted mt-0.5">{formatNumber(c.txns)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-faint py-8 text-center">No currency data available</p>
          )}
        </ChartCard>

        <ChartCard loading={mrL} title="Monthly Revenue">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyRevenue} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#38564F" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false}
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
              <tr className="border-b border-border">
                {['Month','Revenue (USDC)','Volume (USDC)','Fiat (NGN)','Transactions','Active Users','Rev/User','Avg Fee'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-faint pb-2.5 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...monthlyRevenue].reverse().map((row: any) => (
                <tr key={row.month} className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5 pr-4 font-semibold text-muted whitespace-nowrap">
                    {row.label} {String(row.month).split('-')[0]}
                    {row.is_partial && <span className="ml-1.5 badge-neutral">partial</span>}
                  </td>
                  <td className="py-2.5 pr-4 font-mono">{formatCurrency(row.total_revenue ?? 0, { decimals: 2 })}</td>
                  <td className="py-2.5 pr-4 font-mono">{formatCurrency(row.total_volume ?? 0,  { compact: true })}</td>
                  <td className="py-2.5 pr-4 font-mono text-muted">{row.fiat_volume_ngn != null ? '₦' + formatNumber(row.fiat_volume_ngn) : '—'}</td>
                  <td className="py-2.5 pr-4">{formatNumber(row.total_transactions ?? 0)}</td>
                  <td className="py-2.5 pr-4">{row.active_users ?? '—'}</td>
                  <td className="py-2.5 pr-4 font-mono">{row.revenue_per_user != null ? formatCurrency(row.revenue_per_user, { decimals: 2 }) : '—'}</td>
                  <td className="py-2.5 pr-4 font-mono">{row.avg_fee_per_transaction != null ? formatCurrency(row.avg_fee_per_transaction, { decimals: 2 }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}
