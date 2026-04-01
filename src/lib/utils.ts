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

export const CHART_COLORS = {
  primary:   '#16a34a',
  secondary: '#4ade80',
  tertiary:  '#86efac',
  accent:    '#0ea5e9',
  warning:   '#f59e0b',
  danger:    '#ef4444',
  purple:    '#8b5cf6',
  gray:      '#9ca3af',
}

export const CURRENCY_COLORS: Record<string, string> = {
  USDC: '#2563eb',
  NGN:  '#16a34a',
  USD:  '#0891b2',
  CHF:  '#7c3aed',
  AED:  '#b45309',
  ZAR:  '#be185d',
  BRL:  '#15803d',
  INR:  '#d97706',
  SGD:  '#0e7490',
}

export function shortMonth(iso: string): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const [, m] = iso.split('-')
  return months[parseInt(m, 10) - 1] || iso
}
