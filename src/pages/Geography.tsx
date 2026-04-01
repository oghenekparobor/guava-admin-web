import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import ChartCard from '../components/ChartCard'
import MetricCard from '../components/MetricCard'
import { NoApiState, ErrorBanner } from '../components/PageState'
import { Globe, Users, TrendingUp, MapPin } from 'lucide-react'
import { formatNumber, CHART_COLORS } from '../lib/utils'
import { HAS_API, useGeography, usePlatformHealth } from '../hooks/useDashboardData'

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-card-hover p-3 text-xs">
      <p className="font-semibold text-gray-600 mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

const GEO_COLORS = [
  '#16a34a','#4ade80','#86efac','#0ea5e9','#38bdf8','#7c3aed',
  '#a78bfa','#f59e0b','#fcd34d','#ef4444','#f87171','#6b7280','#d1d5db',
]

export default function Geography() {
  if (!HAS_API) return <NoApiState />

  const { data: geographyDistribution, loading: gL, error: gE, refetch: gR } = useGeography()
  const { data: platformHealth,        loading: phL                          } = usePlatformHealth()

  const top10 = geographyDistribution.filter((d: any) => d.country_code !== 'OTH').slice(0, 10)
  const pieData = geographyDistribution.slice(0, 6).map((d: any, i: number) => ({
    name: `${d.flag ?? ''} ${d.country}`,
    value: d.user_count,
    color: GEO_COLORS[i],
  }))
  const others = geographyDistribution.find((d: any) => d.country_code === 'OTH')
  if (others) pieData.push({ name: '🌍 Others', value: (others as any).user_count, color: GEO_COLORS[6] })

  const largestMarket = geographyDistribution[0] as any ?? {}

  return (
    <div className="page-enter space-y-5">
      {gE && <ErrorBanner message={gE} onRetry={gR} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard loading={gL}
          title="Countries Served"
          value={formatNumber(geographyDistribution.length)}
          subtitle="Active users across the globe"
          icon={Globe}
          iconBg="bg-guava-50" iconColor="text-guava-600"
        />
        <MetricCard loading={gL}
          title="Largest Market"
          value={largestMarket.country ?? '—'}
          subtitle={largestMarket.percentage != null ? `${largestMarket.percentage}% of users — ${largestMarket.user_count} accounts` : undefined}
          icon={MapPin}
          iconBg="bg-green-50" iconColor="text-green-600"
        />
        <MetricCard loading={phL}
          title="Total Users"
          value={formatNumber(platformHealth.total_users)}
          subtitle="Across all geographies"
          icon={Users}
          iconBg="bg-blue-50" iconColor="text-blue-600"
        />
        <MetricCard
          title="Currency Corridors"
          value="9"
          subtitle="NGN, USDC, USD, CHF, AED, ZAR, BRL, INR, SGD"
          icon={TrendingUp}
          iconBg="bg-purple-50" iconColor="text-purple-600"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <ChartCard loading={gL} title="Top 10 Countries" subtitle="By user count" className="col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={top10} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid horizontal={false} stroke="#f3f4f6" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="country" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} width={110}
                tickFormatter={(v) => {
                  const d = geographyDistribution.find((g: any) => g.country === v)
                  return d ? `${(d as any).flag ?? ''} ${v}` : v
                }}
              />
              <Tooltip content={<TT />} />
              <Bar dataKey="user_count" name="Users" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard loading={gL} title="Distribution" subtitle="Share of total users">
          <div className="flex flex-col items-center">
            <ResponsiveContainer width={130} height={130}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={58}
                  dataKey="value" strokeWidth={0} startAngle={90} endAngle={-270}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-1 mt-3">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-[10px] text-gray-600 flex-1 truncate">{d.name}</span>
                  <span className="text-[10px] font-bold text-gray-900">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      <ChartCard loading={gL} title="All Countries" subtitle="Complete geographic breakdown">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-50">
                {['#','Country','Users','Share','Verified','Verification Rate'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-gray-400 pb-2.5 pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {geographyDistribution.map((row: any, idx: number) => {
                const verRate = row.user_count > 0 ? (row.verified_users / row.user_count) * 100 : 0
                return (
                  <tr key={row.country_code} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 pr-6 text-gray-400 font-mono">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="py-2.5 pr-6">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{row.flag}</span>
                        <div>
                          <p className="font-semibold text-gray-800">{row.country}</p>
                          <p className="text-[10px] text-gray-400">{row.country_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-6 font-semibold text-gray-900">{formatNumber(row.user_count)}</td>
                    <td className="py-2.5 pr-6">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-guava-400 rounded-full" style={{ width: `${row.percentage}%` }} />
                        </div>
                        <span className="text-gray-600">{row.percentage}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-6">{row.verified_users ?? '—'}</td>
                    <td className="py-2.5 pr-6">
                      {verRate > 0
                        ? <span className={verRate >= 20 ? 'badge-positive' : 'badge-neutral'}>{verRate.toFixed(1)}%</span>
                        : <span className="text-gray-300 text-[10px]">—</span>
                      }
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
