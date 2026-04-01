import { cn } from '../lib/utils'

interface ChartCardProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  loading?: boolean
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-2 pt-2">
      <div className="flex items-end gap-1 h-32">
        {[65, 40, 80, 55, 90, 45, 70, 60, 85, 50, 75, 35].map((h, i) => (
          <div key={i} className="flex-1 bg-gray-100 rounded-t-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="flex gap-4 pt-1">
        <div className="h-2 w-8 bg-gray-100 rounded" />
        <div className="h-2 w-8 bg-gray-100 rounded" />
        <div className="h-2 w-8 bg-gray-100 rounded" />
      </div>
    </div>
  )
}

export default function ChartCard({
  title, subtitle, action, children, className, bodyClassName, loading,
}: ChartCardProps) {
  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className="flex items-start justify-between px-5 pt-5 pb-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      <div className={cn('px-5 pb-5 pt-4', bodyClassName)}>
        {loading ? <ChartSkeleton /> : children}
      </div>
    </div>
  )
}
