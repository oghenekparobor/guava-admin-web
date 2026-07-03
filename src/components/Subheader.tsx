import { Smile, ArrowDown } from 'lucide-react'

interface SubheaderProps {
  title: string
  subtitle?: string
  health?: { uptime: number; errorRate: number }
}

export default function Subheader({ title, subtitle, health }: SubheaderProps) {
  const now = new Date()
  const weekday = now.toLocaleString('en', { weekday: 'short' })
  const month = now.toLocaleString('en', { month: 'long' })

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-lg font-extrabold text-ink">
          {now.getDate()}
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-ink">{title}</p>
          <p className="text-xs text-muted">{subtitle ?? `${weekday} · ${month}`}</p>
        </div>
      </div>

      {health && (
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-xs font-semibold text-muted">System health</span>
          <div className="w-11 h-11 rounded-full bg-positive/20 flex items-center justify-center">
            <Smile size={22} className="text-positive" strokeWidth={2} />
          </div>
          <div className="leading-tight">
            <p className="text-lg font-extrabold text-ink tracking-tight">{health.uptime}%</p>
            <p className="text-[11px] text-faint">uptime</p>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex items-center gap-1.5">
            <ArrowDown size={13} className="text-negative" />
            <span className="text-sm font-bold text-negative">{health.errorRate}%</span>
            <span className="text-xs text-faint">error rate</span>
          </div>
        </div>
      )}
    </div>
  )
}
