import {
  LayoutDashboard, TrendingUp, ArrowLeftRight, Users,
  ShieldCheck, Globe, BarChart3, Settings, LogOut,
  Wallet, ChevronRight, X,
} from 'lucide-react'
import type { Page } from '../App'
import { cn } from '../lib/utils'

const NAV = [
  {
    label: 'OVERVIEW',
    items: [
      { id: 'overview',      icon: LayoutDashboard, label: 'Dashboard'      },
    ],
  },
  {
    label: 'ANALYTICS',
    items: [
      { id: 'revenue',       icon: TrendingUp,      label: 'Revenue'        },
      { id: 'transactions',  icon: ArrowLeftRight,  label: 'Transactions'   },
      { id: 'users',         icon: Users,           label: 'Users'          },
    ],
  },
  {
    label: 'COMPLIANCE',
    items: [
      { id: 'kyc',           icon: ShieldCheck,     label: 'KYC / Verify'   },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { id: 'geography',     icon: Globe,           label: 'Geography'      },
      { id: 'cohort',        icon: BarChart3,       label: 'Cohort Analysis'},
    ],
  },
] as const

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  open?: boolean
  onClose?: () => void
}

export default function Sidebar({ currentPage, onNavigate, open = false, onClose }: SidebarProps) {
  return (
    <aside
      className={cn(
        // Off-canvas drawer on mobile; static column on lg+.
        'flex flex-col w-[240px] min-w-[240px] h-screen bg-sidebar overflow-y-auto',
        'fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out',
        'lg:static lg:z-auto lg:w-[220px] lg:min-w-[220px] lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-xl bg-lime flex items-center justify-center flex-shrink-0">
          <Wallet size={16} className="text-lime-ink" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-ink text-sm font-bold leading-none">Guava</p>
          <p className="text-muted text-[10px] mt-0.5">Admin Console</p>
        </div>
        {/* Close (mobile only) */}
        <button
          onClick={onClose}
          className="lg:hidden w-8 h-8 -mr-1 flex items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-ink transition-colors"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5">
        {NAV.map((section) => (
          <div key={section.label}>
            <p className="section-label mb-2">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map(({ id, icon: Icon, label }) => {
                const active = currentPage === id
                return (
                  <button
                    key={id}
                    onClick={() => onNavigate(id as Page)}
                    className={cn(
                      'nav-item w-full text-left',
                      active
                        ? 'bg-lime/15 text-lime'
                        : 'text-muted hover:bg-white/5 hover:text-ink'
                    )}
                  >
                    <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                    <span className="text-xs">{label}</span>
                    {active && <ChevronRight size={12} className="ml-auto opacity-60" />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-white/5 pt-3">
        <button className="nav-item w-full text-left text-muted hover:bg-white/5 hover:text-ink">
          <Settings size={16} strokeWidth={2} />
          <span className="text-xs">Settings</span>
        </button>
        <button className="nav-item w-full text-left text-muted hover:bg-negative/15 hover:text-negative">
          <LogOut size={16} strokeWidth={2} />
          <span className="text-xs">Logout</span>
        </button>
        {/* User */}
        <div className="flex items-center gap-2.5 px-3 py-2 mt-2 rounded-xl bg-white/5">
          <div className="w-7 h-7 rounded-full bg-lime flex items-center justify-center text-[11px] font-bold text-lime-ink">
            A
          </div>
          <div className="min-w-0">
            <p className="text-ink text-xs font-medium truncate">Admin</p>
            <p className="text-faint text-[10px] truncate">admin@guava.app</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
