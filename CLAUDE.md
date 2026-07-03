# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server at http://localhost:5173
npm run build    # tsc (typecheck) then vite build → dist/
npm run preview  # serve the production build locally
```

There is **no test runner and no lint script**. `npm run build` is the only correctness gate — it runs `tsc` before bundling, so a type error fails the build.

## Stack

React 18 + TypeScript, Vite 5, Tailwind CSS 3, Recharts (charts), Lucide React (icons), Firebase (Google auth + analytics), `clsx`/`tailwind-merge` (the `cn()` helper).

## Architecture

The app is a single-page client dashboard. There is no router — navigation is `currentPage` state in `App.tsx` driving a `switch` that renders one page component.

**Auth gate (`main.tsx` → `App.tsx`):** `AuthProvider` (`src/context/AuthContext.tsx`) wraps the app and exposes `useAuth()` (`user`, `loading`, `signIn`, `signOut`) backed by Firebase `onAuthStateChanged` + Google `signInWithPopup`. `App` shows a spinner while `loading`, then renders `<Login />` if signed out or `<Dashboard />` if signed in. Firebase config is hardcoded in `src/lib/firebase.ts` (public client keys).

**Data flow — three layers, do not skip a layer:**
1. `src/lib/api.ts` — the `api` object: one thin function per backend endpoint. All paths are prefixed **`/account/admin-details/`** and sent with header `X-App-ID: com.example.app`. Base URL comes from `VITE_API_BASE_URL`. Most endpoints unwrap the `{ results: [...] }` envelope via the `results()` helper; `platformHealth` returns a flat object via `get()`.
2. `src/hooks/useDashboardData.ts` — a `useXxx()` hook per dataset, all built on the internal `useData()` base hook (returns `{ data, loading, error, refetch }`). Hooks also attach display `label`s (`withMonthLabel`/`withWeekLabel`/`withQuarterLabel`) and compute **derived** datasets (`useCumulativeUsers`, `useRunRates` for MRR/ARR/etc.) purely client-side. `HAS_API = Boolean(VITE_API_BASE_URL)`.
3. `src/pages/*` — one page per nav section (`Overview`, `Revenue`, `Transactions`, `Users`, `KYC`, `Geography`, `Cohort`). Each page early-returns `<NoApiState />` when `!HAS_API`, calls its hooks, and renders `<ErrorBanner>` / loading states from `src/components/PageState.tsx`.

**No mock data.** When `VITE_API_BASE_URL` is unset the dashboard shows the "API not configured" state — it does **not** fall back to sample data. (`.env.example` still says otherwise; that comment is stale.)

**Shared UI:** `src/components/` — `Sidebar`, `Header` (owns the period picker), `MetricCard`, `ChartCard`, `PageState` (`NoApiState`/`ErrorState`/`ErrorBanner`).

**App-wide state** lives entirely in `App.tsx`: `currentPage` (`Page` type) and `period` (`Period` type). Changing `period` remounts the active page via `key={period}` to force a refetch. `Geography` ignores `period`.

## API routing (dev vs prod)

- **Dev:** set `VITE_API_BASE_URL` in `.env.local`. `vite.config.ts` proxies `/account/*` to that target (changeOrigin, secure) so browser requests avoid CORS.
- **Prod (Vercel):** `vercel.json` rewrites `/account/:path*` → `https://api.guava.finance/account/:path*`.

Because of both, the frontend can call same-origin `/account/...` paths; `VITE_API_BASE_URL` may be left as a relative base in production.

## Backend endpoint reference

`api.md` documents the endpoints but lists them under `/dashboard/admin-details/` — **the code actually calls `/account/admin-details/`**. Trust `src/lib/api.ts` for the live paths. All endpoints require proper auth headers (`require_app_source_validation`). Common query param: `start_date` (results ordered newest-first). `/health/overview/` takes no `start_date` (fixed 30-day window).

`traction.md` is business/pitch context, not code.

## Data & styling conventions

- Monetary values: 2 decimals, multi-currency (USDC, NGN, USD, CHF, AED, ZAR, BRL, INR, SGD). Format via `formatCurrency`/`formatNumber`/`formatPercent` in `src/lib/utils.ts`; per-currency colors in `CURRENCY_COLORS`, chart palette in `CHART_COLORS`.
- Growth/rate fields are percentages already (`25.0` = 25%); dates ISO 8601; country codes ISO 3-letter (`"NGA"`).
- **Dark brand theme (matches the Guava mobile app):** dark teal-green surfaces with a lime accent, `IBM Plex Sans`. Use the semantic Tailwind tokens in `tailwind.config.js` over raw hex/gray utilities:
  - Surfaces: `bg-bg` (page `#28443F`), `bg-surface` (cards `#334E48`), `bg-surface-2`, `bg-sidebar`; hairlines `border-border`; translucent overlays `bg-white/5`–`/10`.
  - Text: `text-ink` (primary `#FCFCFC`), `text-muted` (`#B0B7B1`), `text-faint`.
  - Accent: `lime` / `text-lime` / `bg-lime` (`#F2FD7D`); put dark content on lime with `text-lime-ink`.
  - Status: `positive` / `negative` / `warning` / `info` (and the `.badge-*` classes in `index.css`).
  - The `guava-*` scale is a green ramp (light mint → deep bg) anchored on the app palette; `cream-*` is repointed to dark surfaces for safety. Reusable component styles (`.card`, `.nav-item`, `.badge-*`, `.period-tab*`) live in `src/index.css`.
  - Chart series/currency colors: `CHART_COLORS` / `CURRENCY_COLORS` in `src/lib/utils.ts` are tuned to read on dark; Recharts axis/grid/tooltip theming is in `index.css`. Prefer these over hardcoded hex in chart props.
