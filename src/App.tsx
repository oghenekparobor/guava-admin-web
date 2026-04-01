import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Overview from './pages/Overview'
import Revenue from './pages/Revenue'
import Transactions from './pages/Transactions'
import Users from './pages/Users'
import KYC from './pages/KYC'
import Geography from './pages/Geography'
import Cohort from './pages/Cohort'
import Login from './pages/Login'
import { useAuth } from './context/AuthContext'

export type Page    = 'overview' | 'revenue' | 'transactions' | 'users' | 'kyc' | 'geography' | 'cohort'
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
    }
  }

  return (
    <div className="flex h-screen bg-cream-100 overflow-hidden font-sans">
      <Sidebar currentPage={currentPage} onNavigate={(p) => { setCurrentPage(p) }} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header currentPage={currentPage} period={period} onPeriodChange={setPeriod} />

        <main className="flex-1 overflow-y-auto p-5">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-guava-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400 font-medium">Loading…</p>
        </div>
      </div>
    )
  }

  return user ? <Dashboard /> : <Login />
}
