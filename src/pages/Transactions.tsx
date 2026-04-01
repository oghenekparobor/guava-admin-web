import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import type { Period } from '../App'
import ChartCard from '../components/ChartCard'
import MetricCard from '../components/MetricCard'
import { NoApiState, ErrorBanner } from '../components/PageState'
import { ArrowLeftRight, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatCurrency, formatNumber, CHART_COLORS } from '../lib/utils'
import {
  HAS_API,
  useWeeklyRevenue, useMonthlyRevenue, useQuarterlyRevenue,
  useMonthlyVolume, useBankTransfers,
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

  const typeData = [
    { name: 'Bank Transfer', value: 99, color: CHART_COLORS.primary  },
    { name: 'Wallet',        value: 1,  color: CHART_COLORS.secondary },
  ]

  return (
    <div className="page-enter space-y-5">
      {mrE && <ErrorBanner message={mrE} onRetry={mrR} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard loading={mrL}
          title="Transactions (30d)"
          value={formatNumber(latest.total_transactions ?? 0)}
          change={pct(latest.total_transactions ?? 0, prev.total_transactions ?? 0)}
          changeLabel="vs last month"
          icon={ArrowLeftRight}
          iconBg="bg-blue-50" iconColor="text-blue-600"
        />
        <MetricCard loading={mrL}
          title="Total Volume (30d)"
          value={formatCurrency(latest.total_volume ?? 0, { compact: true })}
          change={pct(latest.total_volume ?? 0, prev.total_volume ?? 0)}
          changeLabel="vs last month"
          icon={TrendingUp}
          iconBg="bg-guava-50" iconColor="text-guava-600"
        />
        <MetricCard loading={mrL}
          title="Avg Transaction Size"
          value={formatCurrency(latest.avg_transaction_amount ?? 0, { compact: true })}
          change={pct(latest.avg_transaction_amount ?? 0, prev.avg_transaction_amount ?? 0)}
          changeLabel="vs last month"
          icon={CheckCircle2}
          iconBg="bg-purple-50" iconColor="text-purple-600"
        />
        <MetricCard loading={btL}
          title="Bank Transfer Success"
          value={`${latestB.success_rate_percentage ?? 0}%`}
          change={(latestB.success_rate_percentage ?? 0) - (prevB.success_rate_percentage ?? 0)}
          changeLabel="vs last month"
          icon={AlertCircle}
          iconBg="bg-red-50" iconColor="text-red-500"
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
            <CartesianGrid vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1_000_000 ? `$${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`} width={48} />
            <Tooltip content={<TT />} />
            <Area type="monotone" dataKey="volume" name="Volume" stroke={CHART_COLORS.accent}
              strokeWidth={2} fill="url(#volG2)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-2 gap-4">
        <ChartCard title="Transaction Types" subtitle="By payment method">
          <div className="flex items-center gap-4 mt-2">
            <ResponsiveContainer width={90} height={90}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={26} outerRadius={42} dataKey="value" strokeWidth={0}>
                  {typeData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5">
              {typeData.map(d => (
                <div key={d.name}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-xs text-gray-600 font-medium">{d.name}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 ml-4">{d.value}%</p>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard loading={btL} title="Bank Transfer Success Rate" subtitle="Monthly trend">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={bankTransfers} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={v => `${v}%`} width={32} domain={[0, 100]} />
              <Tooltip content={<TT />} />
              <Bar dataKey="success_rate_percentage" name="Success Rate %" radius={[3, 3, 0, 0]} maxBarSize={24} fill={CHART_COLORS.primary} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard loading={mvL} title="Volume by Transaction Type" subtitle="Bank Transfer vs Wallet (monthly)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyVolume} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
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
              <tr className="border-b border-gray-50">
                {['Month','Transactions','Volume','Revenue','Avg Size','Active Users','Rev/User'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 pb-2.5 pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...monthlyRevenue].reverse().map((row: any) => (
                <tr key={row.month} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-2.5 pr-6 font-semibold text-gray-700">{row.label}</td>
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
    </div>
  )
}
