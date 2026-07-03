import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react'
import { cn, formatPercent } from '../lib/utils'

interface MetricCardProps {
  title: string
  value: string
  change?: number
  changeLabel?: string
  icon: LucideIcon
  iconBg?: string
  iconColor?: string
  subtitle?: string
  className?: string
  size?: 'sm' | 'md'
  loading?: boolean
}

export default function MetricCard({
  title, value, change, changeLabel, icon: Icon,
  iconBg = 'bg-lime/15', iconColor = 'text-lime',
  subtitle, className, size = 'md', loading,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className={cn('card-hover p-5 animate-pulse', size === 'sm' && 'p-4', className)}>
        <div className="flex items-start justify-between mb-3">
          <div className={cn('w-9 h-9 rounded-xl bg-white/10', size === 'sm' && 'w-8 h-8')} />
          <div className="w-14 h-5 bg-white/10 rounded-full" />
        </div>
        <div className="h-7 w-24 bg-white/10 rounded-lg mb-2" />
        <div className="h-3 w-20 bg-white/10 rounded" />
      </div>
    )
  }

  const hasChange  = change !== undefined
  const ChangeIcon = !hasChange ? null : change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus
  const changeCls  = !hasChange ? '' : change > 0 ? 'badge-positive' : change < 0 ? 'badge-negative' : 'badge-neutral'

  return (
    <div className={cn('card-hover p-5 flex flex-col justify-between', size === 'sm' && 'p-4', className)}>
      <div className="flex items-start justify-between mb-5">
        <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0', iconBg, size === 'sm' && 'w-9 h-9 rounded-xl')}>
          <Icon size={size === 'sm' ? 16 : 18} className={iconColor} strokeWidth={2} />
        </div>
        {hasChange && ChangeIcon && (
          <span className={cn(changeCls, 'flex-shrink-0')}>
            <ChangeIcon size={10} strokeWidth={2.5} />
            {formatPercent(Math.abs(change))}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-medium text-muted mb-1.5">{title}</p>
        <p className={cn('font-extrabold text-ink leading-none tracking-tight', size === 'sm' ? 'text-2xl' : 'text-[26px]')}>{value}</p>
        {(changeLabel || subtitle) && (
          <p className="text-[10px] text-faint mt-2">{changeLabel || subtitle}</p>
        )}
      </div>
    </div>
  )
}
