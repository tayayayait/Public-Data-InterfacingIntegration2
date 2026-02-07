# AI Report

AI-powered report generation and market data search app.

## Getting started

Requirements:
- Node.js 18+
- npm

Commands:
```sh
npm install
npm run dev
```

## Scripts

- `npm run dev`: start dev server
- `npm run build`: production build
- `npm run preview`: preview production build locally
- `npm run lint`: run ESLint
- `npm run test`: run Vitest

## Tech stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase

## Security notes

- Never commit real API keys. Use `.env` locally and keep `.env.example` as template.
- If secrets were exposed, rotate all keys immediately:
  - `NAVER_CLIENT_SECRET`
  - `GEMINI_API_KEY`
  - `GOV_DATA_KEY`
  - `VWORLD_KEY`
