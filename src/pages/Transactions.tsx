import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { Period } from '../App'
import ChartCard from '../components/ChartCard'
import MetricCard from '../components/MetricCard'
import { NoApiState, ErrorBanner } from '../components/PageState'
import Subheader from '../components/Subheader'
import { ArrowLeftRight, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatCurrency, formatNumber, formatPercent, CHART_COLORS } from '../lib/utils'
import {
  HAS_API,
  useWeeklyRevenue, useMonthlyRevenue, useQuarterlyRevenue,
  useMonthlyVolume, useBankTransfers, useDepositsByChannel,
} from '../hooks/useDashboardData'

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
            {String(p.name).toLowerCase().includes('volume') || String(p.name).toLowerCase().includes('amount')
              ? formatCurrency(p.value, { compact: true })
              : p.name.includes('%') ? `${p.value}%` : formatNumber(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

interface TxProps { period: Period }

export default function Transactions({ period }: TxProps) {
  if (!HAS_API) return <NoApiState />

  const { data: weeklyRevenue,    loading: wrL               } = useWeeklyRevenue()
  const { data: monthlyRevenue,   loading: mrL, error: mrE, refetch: mrR } = useMonthlyRevenue()
  const { data: quarterlyRevenue, loading: qrL               } = useQuarterlyRevenue()
  const { data: monthlyVolume,    loading: mvL               } = useMonthlyVolume()
  const { data: bankTransfers,    loading: btL               } = useBankTransfers()
  const { data: depositsByChannel, loading: dcL              } = useDepositsByChannel()

  // Latest-month category breakdown (labeled by denomination).
  const latestRow = monthlyVolume.length ? monthlyVolume[monthlyVolume.length - 1] : null
  const latestMonth = latestRow?.month ?? null
  const latestMonthLabel = latestRow ? `${latestRow.label} ${String(latestMonth).slice(0, 4)}` : null
  const latestCategories = monthlyVolume.filter((d: any) => d.month === latestMonth)

  const isChartLoading =
    period === 'weekly'    ? wrL :
    period === 'quarterly' ? qrL : mrL

  const volumeData =
    period === 'weekly'    ? weeklyRevenue.map((d: any) => ({ label: d.label, volume: d.total_volume ?? d.volume ?? 0, transactions: d.transaction_count ?? 0 })) :
    period === 'quarterly' ? quarterlyRevenue.map((d: any) => ({ label: d.label, volume: d.total_volume ?? 0, transactions: d.total_transactions ?? 0 })) :
    monthlyRevenue.map((d: any) => ({ label: d.label, volume: d.total_volume ?? 0, transactions: d.total_transactions ?? 0 }))

  const latest  = monthlyRevenue[monthlyRevenue.length - 1] as any ?? {}
  const prev    = monthlyRevenue[monthlyRevenue.length - 2] as any ?? {}
  const latestB = bankTransfers[bankTransfers.length - 1] as any ?? {}
  const prevB   = bankTransfers[bankTransfers.length - 2] as any ?? {}

  const pct = (a: number, b: number) => b ? ((a - b) / b) * 100 : 0

  // Payment-method split, field-tolerant across backend shapes.
  const catName = (r: any) => String(r.transaction_category ?? r.category ?? r.transaction_type ?? '').toUpperCase()
  const catCount = (r: any) => Number(r.transaction_count ?? r.count ?? 0)
  const buildShares = (rows: any[]) => {
    const byCat = new Map<string, number>()
    for (const r of rows) {
      const cat = catName(r)
      if (!cat) continue
      byCat.set(cat, (byCat.get(cat) ?? 0) + catCount(r))
    }
    const entries = [...byCat.entries()].filter(([, c]) => c > 0)
    const total = entries.reduce((s, [, c]) => s + c, 0) || 1
    const color = (cat: string) => cat.startsWith('WALLET') ? CHART_COLORS.secondary : cat.startsWith('BANK') ? CHART_COLORS.primary : cat.startsWith('DEPOSIT') ? CHART_COLORS.tertiary : CHART_COLORS.accent
    const nice = (cat: string) => cat.charAt(0) + cat.slice(1).toLowerCase()
    return entries.map(([name, count]) => ({ name: nice(name), pct: Math.round((count / total) * 100), color: color(name) }))
  }
  // Prefer the latest month; fall back to all months. Empty when the backend
  // returns no category data.
  const typeShares = buildShares(latestCategories.length ? latestCategories : monthlyVolume)

  // Pivot the long category-volume rows (one per month × category) into the
  // wide shape the stacked bar needs: { label, bank_transfer, wallet } per month.
  // NOTE: bank volume is NGN and wallet volume is USDC — different denominations
  // on one axis, so NGN dominates the scale.
  const volumeByType = (() => {
    const byMonth = new Map<string, { label: string; month: string; bank_transfer: number; wallet: number }>()
    for (const r of monthlyVolume as any[]) {
      const cat = String(r.transaction_category ?? '').toUpperCase()
      const vol = Number(r.total_volume ?? 0)
      const cur = byMonth.get(r.month) ?? { label: r.label ?? r.month, month: r.month, bank_transfer: 0, wallet: 0 }
      if (cat.startsWith('BANK')) cur.bank_transfer += vol
      else if (cat.startsWith('WALLET')) cur.wallet += vol
      byMonth.set(r.month, cur)
    }
    return [...byMonth.values()]
  })()

  return (
    <div className="page-enter space-y-5">
      <Subheader title="Transactions" />
      {mrE && <ErrorBanner message={mrE} onRetry={mrR} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard loading={mrL}
          title="Transactions (30d)"
          value={formatNumber(latest.total_transactions ?? 0)}
          change={pct(latest.total_transactions ?? 0, prev.total_transactions ?? 0)}
          changeLabel="vs last month"
          icon={ArrowLeftRight}
          iconBg="bg-info/15" iconColor="text-info"
        />
        <MetricCard loading={mrL}
          title="Total Volume (30d)"
          value={formatCurrency(latest.total_volume ?? 0, { compact: true })}
          change={pct(latest.total_volume ?? 0, prev.total_volume ?? 0)}
          changeLabel="vs last month"
          icon={TrendingUp}
          iconBg="bg-lime/15" iconColor="text-lime"
        />
        <MetricCard loading={mrL}
          title="Avg Transaction Size"
          value={formatCurrency(latest.avg_transaction_amount ?? 0, { compact: true })}
          change={pct(latest.avg_transaction_amount ?? 0, prev.avg_transaction_amount ?? 0)}
          changeLabel="vs last month"
          icon={CheckCircle2}
          iconBg="bg-white/10" iconColor="text-[#C2B6F0]"
        />
        <MetricCard loading={btL}
          title="Bank Transfer Success"
          value={`${latestB.success_rate_percentage ?? 0}%`}
          change={(latestB.success_rate_percentage ?? 0) - (prevB.success_rate_percentage ?? 0)}
          changeLabel="vs last month"
          icon={AlertCircle}
          iconBg="bg-negative/15" iconColor="text-negative"
        />
      </div>

      <ChartCard loading={isChartLoading} title="Transaction Volume Over Time" subtitle="Volume over time">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={volumeData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="volG2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={CHART_COLORS.accent} stopOpacity={0.12} />
                <stop offset="95%" stopColor={CHART_COLORS.accent} stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#38564F" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`} width={48} />
            <Tooltip content={<TT />} />
            <Area type="monotone" dataKey="volume" name="Volume" stroke={CHART_COLORS.accent}
              strokeWidth={2} fill="url(#volG2)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Transaction Types" subtitle="By payment method">
          <div className="mt-2">
            <div className="flex gap-1.5 mb-1.5 text-[11px] font-semibold">
              {typeShares.map(s => (
                <span key={s.name} style={{ width: `${s.pct}%`, color: s.color }}>{s.pct}%</span>
              ))}
            </div>
            <div className="flex gap-1.5 h-8">
              {typeShares.map(s => (
                <div key={s.name} style={{ width: `${s.pct}%`, background: s.color }} className="rounded-lg" />
              ))}
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-xs">
              {typeShares.map(s => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-muted">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard loading={btL} title="Bank Transfer Success Rate" subtitle="Monthly trend">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={bankTransfers} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#38564F" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`} width={32} domain={[0, 100]} />
              <Tooltip content={<TT />} />
              <Bar dataKey="success_rate_percentage" name="Success Rate %" radius={[3, 3, 0, 0]} maxBarSize={24} fill={CHART_COLORS.primary} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard loading={mvL} title="Volume by Transaction Type" subtitle="Bank Transfer (NGN) vs Wallet (USDC), monthly">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={volumeByType} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#38564F" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`} width={48} />
            <Tooltip content={<TT />} />
            <Bar dataKey="bank_transfer" name="Bank Transfer Volume" stackId="a" fill={CHART_COLORS.primary}  maxBarSize={32} />
            <Bar dataKey="wallet"        name="Wallet Volume"        stackId="a" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard loading={mrL} title="Monthly Transaction Detail">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['Month','Transactions','Volume','Revenue','Avg Size','Active Users','Rev/User'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-faint pb-2.5 pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...monthlyRevenue].reverse().map((row: any) => (
                <tr key={row.month} className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5 pr-6 font-semibold text-muted">{row.label}</td>
                  <td className="py-2.5 pr-6">{formatNumber(row.total_transactions ?? 0)}</td>
                  <td className="py-2.5 pr-6 font-mono">{formatCurrency(row.total_volume ?? 0, { compact: true })}</td>
                  <td className="py-2.5 pr-6 font-mono">{formatCurrency(row.total_revenue ?? 0, { decimals: 2 })}</td>
                  <td className="py-2.5 pr-6 font-mono">{row.avg_transaction_amount != null ? formatCurrency(row.avg_transaction_amount, { compact: true }) : '—'}</td>
                  <td className="py-2.5 pr-6">{row.active_users ?? '—'}</td>
                  <td className="py-2.5 pr-6 font-mono">{row.revenue_per_user != null ? formatCurrency(row.revenue_per_user, { decimals: 2 }) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard loading={dcL} title="Deposits by Channel" subtitle="Unified PAJ + Bridge, per currency">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Channel','Cur','Count','Amount','30d','Success'].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-faint pb-2.5 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {depositsByChannel.map((row: any) => (
                  <tr key={`${row.channel}-${row.currency}`} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 pr-4 font-semibold text-ink">{row.channel}</td>
                    <td className="py-2.5 pr-4 text-muted">{row.currency}</td>
                    <td className="py-2.5 pr-4">{formatNumber(row.total_count ?? 0)}</td>
                    <td className="py-2.5 pr-4 font-mono">{row.currency === 'NGN' ? '₦' + formatNumber(row.total_amount ?? 0) : formatCurrency(row.total_amount ?? 0, { decimals: 2 })}</td>
                    <td className="py-2.5 pr-4 text-muted">{formatNumber(row.count_30d ?? 0)}</td>
                    <td className="py-2.5 pr-4">
                      <span className={(row.success_rate_percentage ?? 0) >= 90 ? 'badge-positive' : 'badge-warning'}>{row.success_rate_percentage}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard loading={mvL} title="Category Volume by Denomination"
          subtitle={latestMonthLabel ? `Latest month · ${latestMonthLabel}` : undefined}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Category','Denomination','Count','Volume','Fees','MoM Volume'].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-faint pb-2.5 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {latestCategories.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 pr-4 font-semibold text-ink">{row.transaction_category}</td>
                    <td className="py-2.5 pr-4">
                      <span className={row.denomination === 'USDC' ? 'badge-positive' : 'badge-neutral'}>{row.denomination}</span>
                    </td>
                    <td className="py-2.5 pr-4">{formatNumber(row.transaction_count ?? 0)}</td>
                    <td className="py-2.5 pr-4 font-mono">{row.denomination === 'NGN' ? '₦' + formatNumber(row.total_volume ?? 0) : formatCurrency(row.total_volume ?? 0, { decimals: 2 })}</td>
                    <td className="py-2.5 pr-4 font-mono text-muted">{formatCurrency(row.total_fees ?? 0, { decimals: 2 })}</td>
                    <td className="py-2.5 pr-4">
                      {row.volume_growth_percentage != null ? (
                        <span className={row.volume_growth_percentage > 0 ? 'badge-positive' : row.volume_growth_percentage < 0 ? 'badge-negative' : 'badge-neutral'}>
                          {formatPercent(row.volume_growth_percentage)}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
