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
1. `src/lib/api.ts` — the `api` object: one thin function per backend endpoint. All paths are prefixed **`/account/admin-details/`** and sent with admin headers `X-App-ID: finance.guava.web` + `X-Admin-Key` (currently the Firebase auth UID). Base URL comes from `VITE_API_BASE_URL`. Most endpoints unwrap the `{ results: [...] }` envelope via the `results()` helper; `platformHealth` returns a flat object via `get()`.
2. `src/hooks/useDashboardData.ts` — a `useXxx()` hook per dataset, all built on the internal `useData()` base hook (returns `{ data, loading, error, refetch }`). Hooks also attach display `label`s (`withMonthLabel`/`withWeekLabel`/`withQuarterLabel`) and compute **derived** datasets (`useCumulativeUsers`, `useRunRates` for MRR/ARR/etc.) purely client-side. `HAS_API = Boolean(VITE_API_BASE_URL)`.
3. `src/pages/*` — one page per nav section (`Overview`, `Revenue`, `Transactions`, `Users`, `KYC`, `Geography`, `Cohort`, `Notifications`). Pages call their hooks and render `<ErrorBanner>` / loading states from `src/components/PageState.tsx`. `Notifications` is interactive (segment builder + compose/send) and calls `api.*` directly rather than through the `useData` hook. New endpoints in `api.ts`: `depositsByChannel`, `geographyByKyc`, `notificationsPreview`, `notificationsSend`; `volumeOverTime` now returns `{ results, next_cursor }`. Geography's legacy `user-distribution` is a **currency** distribution (`currency_code`); true geography is `geographyByKyc`.

**Live data only — no mocks.** `src/lib/api.ts` talks exclusively to the backend. A failed request (non-2xx, network, CORS, or missing `VITE_API_BASE_URL`) **throws** — there is no fallback data — so the calling page renders its `ErrorBanner`/loading/empty state instead of silently showing fabricated numbers. `HAS_API` in `useDashboardData.ts` is `Boolean(VITE_API_BASE_URL)`: pages show `NoApiState` when no backend is configured, otherwise they attempt real calls and surface failures. (The old `src/lib/mocks.ts` per-endpoint fallback was deleted — do not reintroduce mock data; if an endpoint looks wrong, debug the request/auth, not a mock.)

**Shared UI:** `src/components/` — `TopBar` (top pill-nav + circular-icon header, owns the period picker; replaced the old `Sidebar`/`Header`), `Subheader` (page title + date + optional system-health), `MetricCard` (design stat-card), `ChartCard` (design section-card), `PageState` (`NoApiState`/`ErrorState`/`ErrorBanner`). The UI follows the "Payments Dashboard" design language (card-in-card, 24px radii, circular icon buttons, pill nav) recoloured to the dark-green/lime brand; reusable classes live in `src/index.css` (`.card`, `.dc-panel`, `.icon-btn`, `.dc-control`, `.nav-pill*`).

**App-wide state** lives entirely in `App.tsx`: `currentPage` (`Page` type) and `period` (`Period` type). Changing `period` remounts the active page via `key={period}` to force a refetch. `Geography` ignores `period`.

## AI assistant (Ask Guava)

`src/components/ChatAssistant.tsx` is a floating chat panel that answers questions about the current dashboard numbers. It calls Claude (`claude-opus-4-8`, streaming) **directly from the browser** via `src/lib/claude.ts` (`@anthropic-ai/sdk`, `dangerouslyAllowBrowser: true`). Context is a compact JSON snapshot gathered once per session from the live `api` layer. Requires `VITE_CLAUDE_API_KEY`; the launcher hides itself when it's unset.

> ⚠️ **`VITE_CLAUDE_API_KEY` ships in the client bundle** (all `VITE_*` vars are public) — anyone loading the dashboard can read and spend against it. Acceptable only for an internal/trusted admin tool. For public exposure, proxy Claude calls through a backend and keep the key server-side.

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
