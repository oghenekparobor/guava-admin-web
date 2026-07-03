import { useState } from 'react'
import TopBar from './components/TopBar'
import ChatAssistant from './components/ChatAssistant'
import Overview from './pages/Overview'
import Revenue from './pages/Revenue'
import Transactions from './pages/Transactions'
import Users from './pages/Users'
import KYC from './pages/KYC'
import Geography from './pages/Geography'
import Cohort from './pages/Cohort'
import Notifications from './pages/Notifications'
import Login from './pages/Login'
import { useAuth } from './context/AuthContext'

export type Page    = 'overview' | 'revenue' | 'transactions' | 'users' | 'kyc' | 'geography' | 'cohort' | 'notifications'
export type Period  = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'

function Dashboard() {
  const [currentPage, setCurrentPage] = useState<Page>('overview')
  const [period, setPeriod]           = useState<Period>('monthly')

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':     return <Overview     period={period} key={period} />
      case 'revenue':      return <Revenue      period={period} key={period} />
      case 'transactions': return <Transactions period={period} key={period} />
      case 'users':        return <Users        period={period} key={period} />
      case 'kyc':          return <KYC          period={period} key={period} />
      case 'geography':    return <Geography />
      case 'cohort':       return <Cohort       period={period} key={period} />
      case 'notifications': return <Notifications />
    }
  }

  return (
    <div className="flex flex-col h-screen bg-canvas overflow-hidden font-sans">
      <TopBar
        currentPage={currentPage}
        period={period}
        onNavigate={setCurrentPage}
        onPeriodChange={setPeriod}
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {renderPage()}
      </main>
      <ChatAssistant />
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-faint font-medium">Loading…</p>
        </div>
      </div>
    )
  }

  return user ? <Dashboard /> : <Login />
}
