/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Guava app brand (dark teal-green + lime) ──────────────────────
        // Semantic surface / text tokens, matching the Flutter app.
        canvas: '#28443F', // page background   (app backgroundColor)
        surface: '#334E48', // cards / containers  (app containerColor)
        'surface-2': '#3B5A53', // elevated / hover
        border: '#3E5B54', // hairline borders on dark
        ink: '#FCFCFC', // primary text        (app textColor)
        muted: '#B0B7B1', // secondary text      (app washedTextColor)
        faint: '#8A968F', // tertiary / disabled text
        sidebar: '#1F332F', // sidebar surface (darker than bg)

        // Lime accent (app primaryColor #F2FD7D)
        lime: {
          DEFAULT: '#F2FD7D',
          soft: '#DCEC5F',
          ink: '#213631', // readable text/icons on a lime fill
        },
        brand: '#F2FD7D',

        // Status (tuned to read on dark green)
        positive: '#A8E6A0', // app lightGreen
        negative: '#F4A988', // app washedRed
        warning: '#F2D08A', // ~ app washedYellow, brightened
        info: '#79BACB', // ~ app washedBlue, brightened

        // Cream retained but pointed at dark surfaces so any stray usage
        // stays on-theme instead of turning a panel white.
        cream: {
          50: '#28443F',
          100: '#28443F',
          200: '#334E48',
        },

        // Green ramp anchored on the app palette (light mint → deep bg).
        // Kept as `guava-*` so existing utility usages stay on-brand.
        guava: {
          50: '#F1FFE2',
          100: '#E1F5CC',
          200: '#B1F5C5',
          300: '#A8E6A0',
          400: '#48DAB1',
          500: '#24B28A',
          600: '#1CC867',
          700: '#1E8F63',
          800: '#28443F',
          900: '#213631',
          950: '#182823',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.25)',
        'card-hover': '0 6px 20px 0 rgb(0 0 0 / 0.35)',
      },
    },
  },
  plugins: [],
}
