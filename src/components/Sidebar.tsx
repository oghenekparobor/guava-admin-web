import {
  LayoutDashboard, TrendingUp, ArrowLeftRight, Users,
  ShieldCheck, Globe, BarChart3, Settings, LogOut,
  Wallet, ChevronRight,
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
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="flex flex-col w-[220px] min-w-[220px] h-screen bg-sidebar overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-xl bg-guava-400 flex items-center justify-center flex-shrink-0">
          <Wallet size={16} className="text-guava-950" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-white text-sm font-bold leading-none">Guava</p>
          <p className="text-guava-700 text-[10px] mt-0.5">Admin Console</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5">
        {NAV.map((section) => (
          <div key={section.label}>
            <p className="section-label text-guava-900/80 mb-2">{section.label}</p>
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
                        ? 'bg-guava-950/60 text-guava-400'
                        : 'text-guava-800 hover:bg-guava-950/40 hover:text-guava-300'
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
        <button className="nav-item w-full text-left text-guava-800 hover:bg-guava-950/40 hover:text-guava-300">
          <Settings size={16} strokeWidth={2} />
          <span className="text-xs">Settings</span>
        </button>
        <button className="nav-item w-full text-left text-guava-800 hover:bg-red-900/30 hover:text-red-400">
          <LogOut size={16} strokeWidth={2} />
          <span className="text-xs">Logout</span>
        </button>
        {/* User */}
        <div className="flex items-center gap-2.5 px-3 py-2 mt-2 rounded-xl bg-guava-950/30">
          <div className="w-7 h-7 rounded-full bg-guava-600 flex items-center justify-center text-[11px] font-bold text-white">
            A
          </div>
          <div className="min-w-0">
            <p className="text-guava-200 text-xs font-medium truncate">Admin</p>
            <p className="text-guava-700 text-[10px] truncate">admin@guava.app</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
