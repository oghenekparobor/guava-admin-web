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
  iconBg = 'bg-guava-50', iconColor = 'text-guava-600',
  subtitle, className, size = 'md', loading,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className={cn('card-hover p-5 animate-pulse', size === 'sm' && 'p-4', className)}>
        <div className="flex items-start justify-between mb-3">
          <div className={cn('w-9 h-9 rounded-xl bg-gray-100', size === 'sm' && 'w-8 h-8')} />
          <div className="w-14 h-5 bg-gray-100 rounded-full" />
        </div>
        <div className="h-7 w-24 bg-gray-100 rounded-lg mb-2" />
        <div className="h-3 w-20 bg-gray-100 rounded" />
      </div>
    )
  }

  const hasChange  = change !== undefined
  const ChangeIcon = !hasChange ? null : change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus
  const changeCls  = !hasChange ? '' : change > 0 ? 'badge-positive' : change < 0 ? 'badge-negative' : 'badge-neutral'

  return (
    <div className={cn('card-hover p-5', size === 'sm' && 'p-4', className)}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', iconBg, size === 'sm' && 'w-8 h-8 rounded-lg')}>
          <Icon size={size === 'sm' ? 15 : 17} className={iconColor} strokeWidth={2} />
        </div>
        {hasChange && ChangeIcon && (
          <span className={cn(changeCls, 'flex-shrink-0')}>
            <ChangeIcon size={10} strokeWidth={2.5} />
            {formatPercent(Math.abs(change))}
          </span>
        )}
      </div>
      <p className={cn('font-bold text-gray-900 leading-none mb-1', size === 'sm' ? 'text-xl' : 'text-2xl')}>{value}</p>
      <p className="text-xs font-medium text-gray-500">{title}</p>
      {(changeLabel || subtitle) && (
        <p className="text-[10px] text-gray-400 mt-1">{changeLabel || subtitle}</p>
      )}
    </div>
  )
}
