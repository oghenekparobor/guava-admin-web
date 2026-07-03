import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import ChartCard from '../components/ChartCard'
import MetricCard from '../components/MetricCard'
import { NoApiState, ErrorBanner } from '../components/PageState'
import Subheader from '../components/Subheader'
import { Globe, Users, ShieldCheck, Coins } from 'lucide-react'
import { formatNumber, formatPercent, CHART_COLORS } from '../lib/utils'
import { HAS_API, useGeography, useGeographyByKyc, usePlatformHealth } from '../hooks/useDashboardData'

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-xl shadow-card-hover p-3 text-xs">
      <p className="font-semibold text-muted mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{p.name}:</span>
          <span className="font-semibold text-ink">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

const PALETTE = [
  '#F2FD7D','#48DAB1','#A8E6A0','#79BACB','#8FD3C4','#AAC0F2',
  '#C2B6F0','#F2D08A','#D4A441','#F4A988','#E88AA6','#8A968F',
]

export default function Geography() {
  if (!HAS_API) return <NoApiState />

  // NOTE: the legacy "user-distribution" endpoint is a CURRENCY distribution
  // (users.country_code holds an ISO-4217 currency by design). True geography
  // comes from KYC records via the /by-kyc/ endpoint.
  const { data: currencyDist, loading: gL, error: gE, refetch: gR } = useGeography()
  const { data: kycGeo,       loading: kL                          } = useGeographyByKyc()
  const { data: platformHealth, loading: phL                       } = usePlatformHealth()

  const top = currencyDist
    .filter((d: any) => !['OTHER', 'UNKNOWN'].includes(d.currency_code))
    .slice(0, 10)
  const pieData = currencyDist.slice(0, 7).map((d: any, i: number) => ({
    name: d.currency_code,
    value: d.user_count,
    color: PALETTE[i % PALETTE.length],
  }))

  const largest = currencyDist[0] as any ?? {}
  const coverage = kycGeo.coverage
  const coveragePct = coverage.total_users
    ? (coverage.users_with_kyc_geo / coverage.total_users) * 100
    : 0

  return (
    <div className="page-enter space-y-5">
      <Subheader title="Geography" />
      {gE && <ErrorBanner message={gE} onRetry={gR} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard loading={gL}
          title="Currencies"
          value={formatNumber(currencyDist.length)}
          subtitle="Distinct account currencies"
          icon={Coins}
          iconBg="bg-lime/15" iconColor="text-lime"
        />
        <MetricCard loading={gL}
          title="Largest Currency"
          value={largest.currency_code ?? '—'}
          subtitle={largest.percentage != null ? `${largest.percentage}% of users — ${largest.user_count} accounts` : undefined}
          icon={Globe}
          iconBg="bg-positive/15" iconColor="text-positive"
        />
        <MetricCard loading={phL}
          title="Total Users"
          value={formatNumber(platformHealth.total_users)}
          subtitle="Across all currencies"
          icon={Users}
          iconBg="bg-info/15" iconColor="text-info"
        />
        <MetricCard loading={kL}
          title="KYC Geo Coverage"
          value={formatPercent(coveragePct)}
          subtitle={`${formatNumber(coverage.users_with_kyc_geo)} of ${formatNumber(coverage.total_users)} users have a KYC country`}
          icon={ShieldCheck}
          iconBg="bg-white/10" iconColor="text-[#C2B6F0]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard loading={gL} title="Top Currencies" subtitle="By user count" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={top} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid horizontal={false} stroke="#38564F" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="currency_code" tick={{ fontSize: 10, fill: '#8A968F' }} axisLine={false} tickLine={false} width={64} />
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
                  <span className="text-[10px] text-muted flex-1 truncate">{d.name}</span>
                  <span className="text-[10px] font-bold text-ink">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      <ChartCard loading={gL} title="Currency Distribution" subtitle="Accounts by currency (country_code is a currency by design)">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['#','Currency','Users','Share','Verified','Verification Rate'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-faint pb-2.5 pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {currencyDist.map((row: any, idx: number) => (
                <tr key={row.currency_code} className="hover:bg-white/5 transition-colors">
                  <td className="py-2.5 pr-6 text-faint font-mono">{String(idx + 1).padStart(2, '0')}</td>
                  <td className="py-2.5 pr-6 font-semibold text-ink">{row.currency_code}</td>
                  <td className="py-2.5 pr-6 font-semibold text-ink">{formatNumber(row.user_count)}</td>
                  <td className="py-2.5 pr-6">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-lime rounded-full" style={{ width: `${row.percentage}%` }} />
                      </div>
                      <span className="text-muted">{row.percentage}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-6">{row.verified_users ?? '—'}</td>
                  <td className="py-2.5 pr-6">
                    {row.verified_percentage > 0
                      ? <span className={row.verified_percentage >= 20 ? 'badge-positive' : 'badge-neutral'}>{row.verified_percentage}%</span>
                      : <span className="text-faint text-[10px]">—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <ChartCard loading={kL} title="True Geography (KYC)"
        subtitle={`Sourced from KYC records — ${formatNumber(coverage.users_with_kyc_geo)} of ${formatNumber(coverage.total_users)} users`}>
        {kycGeo.results.length === 0 ? (
          <p className="text-xs text-faint py-6 text-center">No KYC geography on record yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Country','Users','Share'].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-faint pb-2.5 pr-6">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {kycGeo.results.map((row) => (
                  <tr key={row.country} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 pr-6 font-semibold text-ink">{row.country}</td>
                    <td className="py-2.5 pr-6 text-ink">{formatNumber(row.user_count)}</td>
                    <td className="py-2.5 pr-6 text-muted">{row.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  )
}
