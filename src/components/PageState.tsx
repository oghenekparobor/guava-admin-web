import { AlertTriangle, RefreshCw, Wifi } from 'lucide-react'

export function NoApiState() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center max-w-xs">
        <div className="w-14 h-14 rounded-2xl bg-guava-50 flex items-center justify-center mx-auto mb-4">
          <Wifi size={26} className="text-guava-600" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">API not configured</h3>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
          Add your backend URL to <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">.env.local</code> to connect to live data.
        </p>
        <pre className="text-[11px] bg-gray-900 text-guava-400 rounded-xl p-4 text-left leading-loose">
          <span className="text-gray-500"># .env.local</span>{'\n'}
          VITE_API_BASE_URL=https://your-api.com
        </pre>
        <p className="text-[10px] text-gray-400 mt-3">Then restart the dev server.</p>
      </div>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center max-w-xs">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={26} className="text-red-500" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Failed to load data</h3>
        <p className="text-xs text-gray-500 mb-4 leading-relaxed font-mono bg-gray-50 rounded-xl p-3">
          {message}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 text-xs font-semibold text-guava-700 bg-guava-50 hover:bg-guava-100 px-4 py-2 rounded-xl transition-colors"
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
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
      <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
      <p className="text-xs text-red-700 flex-1 font-mono">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1">
          <RefreshCw size={11} />
          Retry
        </button>
      )}
    </div>
  )
}
