import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  value: number,
  opts: { compact?: boolean; decimals?: number; prefix?: string } = {}
) {
  const { compact = false, decimals = 2, prefix = '$' } = opts
  if (compact) {
    if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(2)}M`
    if (value >= 1_000) return `${prefix}${(value / 1_000).toFixed(1)}K`
  }
  return `${prefix}${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export function formatNumber(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  }
  return value.toLocaleString('en-US')
}

export function formatPercent(value: number, decimals = 1): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

export function changeClass(value: number): string {
  if (value > 0) return 'badge-positive'
  if (value < 0) return 'badge-negative'
  return 'badge-neutral'
}

export function changeArrow(value: number): string {
  if (value > 0) return '↑'
  if (value < 0) return '↓'
  return '→'
}

// Tuned to read on the dark teal-green surfaces (Guava app palette).
export const CHART_COLORS = {
  primary:   '#F2FD7D', // lime accent
  secondary: '#48DAB1', // green2
  tertiary:  '#A8E6A0', // lightGreen
  accent:    '#79BACB', // washedBlue (brightened)
  warning:   '#F2D08A', // washedYellow
  danger:    '#F4A988', // washedRed
  purple:    '#AAC0F2', // periwinkle
  gray:      '#8A968F', // faint
}

export const CURRENCY_COLORS: Record<string, string> = {
  USDC: '#F2FD7D',
  NGN:  '#48DAB1',
  USD:  '#79BACB',
  CHF:  '#AAC0F2',
  AED:  '#F2D08A',
  ZAR:  '#F4A988',
  BRL:  '#A8E6A0',
  INR:  '#D4A441',
  SGD:  '#8FD3C4',
}

export function shortMonth(iso: string): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const [, m] = iso.split('-')
  return months[parseInt(m, 10) - 1] || iso
}
