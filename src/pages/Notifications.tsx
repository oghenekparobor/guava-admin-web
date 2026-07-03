import { useState, useEffect, useCallback } from 'react'
import { Send, Users, ShieldCheck, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react'
import ChartCard from '../components/ChartCard'
import { ErrorBanner } from '../components/PageState'
import { api } from '../lib/api'
import { formatNumber, cn } from '../lib/utils'

const SEGMENTS: { id: string; label: string }[] = [
  { id: 'all',              label: 'All users' },
  { id: 'kyc:not-started',  label: 'KYC · Not started' },
  { id: 'kyc:pending',      label: 'KYC · Pending' },
  { id: 'kyc:verified',     label: 'KYC · Verified' },
  { id: 'kyc:failed',       label: 'KYC · Failed' },
  { id: 'active-30d',       label: 'Active (30d)' },
  { id: 'dormant-90d',      label: 'Dormant (90d)' },
]

const CHANNELS: { id: string; label: string; disabled?: boolean }[] = [
  { id: 'push',   label: 'Push' },
  { id: 'in_app', label: 'In-app' },
  { id: 'email',  label: 'Email (soon)', disabled: true },
]

type Preview = { segment: string; total: number; results: any[] }
type SendResult = {
  campaign_id: string; recipients_resolved: number; devices_targeted: number
  delivered: number; pruned_stale_tokens: number; in_app_created: number
}

export default function Notifications() {
  // ── Segment builder (multi-select = AND, joined by comma) ─────────────────
  const [selected, setSelected] = useState<string[]>(['kyc:not-started'])
  const [currency, setCurrency] = useState('')

  const effectiveSegment = [
    ...selected,
    ...(currency.trim() ? [`currency:${currency.trim().toUpperCase()}`] : []),
  ].join(',') || 'all'

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  // ── Live preview ──────────────────────────────────────────────────────────
  const [preview, setPreview] = useState<Preview | null>(null)
  const [pLoading, setPLoading] = useState(true)
  const [pError, setPError] = useState<string | null>(null)

  const loadPreview = useCallback(async () => {
    setPLoading(true); setPError(null)
    try {
      setPreview(await api.notificationsPreview(effectiveSegment, 100))
    } catch (e) {
      setPError(e instanceof Error ? e.message : 'Preview failed')
    } finally {
      setPLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveSegment])

  useEffect(() => { loadPreview() }, [loadPreview])

  // ── Compose + send ────────────────────────────────────────────────────────
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [channels, setChannels] = useState<string[]>(['push', 'in_app'])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SendResult | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  const toggleChannel = (id: string) =>
    setChannels((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))

  const canSend = title.trim() && message.trim() && channels.length > 0 && (preview?.total ?? 0) > 0

  const send = async () => {
    if (!canSend) return
    setSending(true); setSendError(null); setResult(null)
    try {
      setResult(await api.notificationsSend({
        segment: effectiveSegment, title: title.trim(), message: message.trim(),
        type: 'system', channels,
      }))
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="page-enter space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: audience + compose */}
        <div className="lg:col-span-2 space-y-4">
          <ChartCard title="Audience" subtitle="Combine filters (AND) to target a cohort">
            <div className="flex flex-wrap gap-2">
              {SEGMENTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    selected.includes(s.id)
                      ? 'bg-lime text-lime-ink'
                      : 'bg-white/5 text-muted hover:text-ink hover:bg-white/10',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-faint">Currency filter</label>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="e.g. NGN"
                className="mt-1 w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-lime/50"
              />
            </div>
            <p className="mt-3 text-[10px] text-faint font-mono break-all">segment = {effectiveSegment}</p>
          </ChartCard>

          <ChartCard title="Compose">
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-faint">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Notification title"
                  className="mt-1 w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-lime/50"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-faint">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Message body…"
                  className="mt-1 w-full bg-white/5 border border-border rounded-lg px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:border-lime/50 resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-faint">Channels</label>
                <div className="mt-1 flex gap-2">
                  {CHANNELS.map((c) => (
                    <button
                      key={c.id}
                      disabled={c.disabled}
                      onClick={() => toggleChannel(c.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        c.disabled && 'opacity-40 cursor-not-allowed',
                        channels.includes(c.id)
                          ? 'bg-lime text-lime-ink'
                          : 'bg-white/5 text-muted hover:text-ink',
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {sendError && <ErrorBanner message={sendError} />}

              <button
                onClick={send}
                disabled={!canSend || sending}
                className={cn(
                  'w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
                  canSend && !sending
                    ? 'bg-lime text-lime-ink hover:bg-lime-soft'
                    : 'bg-white/5 text-faint cursor-not-allowed',
                )}
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {sending ? 'Sending…' : `Send to ${formatNumber(preview?.total ?? 0)} users`}
              </button>

              {result && (
                <div className="rounded-xl border border-lime/30 bg-lime/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-lime">
                    <CheckCircle2 size={15} />
                    <span className="text-xs font-semibold">Campaign {result.campaign_id}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Stat label="Recipients" value={result.recipients_resolved} />
                    <Stat label="Devices targeted" value={result.devices_targeted} />
                    <Stat label="Delivered" value={result.delivered} />
                    <Stat label="Stale tokens pruned" value={result.pruned_stale_tokens} />
                    <Stat label="In-app created" value={result.in_app_created} />
                  </div>
                </div>
              )}
            </div>
          </ChartCard>
        </div>

        {/* Right: live preview */}
        <div className="lg:col-span-3">
          <ChartCard
            title="Recipients Preview"
            subtitle="Identities only — FCM tokens are never exposed to the client"
            action={
              <button onClick={loadPreview} className="text-muted hover:text-ink transition-colors">
                <RefreshCw size={14} className={pLoading ? 'animate-spin' : ''} />
              </button>
            }
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-lime" />
                <span className="text-sm font-bold text-ink">{formatNumber(preview?.total ?? 0)}</span>
                <span className="text-xs text-muted">in segment</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-info" />
                <span className="text-xs text-muted">showing {preview?.results.length ?? 0}</span>
              </div>
            </div>

            {pError && <ErrorBanner message={pError} onRetry={loadPreview} />}

            <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface">
                  <tr className="border-b border-border">
                    {['Wallet','Username','KYC','Email','Devices'].map((h) => (
                      <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-faint pb-2.5 pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(preview?.results ?? []).map((r: any, i: number) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="py-2 pr-4 font-mono text-muted">{r.wallet_address}</td>
                      <td className="py-2 pr-4 text-ink">{r.username ?? <span className="text-faint">—</span>}</td>
                      <td className="py-2 pr-4">
                        <span className={
                          r.kyc_status === 'verified' ? 'badge-positive'
                            : r.kyc_status === 'failed' ? 'badge-negative'
                            : r.kyc_status === 'pending' ? 'badge-warning' : 'badge-neutral'
                        }>{r.kyc_status}</span>
                      </td>
                      <td className="py-2 pr-4 text-muted">{r.email ?? <span className="text-faint">—</span>}</td>
                      <td className="py-2 pr-4 text-ink">{r.device_count}</td>
                    </tr>
                  ))}
                  {pLoading && (
                    <tr><td colSpan={5} className="py-8 text-center text-faint">Loading…</td></tr>
                  )}
                  {!pLoading && (preview?.results.length ?? 0) === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-faint">No users match this segment.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-ink">{formatNumber(value)}</span>
    </div>
  )
}
