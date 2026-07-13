import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FileJson, RefreshCw, CheckCircle2, AlertTriangle, Loader2, UploadCloud,
  ShieldOff, Braces, Undo2, Copy, Check,
} from 'lucide-react'
import Subheader from '../components/Subheader'
import { useAuth } from '../context/AuthContext'
import { firebaseProjectId } from '../lib/firebase'
import {
  fetchTemplate, validateTemplate, publishTemplate,
  RemoteConfigAuthError, RemoteConfigConflictError,
  type RemoteConfigTemplate, type RemoteConfigParameter,
} from '../lib/remoteConfig'
import { cn } from '../lib/utils'

type Tab = 'system' | 'general'

// ── helpers ──────────────────────────────────────────────────────────────────

interface ParamEntry {
  key: string
  param: RemoteConfigParameter
  group?: string
}

function flattenParams(t: RemoteConfigTemplate | null): ParamEntry[] {
  if (!t) return []
  const entries: ParamEntry[] = Object.entries(t.parameters ?? {}).map(([key, param]) => ({ key, param }))
  for (const [group, g] of Object.entries(t.parameterGroups ?? {})) {
    for (const [key, param] of Object.entries(g.parameters ?? {})) entries.push({ key, param, group })
  }
  return entries.sort((a, b) => a.key.localeCompare(b.key))
}

/** Pretty-print for the editor when the stored string is JSON; raw otherwise. */
function formatMaybeJson(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

/** Minify JSON before storing back into the template; raw text passes through. */
function compactMaybeJson(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value))
  } catch {
    return value
  }
}

function jsonStatus(text: string): { kind: 'valid' | 'invalid' | 'text'; detail?: string } {
  const trimmed = text.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return { kind: 'text' }
  try {
    JSON.parse(trimmed)
    return { kind: 'valid' }
  } catch (e) {
    return { kind: 'invalid', detail: e instanceof Error ? e.message : 'Invalid JSON' }
  }
}

/** Deep-clone the template with every dirty draft applied to its parameter. */
function applyDrafts(template: RemoteConfigTemplate, drafts: Record<string, string>): RemoteConfigTemplate {
  const next = JSON.parse(JSON.stringify(template)) as RemoteConfigTemplate
  for (const [key, text] of Object.entries(drafts)) {
    const param = next.parameters?.[key]
      ?? Object.values(next.parameterGroups ?? {}).map(g => g.parameters?.[key]).find(Boolean)
    if (param) param.defaultValue = { ...param.defaultValue, value: compactMaybeJson(text) }
  }
  return next
}

// ── System configuration tab ─────────────────────────────────────────────────

function SystemConfiguration() {
  const [template, setTemplate] = useState<RemoteConfigTemplate | null>(null)
  const [etag, setEtag] = useState('*')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)

  const [selected, setSelected] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')

  const [busy, setBusy] = useState<'validate' | 'publish' | null>(null)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const gutterRef = useRef<HTMLDivElement>(null)

  const params = useMemo(() => flattenParams(template), [template])
  const visible = params.filter(p => p.key.toLowerCase().includes(query.trim().toLowerCase()))

  const originals = useMemo(() => {
    const map: Record<string, string> = {}
    for (const { key, param } of params) map[key] = formatMaybeJson(param.defaultValue?.value ?? '')
    return map
  }, [params])

  const dirtyKeys = Object.keys(drafts).filter(k => drafts[k] !== originals[k])
  const current = selected ? drafts[selected] ?? originals[selected] ?? '' : ''
  const status = jsonStatus(current)
  const selectedEntry = params.find(p => p.key === selected)
  const conditionalCount = Object.keys(selectedEntry?.param.conditionalValues ?? {}).length

  const load = async () => {
    setLoading(true); setError(null); setNotice(null); setAccessDenied(false)
    try {
      const res = await fetchTemplate()
      setTemplate(res.template)
      setEtag(res.etag)
      setDrafts({})
      const keys = flattenParams(res.template).map(p => p.key)
      setSelected(prev => (prev && keys.includes(prev) ? prev : keys.includes('CONFIG') ? 'CONFIG' : keys[0] ?? null))
    } catch (e) {
      if (e instanceof RemoteConfigAuthError) setAccessDenied(true)
      setError(e instanceof Error ? e.message : 'Failed to load Remote Config')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const runValidate = async () => {
    if (!template) return
    setBusy('validate'); setNotice(null); setError(null)
    try {
      await validateTemplate(applyDrafts(template, drafts), etag)
      setNotice({ kind: 'ok', text: 'Template is valid — safe to publish.' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed')
    } finally {
      setBusy(null)
    }
  }

  const runPublish = async () => {
    if (!template) return
    setConfirmOpen(false)
    setBusy('publish'); setNotice(null); setError(null)
    try {
      const next = applyDrafts(template, drafts)
      await publishTemplate(next, etag)
      setNotice({ kind: 'ok', text: `Published ${dirtyKeys.length} parameter${dirtyKeys.length === 1 ? '' : 's'} — live in the app now.` })
      await load()
    } catch (e) {
      if (e instanceof RemoteConfigConflictError) setError(e.message)
      else setError(e instanceof Error ? e.message : 'Publish failed')
    }
    setBusy(null)
  }

  // ── access denied (not on the proxy's admin allowlist) ──
  if (accessDenied) {
    return (
      <div className="card p-8 max-w-xl">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-5">
          <ShieldOff size={22} className="text-negative" />
        </div>
        <h3 className="text-lg font-bold text-ink mb-2">No Remote Config access</h3>
        <p className="text-sm text-muted leading-relaxed mb-4">
          Editing the app configuration ({firebaseProjectId}) is limited to accounts on the
          <code className="mx-1 text-ink">RC_ADMIN_EMAILS</code> allowlist configured on the server.
        </p>
        {error && (
          <p className="flex items-start gap-2 text-xs text-negative bg-negative/10 rounded-xl px-3 py-2.5 mb-4">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> {error}
          </p>
        )}
        <button onClick={load} className="h-10 px-5 rounded-full bg-white/5 hover:bg-white/10 text-sm font-semibold text-ink transition-colors flex items-center gap-2">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    )
  }

  if (loading && !template) {
    return (
      <div className="card p-12 flex items-center justify-center gap-3 text-muted text-sm">
        <Loader2 size={18} className="animate-spin text-lime" /> Loading Remote Config template…
      </div>
    )
  }

  if (error && !template) {
    return (
      <div className="card p-8 max-w-xl">
        <p className="flex items-start gap-2 text-sm text-negative mb-5">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" /> {error}
        </p>
        <button onClick={load} className="h-10 px-5 rounded-full bg-white/5 hover:bg-white/10 text-sm font-semibold text-ink transition-colors flex items-center gap-2">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    )
  }

  const version = template?.version

  return (
    <div className="card p-5 sm:p-6">
      {/* Card header: title + actions (design: "Configuration files management") */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div>
          <h3 className="text-base font-bold text-ink">Configuration files management</h3>
          <p className="text-xs text-muted mt-0.5">
            Firebase Remote Config · {firebaseProjectId}
            {version?.versionNumber && <> · v{version.versionNumber}</>}
            {version?.updateTime && <> · updated {new Date(version.updateTime).toLocaleString()}</>}
            {version?.updateUser?.email && <> by {version.updateUser.email}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading || busy !== null}
            className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-ink transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Reload
          </button>
          <button
            onClick={runValidate}
            disabled={busy !== null || !template}
            className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-ink transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {busy === 'validate' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Validate
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={busy !== null || dirtyKeys.length === 0}
            className="h-10 px-4 rounded-xl bg-lime text-lime-ink text-xs font-bold hover:bg-lime-soft transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {busy === 'publish' ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
            Publish{dirtyKeys.length > 0 && ` (${dirtyKeys.length})`}
          </button>
        </div>
      </div>

      {/* status banners */}
      {error && (
        <p className="flex items-start gap-2 text-xs text-negative bg-negative/10 rounded-xl px-3 py-2.5 mb-4">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> {error}
        </p>
      )}
      {notice && (
        <p className={cn(
          'flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 mb-4',
          notice.kind === 'ok' ? 'text-positive bg-positive/10' : 'text-warning bg-warning/10',
        )}>
          <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" /> {notice.text}
        </p>
      )}
      {etag === '*' && template && (
        <p className="flex items-start gap-2 text-xs text-warning bg-warning/10 rounded-xl px-3 py-2.5 mb-4">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          Concurrency check unavailable — publishing overwrites the current template. Reload right before you publish.
        </p>
      )}

      <div className="flex flex-col lg:flex-row gap-5">
        {/* File list (design: files sidebar) */}
        <div className="lg:w-60 flex-shrink-0 lg:border-r border-border lg:pr-5">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search parameters"
            className="w-full h-9 rounded-xl bg-white/5 border border-border px-3 text-xs text-ink placeholder:text-faint focus:outline-none focus:border-lime/40 mb-3"
          />
          <div className="space-y-0.5 max-h-[480px] overflow-y-auto">
            {visible.map(({ key, group }) => {
              const active = key === selected
              const dirty = dirtyKeys.includes(key)
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left',
                    active ? 'bg-lime text-lime-ink' : 'text-muted hover:text-ink hover:bg-white/5',
                  )}
                >
                  <FileJson size={14} className="flex-shrink-0" />
                  <span className="truncate flex-1">
                    {key}
                    {group && <span className={cn('block text-[10px] font-medium', active ? 'text-lime-ink/70' : 'text-faint')}>{group}</span>}
                  </span>
                  {dirty && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', active ? 'bg-lime-ink' : 'bg-warning')} />}
                </button>
              )
            })}
            {visible.length === 0 && <p className="text-xs text-faint px-3 py-2">No parameters match.</p>}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="dc-control !h-8 !cursor-default truncate">{selected}</span>
                  {status.kind === 'valid' && <span className="badge-positive">Valid JSON</span>}
                  {status.kind === 'text' && <span className="badge-neutral">Plain text</span>}
                  {status.kind === 'invalid' && (
                    <span className="badge-negative max-w-[280px] truncate" title={status.detail}>Invalid JSON</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDrafts(d => ({ ...d, [selected]: formatMaybeJson(current) }))}
                    disabled={status.kind !== 'valid'}
                    className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-ink transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Braces size={12} /> Format
                  </button>
                  <button
                    onClick={() => setDrafts(({ [selected]: _, ...rest }) => rest)}
                    disabled={!dirtyKeys.includes(selected)}
                    className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-ink transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Undo2 size={12} /> Discard
                  </button>
                </div>
              </div>

              {conditionalCount > 0 && (
                <p className="text-[11px] text-faint mb-2">
                  This parameter also has {conditionalCount} conditional value{conditionalCount === 1 ? '' : 's'} — only the default value is edited here.
                </p>
              )}

              <div className="dc-panel border border-border overflow-hidden flex h-[480px]">
                <div
                  ref={gutterRef}
                  className="w-12 flex-shrink-0 overflow-hidden py-3 text-right pr-2 select-none bg-white/[0.02] border-r border-border"
                >
                  {current.split('\n').map((_, i) => (
                    <div key={i} className="text-[11px] leading-[1.6] font-mono text-faint">{i + 1}</div>
                  ))}
                </div>
                <textarea
                  value={current}
                  onChange={e => setDrafts(d => ({ ...d, [selected]: e.target.value }))}
                  onScroll={e => { if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop }}
                  spellCheck={false}
                  className="flex-1 bg-transparent resize-none p-3 text-[12px] leading-[1.6] font-mono text-ink focus:outline-none whitespace-pre overflow-auto"
                />
              </div>
            </>
          ) : (
            <div className="dc-panel border border-border h-[480px] flex items-center justify-center text-sm text-faint">
              Select a parameter to view its value.
            </div>
          )}
        </div>
      </div>

      {/* Publish confirmation */}
      {confirmOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setConfirmOpen(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(440px,90vw)] card p-6 z-50">
            <h4 className="text-base font-bold text-ink mb-2">Publish Remote Config?</h4>
            <p className="text-sm text-muted leading-relaxed mb-4">
              This publishes a new template version — the Guava app picks it up on its next config
              fetch. Parameters being changed:
            </p>
            <div className="dc-panel px-4 py-3 mb-5 space-y-1.5 max-h-40 overflow-y-auto">
              {dirtyKeys.map(k => (
                <p key={k} className="flex items-center gap-2 text-xs font-semibold text-ink">
                  <FileJson size={13} className="text-lime flex-shrink-0" /> {k}
                </p>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="h-10 px-5 rounded-full bg-white/5 hover:bg-white/10 text-sm font-semibold text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={runPublish}
                className="h-10 px-5 rounded-full bg-lime text-lime-ink text-sm font-bold hover:bg-lime-soft transition-colors flex items-center gap-2"
              >
                <UploadCloud size={14} /> Publish live
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── General tab ──────────────────────────────────────────────────────────────

function GeneralSettings() {
  const { user, signOut } = useAuth()
  const [copied, setCopied] = useState(false)

  const copyUid = async () => {
    if (!user?.uid) return
    await navigator.clipboard.writeText(user.uid)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'same-origin /account (Vercel rewrite)'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
      <div className="card p-6">
        <h3 className="text-base font-bold text-ink mb-5">Profile</h3>
        <div className="flex items-center gap-4 mb-6">
          {user?.photoURL
            ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-14 h-14 rounded-full object-cover" />
            : <span className="w-14 h-14 rounded-full bg-lime text-lime-ink flex items-center justify-center text-lg font-bold">
                {(user?.displayName?.[0] ?? user?.email?.[0] ?? 'A').toUpperCase()}
              </span>}
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink truncate">{user?.displayName ?? 'Admin'}</p>
            <p className="text-xs text-muted truncate">{user?.email}</p>
          </div>
        </div>
        <div className="dc-panel px-4 py-3 mb-5">
          <p className="text-[11px] text-faint mb-1">Admin key (X-Admin-Key)</p>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono text-ink truncate flex-1">{user?.uid}</code>
            <button onClick={copyUid} className="icon-btn !w-8 !h-8" aria-label="Copy admin key">
              {copied ? <Check size={13} className="text-positive" /> : <Copy size={13} />}
            </button>
          </div>
        </div>
        <button
          onClick={signOut}
          className="h-10 px-5 rounded-full bg-negative/15 text-negative text-sm font-semibold hover:bg-negative/25 transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="card p-6">
        <h3 className="text-base font-bold text-ink mb-5">Workspace</h3>
        <div className="space-y-3">
          <div className="dc-panel px-4 py-3">
            <p className="text-[11px] text-faint mb-1">Firebase project</p>
            <p className="text-xs font-mono text-ink">{firebaseProjectId}</p>
          </div>
          <div className="dc-panel px-4 py-3">
            <p className="text-[11px] text-faint mb-1">API base</p>
            <p className="text-xs font-mono text-ink break-all">{apiBase}</p>
          </div>
          <div className="dc-panel px-4 py-3">
            <p className="text-[11px] text-faint mb-1">Remote Config access</p>
            <p className="text-xs text-muted leading-relaxed">
              Via the <code className="text-ink">/api/remote-config</code> proxy — gated by the
              server&apos;s <code className="text-ink">RC_ADMIN_EMAILS</code> allowlist.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: 'system',  label: 'System configuration' },
  { id: 'general', label: 'General' },
]

export default function Settings() {
  const [tab, setTab] = useState<Tab>('system')

  return (
    <div className="page-enter space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Subheader
          title="Settings"
          subtitle={tab === 'system' ? 'Configure how the system behaves' : 'Profile & workspace preferences'}
        />
        <div className="flex items-center gap-0.5 bg-white/5 rounded-full p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'h-9 px-4 rounded-full text-xs font-semibold transition-colors',
                tab === id ? 'bg-lime text-lime-ink' : 'text-muted hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'system' ? <SystemConfiguration /> : <GeneralSettings />}
    </div>
  )
}
