import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react'
import { cn } from '../lib/utils'
import { askClaude, gatherContext, claudeConfigured, type ChatMsg } from '../lib/claude'

const SUGGESTIONS = [
  'What was revenue over the last 3 months?',
  'How many users are KYC verified?',
  'Which currency has the most users?',
  'What is the bank transfer success rate trend?',
]

// ── Minimal Markdown renderer (bold / italic / code / bullets / headings) ────
function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g
  let last = 0, m: RegExpExecArray | null, k = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    if (t.startsWith('**')) out.push(<strong key={k} className="font-semibold text-ink">{t.slice(2, -2)}</strong>)
    else if (t.startsWith('`')) out.push(<code key={k} className="bg-white/10 rounded px-1 py-0.5 text-[11px] font-mono">{t.slice(1, -1)}</code>)
    else out.push(<em key={k}>{t.slice(1, -1)}</em>)
    last = m.index + t.length; k++
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: string[] = []
  const flush = (key: string) => {
    if (!list.length) return
    blocks.push(
      <ul key={key} className="list-disc pl-4 space-y-1">
        {list.map((li, i) => <li key={i}>{renderInline(li)}</li>)}
      </ul>,
    )
    list = []
  }
  text.split('\n').forEach((line, idx) => {
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    if (bullet) { list.push(bullet[1]); return }
    flush(`ul-${idx}`)
    const trimmed = line.trim()
    if (!trimmed) return
    const h = trimmed.match(/^(#{1,3})\s+(.*)$/)
    if (h) blocks.push(<p key={idx} className="font-bold text-ink">{renderInline(h[2])}</p>)
    else blocks.push(<p key={idx}>{renderInline(trimmed)}</p>)
  })
  flush('ul-end')
  return <div className="space-y-2">{blocks}</div>
}

export default function ChatAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const contextRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  const send = useCallback(async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    setInput('')
    setError(null)
    const history: ChatMsg[] = [...messages, { role: 'user', content: q }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setBusy(true)
    try {
      if (!contextRef.current) contextRef.current = await gatherContext()
      await askClaude(history, contextRef.current, (delta) => {
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant') next[next.length - 1] = { ...last, content: last.content + delta }
          return next
        })
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setMessages((prev) => prev.filter((_, i) => !(i === prev.length - 1 && prev[i].role === 'assistant' && prev[i].content === '')))
    } finally {
      setBusy(false)
    }
  }, [busy, messages])

  if (!claudeConfigured) return null

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-lime text-lime-ink shadow-card-hover flex items-center justify-center hover:bg-lime-soft transition-colors"
          aria-label="Ask about the data"
        >
          <MessageSquare size={22} strokeWidth={2.2} />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[400px] h-[560px] max-h-[calc(100vh-2.5rem)] bg-surface border border-border rounded-[24px] shadow-card-hover flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
            <div className="w-8 h-8 rounded-full bg-lime/15 flex items-center justify-center">
              <Sparkles size={16} className="text-lime" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink leading-none">Ask Guava</p>
              <p className="text-[10px] text-faint mt-0.5">Answers from your live dashboard data</p>
            </div>
            <button onClick={() => setOpen(false)} className="icon-btn w-8 h-8" aria-label="Close">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-muted">Ask me anything about the current numbers — revenue, users, KYC, transfers, deposits, fraud…</p>
                <div className="space-y-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full text-left text-xs text-muted bg-white/5 hover:bg-white/10 hover:text-ink rounded-xl px-3 py-2 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed',
                    m.role === 'user' ? 'bg-lime text-lime-ink font-medium whitespace-pre-wrap' : 'bg-white/5 text-ink',
                  )}
                >
                  {m.role === 'assistant'
                    ? (m.content
                        ? <Markdown text={m.content} />
                        : (busy && i === messages.length - 1 ? <Loader2 size={14} className="animate-spin text-muted" /> : null))
                    : m.content}
                </div>
              </div>
            ))}

            {error && (
              <div className="text-[11px] text-negative bg-negative/10 border border-negative/30 rounded-xl px-3 py-2">{error}</div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input) }}
            className="p-3 border-t border-border flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the data…"
              disabled={busy}
              className="flex-1 bg-white/5 border border-border rounded-full px-4 py-2.5 text-xs text-ink placeholder:text-faint focus:outline-none focus:border-lime/50 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
                busy || !input.trim() ? 'bg-white/5 text-faint' : 'bg-lime text-lime-ink hover:bg-lime-soft',
              )}
              aria-label="Send"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      )}
    </>
  )
}
