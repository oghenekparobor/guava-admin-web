// Human-readable geography helpers.
//
// The analytics endpoints emit raw ISO codes: country ISO2/ISO3 (e.g. "NG",
// "ET") from KYC records, and ISO-4217 currency codes (e.g. "NGN", "USD") from
// the currency distribution. These lookups turn those codes into readable
// names using the bundled reference tables at the repo root.

import countries from '../../countries.json'
import currencies from '../../currencies.json'

// iso2 AND iso3 (upper-cased) → country name.
const COUNTRY_BY_ISO: Record<string, string> = {}
for (const c of countries as { name: string; iso2: string; iso3: string }[]) {
  if (c.iso2) COUNTRY_BY_ISO[c.iso2.toUpperCase()] = c.name
  if (c.iso3) COUNTRY_BY_ISO[c.iso3.toUpperCase()] = c.name
}

// currency_code → list of countries that use it.
const CURRENCY_COUNTRIES: Record<string, string[]> = {}
for (const r of currencies as { country: string; currency_code: string }[]) {
  const code = (r.currency_code || '').toUpperCase()
  if (!code) continue
  ;(CURRENCY_COUNTRIES[code] ??= []).push(r.country)
}

const titled = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

/** Readable country name for an ISO2/ISO3 code; passes through UNKNOWN/OTHER and
 *  falls back to the raw code when unmapped. */
export function countryName(code?: string | null): string {
  if (!code) return '—'
  const key = code.trim().toUpperCase()
  if (key === 'UNKNOWN' || key === 'OTHER') return titled(key)
  return COUNTRY_BY_ISO[key] ?? code
}

/** The single country a currency belongs to, or null when the currency is
 *  shared by many countries (USD, EUR, GBP…) or unknown. */
export function currencyCountry(code?: string | null): string | null {
  if (!code) return null
  const list = CURRENCY_COUNTRIES[code.trim().toUpperCase()]
  return list && list.length === 1 ? list[0] : null
}

/** A currency code paired with its country when unambiguous, e.g. "NGN ·
 *  Nigeria"; just the code for multi-country currencies and UNKNOWN/OTHER. */
export function currencyLabel(code?: string | null): string {
  if (!code) return '—'
  const key = code.trim().toUpperCase()
  if (key === 'UNKNOWN' || key === 'OTHER') return titled(key)
  const country = currencyCountry(key)
  return country ? `${key} · ${country}` : key
}
