import { useState } from 'react'
import {
  Search, Bell, Plus, LogOut,
  LayoutDashboard, TrendingUp, ArrowLeftRight, Users,
  ShieldCheck, Globe, BarChart3, Bell as BellNav, Settings as SettingsIcon,
} from 'lucide-react'
import type { Page, Period } from '../App'
import { cn } from '../lib/utils'
import { useAuth } from '../context/AuthContext'

const NAV: { id: Page; icon: typeof LayoutDashboard; label: string }[] = [
  { id: 'overview',     icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'revenue',      icon: TrendingUp,      label: 'Revenue' },
  { id: 'transactions', icon: ArrowLeftRight,  label: 'Transactions' },
  { id: 'users',        icon: Users,           label: 'Users' },
  { id: 'kyc',          icon: ShieldCheck,     label: 'KYC' },
  { id: 'geography',    icon: Globe,           label: 'Geography' },
  { id: 'cohort',       icon: BarChart3,       label: 'Cohort' },
  { id: 'notifications', icon: BellNav,        label: 'Notifications' },
  { id: 'settings',     icon: SettingsIcon,    label: 'Settings' },
]

const PERIODS: { value: Period; label: string }[] = [
  { value: 'daily',     label: 'D' },
  { value: 'weekly',    label: 'W' },
  { value: 'monthly',   label: 'M' },
  { value: 'quarterly', label: 'Q' },
  { value: 'annual',    label: 'Y' },
]

const NO_PERIOD: Page[] = ['geography', 'notifications', 'settings']

interface TopBarProps {
  currentPage: Page
  period: Period
  onNavigate: (p: Page) => void
  onPeriodChange: (p: Period) => void
}

export default function TopBar({ currentPage, period, onNavigate, onPeriodChange }: TopBarProps) {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const showPeriod = !NO_PERIOD.includes(currentPage)

  const initials = user?.displayName
    ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? 'A').toUpperCase()
  const firstName = user?.displayName?.split(' ')[0] ?? 'admin'

  return (
    <header className="bg-canvas px-4 sm:px-6 pt-5 pb-4 border-b border-border">
      {/* Row 1: welcome + actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-lg sm:text-[22px] font-extrabold tracking-tight text-ink truncate">Welcome back, {firstName}</span>
          <span className="hidden sm:inline text-[22px] font-medium text-faint">· Guava</span>
        </div>

        <div className="flex items-center gap-2">
          {showPeriod && (
            <div className="hidden sm:flex items-center gap-0.5 bg-white/5 rounded-full p-1">
              {PERIODS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onPeriodChange(value)}
                  className={cn(
                    'w-7 h-7 rounded-full text-xs font-semibold transition-colors',
                    period === value ? 'bg-lime text-lime-ink' : 'text-muted hover:text-ink',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <button className="icon-btn" aria-label="Search"><Search size={18} /></button>
          <button className="icon-btn relative" aria-label="Notifications" onClick={() => onNavigate('notifications')}>
            <Bell size={18} />
            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-lime" />
          </button>
          <button className="icon-btn" aria-label="Compose" onClick={() => onNavigate('notifications')}><Plus size={18} /></button>

          {/* Avatar + sign out */}
          <div className="relative">
            <button onClick={() => setMenuOpen(o => !o)} className="w-11 h-11 rounded-full bg-lime flex items-center justify-center text-sm font-bold text-lime-ink cursor-pointer hover:bg-lime-soft transition-colors overflow-hidden">
              {user?.photoURL && !avatarError
                ? <img
                    src={user.photoURL}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    className="w-11 h-11 rounded-full object-cover"
                  />
                : initials}
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-14 w-48 bg-surface rounded-2xl shadow-card-hover border border-border py-1 z-50">
                  {user?.displayName && (
                    <div className="px-3 py-2 border-b border-border">
                      <p className="text-xs font-semibold text-ink truncate">{user.displayName}</p>
                      <p className="text-[10px] text-faint truncate">{user.email}</p>
                    </div>
                  )}
                  <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-negative hover:bg-negative/15 transition-colors">
                    <LogOut size={12} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: pill nav */}
      <nav className="mt-4 overflow-x-auto no-scrollbar -mx-1 px-1">
        <div className="nav-pill-bar w-max">
          {NAV.map(({ id, icon: Icon, label }) => {
            const active = currentPage === id
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={cn('nav-pill', active ? 'nav-pill-active' : 'nav-pill-inactive')}
              >
                <Icon size={14} strokeWidth={active ? 2.5 : 2} />
                {label}
              </button>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
