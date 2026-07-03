// Claude-powered "Ask about the data" assistant.
//
// ⚠️ SECURITY: VITE_CLAUDE_API_KEY is embedded in the client bundle (all VITE_*
// vars are public). Anyone who loads the dashboard can read the key and spend
// against it. Acceptable only for an internal/trusted admin tool. For anything
// public-facing, proxy these calls through a backend and keep the key server-side.

import Anthropic from '@anthropic-ai/sdk'
import { api } from './api'

const apiKey = import.meta.env.VITE_CLAUDE_API_KEY as string | undefined

export const claudeConfigured = Boolean(apiKey)

const client = apiKey
  ? new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  : null

export type ChatMsg = { role: 'user' | 'assistant'; content: string }

/** Pulls a compact snapshot of the current analytics (real API or mock fallback). */
export async function gatherContext(): Promise<string> {
  const safe = <T>(p: Promise<T>, fallback: T) => p.catch(() => fallback)
  const [
    health, revenue, byCurrency, kyc, geo, bank, deposits, mau, retention, topUsers, fraud,
  ] = await Promise.all([
    safe(api.platformHealth(), {} as Record<string, any>),
    safe(api.monthlyRevenue(), [] as any[]),
    safe(api.revenueByCurrency(), [] as any[]),
    safe(api.kycStatusDist(), [] as any[]),
    safe(api.userDistribution(), [] as any[]),
    safe(api.bankTransfers(), [] as any[]),
    safe(api.monthlyDeposits(), [] as any[]),
    safe(api.mau(), [] as any[]),
    safe(api.retention(), [] as any[]),
    safe(api.topUsers(), [] as any[]),
    safe(api.fraudAlerts(), {} as Record<string, any>),
  ])
  const tail = (a: any[], n = 6) => (Array.isArray(a) ? a.slice(-n) : [])
  return JSON.stringify({
    platform_health: health,
    revenue_recent: tail(revenue),
    revenue_by_currency_recent: tail(byCurrency),
    kyc_status_distribution: kyc,
    currency_distribution: geo,
    bank_transfers_recent: tail(bank),
    deposits_recent: tail(deposits),
    monthly_active_users_recent: tail(mau),
    retention_recent: tail(retention),
    top_users: topUsers,
    fraud_alerts: fraud,
  })
}

const SYSTEM = (context: string) =>
  `You are Guava's admin analytics assistant, embedded in the payments dashboard. ` +
  `Answer the user's questions using ONLY the JSON dashboard data below. Be concise and ` +
  `specific — cite the actual numbers and periods. Amounts are on-chain USDC or fiat NGN ` +
  `(₦). If the data doesn't contain the answer, say so briefly rather than guessing. ` +
  `Never invent figures.\n\nDASHBOARD DATA (JSON):\n${context}`

/** Streams an answer; calls onDelta with each text chunk. Returns the full text. */
export async function askClaude(
  history: ChatMsg[],
  context: string,
  onDelta: (t: string) => void,
): Promise<string> {
  if (!client) throw new Error('VITE_CLAUDE_API_KEY is not configured')
  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    system: SYSTEM(context),
    messages: history.map((m) => ({ role: m.role, content: m.content })),
  })
  stream.on('text', (t) => onDelta(t))
  const final = await stream.finalMessage()
  if (final.stop_reason === 'refusal') {
    throw new Error('The assistant declined to answer that request.')
  }
  return final.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
}
