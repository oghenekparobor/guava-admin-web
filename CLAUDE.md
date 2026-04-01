# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server at http://localhost:5173
npm run build    # TypeScript check + production build → dist/
npm run preview  # serve the production build locally
```

## Repository Overview

This is the **Guava Admin Web** repository — currently containing documentation for building an admin analytics dashboard for the Guava fintech platform (non-custodial USDC wallet on Solana mainnet).

**Stack:** React 18 + TypeScript, Vite, Tailwind CSS 3, Recharts, Lucide React

**Key files:**
- `src/App.tsx` — Root component; holds `currentPage` and `period` state, renders Sidebar + Header + page
- `src/lib/mockData.ts` — All mock API data (mirrors api.md response shapes exactly)
- `src/lib/utils.ts` — `formatCurrency`, `formatNumber`, `formatPercent`, `CHART_COLORS`, `CURRENCY_COLORS`
- `src/components/` — `Sidebar`, `Header`, `MetricCard`, `ChartCard`
- `src/pages/` — One file per nav section: `Overview`, `Revenue`, `Transactions`, `Users`, `KYC`, `Geography`, `Cohort`

**Documentation files (no code):**
- `api.md` — Backend API endpoint specifications
- `traction.md` — Product traction data and business metrics (investor/pitch context)

## Project Context

Guava is a Solana-based non-custodial USDC wallet targeting SMEs, freelancers, and non-crypto-native users. The admin dashboard surfaces analytics for internal use: user growth, revenue, KYC compliance, geographic distribution, and transaction analysis.

## API Architecture

All admin analytics endpoints live under `/dashboard/admin-details/` and are documented in `api.md`.

**Authentication:** All endpoints require the `require_app_source_validation` decorator (proper auth headers required).

**Common query parameter:** `start_date` (default: `"2025-06-03"`) filters data from a given date.

**Response envelope:** All list endpoints return `{ "results": [...] }`.

**Endpoint groups:**
- User growth: `/user-growth/weekly|monthly|quarterly/`
- Revenue: `/revenue/monthly|quarterly|annual|weekly-growth|by-currency/`
- Deposits: `/deposits/monthly/`
- Engagement: `/engagement/mau/` and `/engagement/retention/`
- KYC: `/kyc/monthly-stats/` and `/kyc/status-distribution/`
- Transaction types: `/transaction-types/monthly/`
- Geography: `/geography/user-distribution/`
- Cohort: `/cohort/monthly/`
- Bank transfers: `/bank-transfers/monthly/`
- Platform health: `/health/overview/` (fixed 30-day window, no `start_date`)

**Legacy endpoints** (previously implemented, no versioning needed):
- `/status-analysis/`, `/user-category-analysis/`, `/category-comparative/`, `/monthly-category-volume/`, `/type-source-analysis/`, `/volume-over-time/`

## Data Conventions

- Monetary values: 2 decimal places (multi-currency: USDC, NGN, USD, CHF, AED, ZAR, BRL, INR, SGD)
- Dates: ISO 8601 format; results ordered newest-first
- Growth/rate fields: 2 decimal places, expressed as percentages (e.g., `25.0` = 25%)
- Country codes: ISO 3-letter codes (e.g., `"NGA"`, `"GHA"`)
