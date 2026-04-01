import { Bell, Search, LogOut } from 'lucide-react'
import type { Page, Period } from '../App'
import { cn } from '../lib/utils'
import { useAuth } from '../context/AuthContext'

const PAGE_TITLES: Record<Page, string> = {
  overview:     'Dashboard',
  revenue:      'Revenue Analytics',
  transactions: 'Transactions',
  users:        'Users',
  kyc:          'KYC & Verification',
  geography:    'Geography',
  cohort:       'Cohort Analysis',
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'daily',     label: 'D' },
  { value: 'weekly',    label: 'W' },
  { value: 'monthly',   label: 'M' },
  { value: 'quarterly', label: 'Q' },
  { value: 'annual',    label: 'Y' },
]

const NO_PERIOD: Page[] = ['geography']

interface HeaderProps {
  currentPage: Page
  period: Period
  onPeriodChange: (p: Period) => void
}

export default function Header({ currentPage, period, onPeriodChange }: HeaderProps) {
  const { user, signOut } = useAuth()
  const showPeriod = !NO_PERIOD.includes(currentPage)

  // Initials from display name or email
  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? 'A').toUpperCase()

  return (
    <header className="flex items-center gap-4 px-6 h-14 bg-cream-50 border-b border-gray-100 flex-shrink-0">
      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-gray-900 truncate">{PAGE_TITLES[currentPage]}</h1>
        <p className="text-[10px] text-gray-400">Guava Finance</p>
      </div>

      {/* Period selector */}
      {showPeriod && (
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onPeriodChange(value)}
              className={cn(
                'period-tab w-8 text-center',
                period === value ? 'period-tab-active' : 'period-tab-inactive'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <Search size={15} />
        </button>
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
          <Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-guava-500 rounded-full" />
        </button>

        {/* Avatar with sign-out tooltip */}
        <div className="relative group ml-1">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? 'User'}
              className="w-7 h-7 rounded-full object-cover cursor-pointer ring-2 ring-transparent hover:ring-guava-300 transition-all"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-guava-600 flex items-center justify-center text-[11px] font-bold text-white cursor-pointer hover:bg-guava-700 transition-colors">
              {initials}
            </div>
          )}

          {/* Dropdown */}
          <div className="absolute right-0 top-9 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
            {user?.displayName && (
              <div className="px-3 py-2 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-900 truncate">{user.displayName}</p>
                <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={signOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={12} />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
