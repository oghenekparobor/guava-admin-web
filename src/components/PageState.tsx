import { AlertTriangle, RefreshCw, Wifi } from 'lucide-react'

export function NoApiState() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center max-w-xs">
        <div className="w-14 h-14 rounded-2xl bg-lime/15 flex items-center justify-center mx-auto mb-4">
          <Wifi size={26} className="text-lime" />
        </div>
        <h3 className="text-sm font-semibold text-ink mb-2">API not configured</h3>
        <p className="text-xs text-muted mb-4 leading-relaxed">
          Add your backend URL to <code className="bg-white/10 px-1 py-0.5 rounded text-ink">.env.local</code> to connect to live data.
        </p>
        <pre className="text-[11px] bg-black/30 text-lime rounded-xl p-4 text-left leading-loose">
          <span className="text-faint"># .env.local</span>{'\n'}
          VITE_API_BASE_URL=https://your-api.com
        </pre>
        <p className="text-[10px] text-faint mt-3">Then restart the dev server.</p>
      </div>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center max-w-xs">
        <div className="w-14 h-14 rounded-2xl bg-negative/15 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={26} className="text-negative" />
        </div>
        <h3 className="text-sm font-semibold text-ink mb-2">Failed to load data</h3>
        <p className="text-xs text-muted mb-4 leading-relaxed font-mono bg-white/5 rounded-xl p-3">
          {message}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 text-xs font-semibold text-lime bg-lime/15 hover:bg-lime/25 px-4 py-2 rounded-xl transition-colors"
          >
            <RefreshCw size={13} />
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-negative/10 border border-negative/30 rounded-xl px-4 py-3">
      <AlertTriangle size={14} className="text-negative flex-shrink-0" />
      <p className="text-xs text-negative flex-1 font-mono">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-semibold text-negative hover:text-ink flex items-center gap-1">
          <RefreshCw size={11} />
          Retry
        </button>
      )}
    </div>
  )
}
