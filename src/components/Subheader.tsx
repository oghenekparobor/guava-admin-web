import { Smile, AlertTriangle } from 'lucide-react'

interface SubheaderProps {
  title: string
  subtitle?: string
  /** Live system status from GET /health/system/. */
  health?: { status: string; ok: number; total: number }
}

export default function Subheader({ title, subtitle, health }: SubheaderProps) {
  const now = new Date()
  const weekday = now.toLocaleString('en', { weekday: 'short' })
  const month = now.toLocaleString('en', { month: 'long' })

  const healthy = health?.status === 'healthy'
  const statusLabel = health
    ? health.status.charAt(0).toUpperCase() + health.status.slice(1)
    : ''

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
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${healthy ? 'bg-positive/20' : 'bg-warning/20'}`}>
            {healthy
              ? <Smile size={22} className="text-positive" strokeWidth={2} />
              : <AlertTriangle size={20} className="text-warning" strokeWidth={2} />}
          </div>
          <div className="leading-tight">
            <p className={`text-lg font-extrabold tracking-tight ${healthy ? 'text-ink' : 'text-warning'}`}>{statusLabel}</p>
            <p className="text-[11px] text-faint">overall status</p>
          </div>
          {health.total > 0 && (
            <>
              <div className="w-px h-6 bg-border" />
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${healthy ? 'bg-positive animate-pulse' : 'bg-warning'}`} />
                <span className="text-sm font-bold text-ink">{health.ok}/{health.total}</span>
                <span className="text-xs text-faint">services up</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
